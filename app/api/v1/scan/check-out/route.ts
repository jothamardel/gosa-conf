import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConventionRegistration } from '@/lib/schema/convention.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { Accommodation } from '@/lib/schema/accommodation.schema';
import { User } from '@/lib/schema/user.schema';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { ticketId, officialId, officialName } = await request.json();

    if (!ticketId || !officialId || !officialName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the ticket in different collections
    let ticket = null;
    let ticketType = '';
    let Model = null;

    // Check convention registrations
    const conventionTicket = await ConventionRegistration.findById(ticketId);
    if (conventionTicket) {
      ticket = conventionTicket;
      ticketType = 'convention';
      Model = ConventionRegistration;
    }

    // Check dinner reservations
    if (!ticket) {
      const dinnerTicket = await DinnerReservation.findById(ticketId);
      if (dinnerTicket) {
        ticket = dinnerTicket;
        ticketType = 'dinner';
        Model = DinnerReservation;
      }
    }

    // Check brochure orders
    if (!ticket) {
      const brochureTicket = await ConventionBrochure.findById(ticketId);
      if (brochureTicket) {
        ticket = brochureTicket;
        ticketType = 'brochure';
        Model = ConventionBrochure;
      }
    }

    // Check accommodation bookings
    if (!ticket) {
      const accommodationTicket = await Accommodation.findById(ticketId);
      if (accommodationTicket) {
        ticket = accommodationTicket;
        ticketType = 'accommodation';
        Model = Accommodation;
      }
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if user is checked in
    if (!ticket.checkedIn) {
      return NextResponse.json(
        { error: 'User is not currently checked in' },
        { status: 400 }
      );
    }

    // Create check-out history entry
    const checkOutEntry = {
      action: 'check-out',
      timestamp: new Date(),
      officialId,
      officialName,
    };

    // Update the ticket (temporary check-out - they can check back in)
    // @ts-ignore
    const updatedTicket = await Model.findByIdAndUpdate(
      ticketId,
      {
        $set: {
          checkedIn: false,
          checkedOutAt: new Date(),
        },
        $push: {
          checkInHistory: checkOutEntry,
        },
      },
      { new: true }
    );

    // Fetch user separately
    const user = await User.findById(updatedTicket.userId);

    // Format the response
    const ticketData = {
      _id: updatedTicket._id,
      type: ticketType,
      user: {
        fullName: user?.fullName || 'Unknown',
        email: user?.email || 'Unknown',
        phone: user?.phone || 'Unknown',
      },
      amount: updatedTicket.amount || updatedTicket.totalAmount || 0,
      paymentReference: updatedTicket.paymentReference,
      status: updatedTicket.status || (updatedTicket.confirmed ? 'confirmed' : 'confirmed'),
      checkedIn: updatedTicket.checkedIn,
      checkedInAt: updatedTicket.checkedInAt,
      checkedOutAt: updatedTicket.checkedOutAt,
      collected: updatedTicket.collected || false,
      collectedAt: updatedTicket.collectedAt || null,
      checkInHistory: updatedTicket.checkInHistory || [],
      createdAt: updatedTicket.createdAt,
    };

    return NextResponse.json({
      success: true,
      message: 'User checked out successfully',
      ticket: ticketData,
    });

  } catch (error) {
    console.error('Error checking out user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}