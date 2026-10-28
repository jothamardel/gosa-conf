import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Transaction,
  User,
} from '@/lib/schema';
import { CONVENTION_PRICING } from '@/lib/constants/pricing';
import { getOrCreateUserCheckInCode } from '@/lib/utils/checkin-code';
import { sendAsyncCheckInNotification } from '@/lib/services/checkin-notification.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      fullName,
      phoneNumber,
      email,
      house,
      year,
      conventionQty = 0,
      dinnerQty = 0,
      brochureQty = 0,
      brochureType = 'physical',
      paymentMethod = 'cash',
      checkInImmediately = true,
      officialName = 'Desk Admin',
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, error: 'Member full name is required' }, { status: 400 });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ success: false, error: 'Member phone number is required' }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    const cleanDigits = trimmedPhone.replace(/\D/g, '');

    const safeEmail = email && email.trim()
      ? email.trim().toLowerCase()
      : `${cleanDigits || Date.now()}@walkin.gosa.org`;

    const convCount = Math.max(0, parseInt(conventionQty, 10) || 0);
    const dinCount = Math.max(0, parseInt(dinnerQty, 10) || 0);
    const brochCount = Math.max(0, parseInt(brochureQty, 10) || 0);

    if (convCount === 0 && dinCount === 0 && brochCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one ticket item (Convention, Dinner, or Brochure)' },
        { status: 400 }
      );
    }

    const convUnit = CONVENTION_PRICING.convention || 1000;
    const dinUnit = CONVENTION_PRICING.dinner || 2500;
    const brochUnit = CONVENTION_PRICING.brochure || 2000;

    const convAmount = convCount * convUnit;
    const dinAmount = dinCount * dinUnit;
    const brochAmount = brochCount * brochUnit;
    const totalAmount = convAmount + dinAmount + brochAmount;

    // Find or create User
    let user = await User.findOne({
      $or: [
        { phoneNumber: trimmedPhone },
        ...(cleanDigits ? [{ phoneNumber: cleanDigits }] : []),
      ]
    });

    if (!user) {
      user = new User({
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        email: safeEmail,
        house: house || undefined,
        year: year || undefined,
      });
      await user.save();
    } else {
      // Update any missing profile fields
      let hasUpdates = false;
      if (house && !user.house) { user.house = house; hasUpdates = true; }
      if (year && !user.year) { user.year = year; hasUpdates = true; }
      if (hasUpdates) await user.save();
    }

    const now = new Date();
    const baseRef = `WALKIN_${Date.now()}_${cleanDigits.slice(-4) || 'GOSA'}`;
    let checkInCode: string | null = null;

    if (checkInImmediately) {
      checkInCode = await getOrCreateUserCheckInCode(user._id);
    }

    const historyEntry = checkInImmediately && checkInCode ? [{
      action: 'check-in' as const,
      timestamp: now,
      officialId: 'walk-in-desk',
      officialName,
      checkInCode,
    }] : [];

    const ticketsCreated: any = {};
    const itemsSummary: string[] = [];

    // 1. Convention Ticket
    if (convCount > 0) {
      const convRef = `${baseRef}_CONV`;
      const convTicket = new ConventionRegistration({
        userId: user._id,
        paymentReference: convRef,
        amount: convAmount,
        quantity: convCount,
        confirm: true,
        status: 'confirmed',
        checkedIn: Boolean(checkInImmediately),
        checkedInAt: checkInImmediately ? now : undefined,
        checkInCode: checkInCode || undefined,
        checkInHistory: historyEntry,
      });
      await convTicket.save();
      ticketsCreated.convention = convTicket;
      itemsSummary.push(`Convention Pass (${convCount})`);
    }

    // 2. Dinner Ticket
    if (dinCount > 0) {
      const dinRef = `${baseRef}_DINNER`;
      const guestDetails = Array.from({ length: dinCount }, (_, idx) => ({
        name: idx === 0 ? trimmedName : `Guest ${idx + 1} (${trimmedName})`,
        email: safeEmail,
        phone: trimmedPhone,
      }));

      const dinTicket = new DinnerReservation({
        userId: user._id,
        paymentReference: dinRef,
        numberOfGuests: dinCount,
        guestDetails,
        totalAmount: dinAmount,
        confirmed: true,
        status: 'confirmed',
        checkedIn: Boolean(checkInImmediately),
        checkedInAt: checkInImmediately ? now : undefined,
        checkInCode: checkInCode || undefined,
        checkInHistory: historyEntry,
      });
      await dinTicket.save();
      ticketsCreated.dinner = dinTicket;
      itemsSummary.push(`Dinner Ticket (${dinCount})`);
    }

    // 3. Brochure
    if (brochCount > 0) {
      const brochRef = `${baseRef}_BROCHURE`;
      const brochTicket = new ConventionBrochure({
        userId: user._id,
        paymentReference: brochRef,
        quantity: brochCount,
        brochureType,
        recipientDetails: [{
          name: trimmedName,
          email: safeEmail,
          phone: trimmedPhone,
        }],
        totalAmount: brochAmount,
        confirmed: true,
        status: 'confirmed',
        collected: Boolean(checkInImmediately),
        checkedIn: Boolean(checkInImmediately),
        checkedInAt: checkInImmediately ? now : undefined,
        collectedAt: checkInImmediately ? now : undefined,
        checkInCode: checkInCode || undefined,
        qrCode: `QR_${brochRef}`,
        checkInHistory: historyEntry,
      });
      await brochTicket.save();
      ticketsCreated.brochure = brochTicket;
      itemsSummary.push(`Brochure (${brochCount})`);
    }

    // 4. Record Transaction
    const transactionType = itemsSummary.length > 1 ? 'cart' : (convCount > 0 ? 'ticket_convention' : dinCount > 0 ? 'ticket_dinner' : 'product_brochure');
    const transaction = new Transaction({
      userId: user._id,
      paymentReference: baseRef,
      amount: totalAmount,
      type: transactionType,
      status: 'completed',
      source: 'walk-in',
      metadata: {
        paymentMethod,
        officialName,
        itemsSummary,
        checkInImmediately,
        checkInCode,
      }
    });
    await transaction.save();

    // Async WhatsApp Notification
    if (checkInImmediately && checkInCode) {
      sendAsyncCheckInNotification({
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        checkInCode,
        ticketTypes: itemsSummary,
      }).catch(err => console.error('Async WhatsApp Error on walk-in:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${trimmedName} and marked paid (₦${totalAmount.toLocaleString()}) via ${paymentMethod.toUpperCase()}`,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          checkInCode,
        },
        paymentReference: baseRef,
        totalAmount,
        paymentMethod,
        checkInCode,
        checkedIn: Boolean(checkInImmediately),
        itemsSummary,
      }
    });

  } catch (error: any) {
    console.error('Error registering walk-in member:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Walk-in registration failed' },
      { status: 500 }
    );
  }
}
