import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  Transaction,
  User,
} from '@/lib/schema';
import { CONVENTION_PRICING } from '@/lib/constants/pricing';
import { getOrCreateUserCheckInCode } from '@/lib/utils/checkin-code';
import { getCheckInActiveStatus } from '@/lib/utils/checkin-settings';
import { Wasender } from '@/lib/wasender-api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      ticketId,
      sourceTicketType = 'convention',
      targetTicketType = 'dinner',
      paymentMethod = 'cash',
      paymentReference,
      notes,
      checkInImmediately = false,
      officialName = 'Desk Admin',
      officialId = 'desk-admin',
    } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ticketId is required for upgrade' },
        { status: 400 }
      );
    }

    if (sourceTicketType !== 'convention' || targetTicketType !== 'dinner') {
      return NextResponse.json(
        { success: false, error: 'Currently only Convention -> Dinner ticket upgrades are supported' },
        { status: 400 }
      );
    }

    // 1. Fetch original Convention Ticket
    const ticket = await ConventionRegistration.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Original convention ticket not found' },
        { status: 404 }
      );
    }

    if (ticket.status === 'upgraded') {
      return NextResponse.json(
        { success: false, error: 'This ticket has already been upgraded to a Dinner Ticket' },
        { status: 400 }
      );
    }

    if (ticket.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot upgrade a cancelled ticket' },
        { status: 400 }
      );
    }

    // 2. Fetch Attendee
    const user = await User.findById(ticket.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Associated attendee record not found' },
        { status: 404 }
      );
    }

    // 3. Pricing calculations
    const convUnit = CONVENTION_PRICING.convention || 1000;
    const dinUnit = CONVENTION_PRICING.dinner || 2500;
    const quantity = ticket.quantity || 1;
    const differencePerUnit = Math.max(0, dinUnit - convUnit);
    const totalDifference = paymentMethod === 'waived' ? 0 : differencePerUnit * quantity;
    const totalDinnerAmount = dinUnit * quantity;

    const cleanDigits = (user.phoneNumber || '').replace(/\D/g, '').slice(-4) || 'GOSA';
    const now = new Date();
    const dinRef = `UPG_${Date.now()}_${cleanDigits}_DINNER`;

    // 4. Check-In handling
    const isCheckInActive = await getCheckInActiveStatus();
    const shouldCheckIn = Boolean(checkInImmediately && isCheckInActive);
    let checkInCode = user.checkInCode || ticket.checkInCode || null;

    if (shouldCheckIn && !checkInCode) {
      checkInCode = await getOrCreateUserCheckInCode(user._id);
    }

    const historyEntry = shouldCheckIn && checkInCode ? [{
      action: 'check-in' as const,
      timestamp: now,
      officialId,
      officialName,
      checkInCode,
    }] : [];

    // 5. Construct guest details for dinner
    const guestDetails = Array.from({ length: quantity }, (_, idx) => ({
      name: idx === 0 ? user.fullName : `Guest ${idx + 1} (${user.fullName})`,
      email: user.email || `${cleanDigits || Date.now()}@upgrade.gosa.org`,
      phone: user.phoneNumber || '0000000000',
    }));

    // 6. Create DinnerReservation
    const dinnerTicket = new DinnerReservation({
      userId: user._id,
      paymentReference: dinRef,
      numberOfGuests: quantity,
      guestDetails,
      totalAmount: totalDinnerAmount,
      confirmed: true,
      status: 'confirmed',
      checkedIn: shouldCheckIn,
      checkedInAt: shouldCheckIn ? now : undefined,
      checkInCode: checkInCode || undefined,
      checkInHistory: historyEntry,
      specialRequests: `Upgraded from Convention Pass (${ticket.paymentReference}). Payment Method: ${paymentMethod.toUpperCase()}${notes ? `. Notes: ${notes}` : ''}`,
      upgradedFrom: {
        ticketType: 'convention',
        ticketId: ticket._id,
        originalReference: ticket.paymentReference,
        upgradedAt: now,
        officialName,
        differencePaid: totalDifference,
        paymentMethod,
        notes: notes || undefined,
      },
    });
    await dinnerTicket.save();

    // 7. Update original Convention Registration
    ticket.status = 'upgraded';
    ticket.upgradedTo = {
      ticketType: 'dinner',
      ticketId: dinnerTicket._id,
      upgradedAt: now,
      officialName,
      differencePaid: totalDifference,
      paymentMethod,
      notes: notes || undefined,
    };
    await ticket.save();

    // 8. Log Upgrade Transaction
    const txRef = paymentReference || `TX_UPG_${Date.now()}_${cleanDigits}`;
    const transaction = new Transaction({
      userId: user._id,
      paymentReference: txRef,
      amount: totalDifference,
      type: 'ticket_dinner',
      status: 'completed',
      source: `admin_upgrade_${paymentMethod}`,
      metadata: {
        isUpgrade: true,
        upgradedFrom: 'ticket_convention',
        originalReference: ticket.paymentReference,
        newReference: dinRef,
        differencePaid: totalDifference,
        paymentMethod,
        officialName,
        notes: notes || null,
      },
    });
    await transaction.save();

    // 9. Asynchronous WhatsApp confirmation (fire & forget)
    if (user.phoneNumber) {
      (async () => {
        try {
          let clean = user.phoneNumber.replace(/\D/g, '');
          if (clean.startsWith('0') && clean.length === 11) {
            clean = '234' + clean.slice(1);
          } else if (clean.length === 10 && /^[789]/.test(clean)) {
            clean = '234' + clean;
          }

          if (clean.startsWith('234')) {
            const formattedTo = `+${clean}`;
            const message = `🎉 *Ticket Upgrade Confirmed — GOSA 2026 Convention*

Hello *${user.fullName}*,

Your ticket has been officially upgraded to a *GOSA Dinner Ticket*:
🍽️ *Ticket:* Dinner Reservation (${quantity} guest${quantity > 1 ? 's' : ''})
🎫 *New Reference:* ${dinRef}
💰 *Difference Paid:* ₦${totalDifference.toLocaleString()} (${paymentMethod.toUpperCase()})
${checkInCode ? `🏷️ *Pass Code:* *${checkInCode}*` : ''}

See you at the Grand Convention Dinner!
— GOSA 2026 Organizing Committee`;

            await Wasender.httpSenderMessage({
              to: formattedTo,
              text: message,
            });
          }
        } catch (err: any) {
          console.warn('[Ticket Upgrade] WhatsApp notification error:', err?.message || err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded Convention Pass to Dinner Ticket (${quantity} guest${quantity > 1 ? 's' : ''})`,
      differencePaid: totalDifference,
      dinnerTicket: {
        _id: dinnerTicket._id.toString(),
        paymentReference: dinRef,
        quantity,
        totalAmount: totalDinnerAmount,
        checkedIn: shouldCheckIn,
        checkInCode,
      },
      conventionTicket: {
        _id: ticket._id.toString(),
        status: 'upgraded',
      },
    });

  } catch (error: any) {
    console.error('Error upgrading ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ticket upgrade failed' },
      { status: 500 }
    );
  }
}
