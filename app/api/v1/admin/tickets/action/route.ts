import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  User,
} from '@/lib/schema';
import { getOrCreateUserCheckInCode } from '@/lib/utils/checkin-code';
import { sendAsyncCheckInNotification } from '@/lib/services/checkin-notification.service';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';
import { getCheckInActiveStatus } from '@/lib/utils/checkin-settings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { action, ticketId, ticketType, userId, officialName = 'Desk Admin' } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    // Gate: Check-in activation verification
    if (action === 'check-in-all' || action === 'check-in-single') {
      const isCheckInActive = await getCheckInActiveStatus();
      if (!isCheckInActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'Check-ins are currently deactivated. Please activate check-ins from the top bar before checking in attendees.',
            checkinActive: false,
          },
          { status: 403 }
        );
      }
    }

    // --- Action: Generate or retrieve check-in code ---
    if (action === 'generate-code') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required for generate-code' }, { status: 400 });
      }
      const checkInCode = await getOrCreateUserCheckInCode(userId);
      return NextResponse.json({
        success: true,
        checkInCode,
        message: 'Check-in code ready',
      });
    }

    // --- Action: Check In All Tickets for a Member (Scoped to 2026) ---
    if (action === 'check-in-all') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required for check-in-all' }, { status: 400 });
      }

      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const checkInCode = await getOrCreateUserCheckInCode(userId);
      const now = new Date();

      const historyEntry = {
        action: 'check-in' as const,
        timestamp: now,
        officialId: 'desk-admin',
        officialName,
        checkInCode,
      };

      const dateFilter2026 = { createdAt: { $gte: CONVENTION_2026_START_DATE } };

      const [convRes, dinRes, brochRes] = await Promise.all([
        ConventionRegistration.updateMany(
          { userId, checkedIn: { $ne: true }, ...dateFilter2026 },
          {
            $set: {
              checkedIn: true,
              checkedInAt: now,
              checkInCode,
              status: 'confirmed',
              confirm: true,
            },
            $push: { checkInHistory: historyEntry }
          }
        ),
        DinnerReservation.updateMany(
          { userId, checkedIn: { $ne: true }, ...dateFilter2026 },
          {
            $set: {
              checkedIn: true,
              checkedInAt: now,
              checkInCode,
              status: 'confirmed',
              confirmed: true,
            },
            $push: { checkInHistory: historyEntry }
          }
        ),
        ConventionBrochure.updateMany(
          { userId, collected: { $ne: true }, ...dateFilter2026 },
          {
            $set: {
              collected: true,
              collectedAt: now,
              checkedIn: true,
              checkedInAt: now,
              checkInCode,
              status: 'confirmed',
              confirmed: true,
            },
            $push: { checkInHistory: historyEntry }
          }
        ),
      ]);

      const itemsCheckedIn: string[] = [];
      if (convRes.modifiedCount > 0) itemsCheckedIn.push(`Convention (${convRes.modifiedCount})`);
      if (dinRes.modifiedCount > 0) itemsCheckedIn.push(`Dinner (${dinRes.modifiedCount})`);
      if (brochRes.modifiedCount > 0) itemsCheckedIn.push(`Brochure (${brochRes.modifiedCount})`);

      // Asynchronous non-blocking WhatsApp delivery
      sendAsyncCheckInNotification({
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        checkInCode,
        ticketTypes: itemsCheckedIn.length > 0 ? itemsCheckedIn : ['All Convention Passes'],
      }).catch(err => console.error('Async WhatsApp Error:', err));

      return NextResponse.json({
        success: true,
        checkInCode,
        message: `Successfully checked in all tickets for ${user.fullName}`,
        details: {
          conventionsUpdated: convRes.modifiedCount,
          dinnersUpdated: dinRes.modifiedCount,
          brochuresUpdated: brochRes.modifiedCount,
        }
      });
    }

    // --- Single Ticket Actions ---
    if (!ticketId || !ticketType) {
      return NextResponse.json(
        { success: false, error: 'ticketId and ticketType are required' },
        { status: 400 }
      );
    }

    let Model: any;
    if (ticketType === 'dinner') {
      Model = DinnerReservation;
    } else if (ticketType === 'brochure') {
      Model = ConventionBrochure;
    } else {
      Model = ConventionRegistration;
    }

    const ticket = await Model.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const user = await User.findById(ticket.userId);
    const now = new Date();

    // 1. Check-In Single
    if (action === 'check-in-single') {
      const checkInCode = await getOrCreateUserCheckInCode(ticket.userId);

      const historyEntry = {
        action: 'check-in' as const,
        timestamp: now,
        officialId: 'desk-admin',
        officialName,
        checkInCode,
      };

      ticket.checkedIn = true;
      ticket.checkedInAt = now;
      ticket.checkedOutAt = undefined;
      ticket.checkInCode = checkInCode;
      ticket.status = 'confirmed';
      if ('confirm' in ticket) ticket.confirm = true;
      if ('confirmed' in ticket) ticket.confirmed = true;
      if (ticketType === 'brochure') {
        ticket.collected = true;
        ticket.collectedAt = now;
      }

      if (!ticket.checkInHistory) ticket.checkInHistory = [];
      ticket.checkInHistory.push(historyEntry);

      await ticket.save();

      // Async WhatsApp notification
      if (user) {
        sendAsyncCheckInNotification({
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          checkInCode,
          ticketTypes: [ticketType === 'convention' ? 'Convention Pass' : ticketType === 'dinner' ? 'Dinner Ticket' : 'Convention Brochure'],
        }).catch(err => console.error('Async WhatsApp Error:', err));
      }

      return NextResponse.json({
        success: true,
        checkInCode,
        message: 'Checked in successfully',
        ticket: {
          _id: ticket._id.toString(),
          checkedIn: true,
          checkedInAt: now,
          checkInCode,
        }
      });
    }

    // 2. Check-Out Single (Undo)
    if (action === 'check-out-single') {
      const historyEntry = {
        action: 'check-out' as const,
        timestamp: now,
        officialId: 'desk-admin',
        officialName,
        checkInCode: ticket.checkInCode,
      };

      ticket.checkedIn = false;
      ticket.checkedOutAt = now;
      if (ticketType === 'brochure') {
        ticket.collected = false;
        ticket.collectedAt = undefined;
      }

      if (!ticket.checkInHistory) ticket.checkInHistory = [];
      ticket.checkInHistory.push(historyEntry);

      await ticket.save();

      return NextResponse.json({
        success: true,
        message: 'Check-in reverted (checked out)',
        ticket: {
          _id: ticket._id.toString(),
          checkedIn: false,
          checkedOutAt: now,
        }
      });
    }

    // 3. Collect Brochure
    if (action === 'collect-brochure') {
      const checkInCode = await getOrCreateUserCheckInCode(ticket.userId);

      ticket.collected = true;
      ticket.collectedAt = now;
      ticket.checkedIn = true;
      ticket.checkedInAt = now;
      ticket.checkInCode = checkInCode;

      await ticket.save();

      return NextResponse.json({
        success: true,
        checkInCode,
        message: 'Brochure marked as collected',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error handling ticket action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}
