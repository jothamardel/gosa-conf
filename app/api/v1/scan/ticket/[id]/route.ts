import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConventionRegistration } from '@/lib/schema/convention.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { Accommodation } from '@/lib/schema/accommodation.schema';
import { User } from '@/lib/schema/user.schema';
import { Types } from 'mongoose';

// Ensure all models are registered
User;
ConventionRegistration;
DinnerReservation;
ConventionBrochure;
Accommodation;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const ticketId = params.id;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID format' },
        { status: 400 }
      );
    }

    console.log('Searching for ticket ID:', ticketId);

    // Try to find the ticket in different collections
    let ticket = null;
    let ticketType = '';
    let user = null;

    // Check convention registrations
    try {
      console.log('Checking convention registrations...');
      const conventionTicket = await ConventionRegistration.findById(ticketId);
      if (conventionTicket) {
        ticket = conventionTicket;
        ticketType = 'convention';
        // Fetch user separately
        user = await User.findById(conventionTicket.userId);
        console.log('Found convention ticket', user);
      }
    } catch (error) {
      console.error('Error checking convention registrations:', error);
    }

    // Check dinner reservations
    if (!ticket) {
      try {
        console.log('Checking dinner reservations...');
        const dinnerTicket = await DinnerReservation.findById(ticketId);
        if (dinnerTicket) {
          ticket = dinnerTicket;
          ticketType = 'dinner';
          // Fetch user separately
          user = await User.findById(dinnerTicket.userId);
          console.log('Found dinner ticket');
        }
      } catch (error) {
        console.error('Error checking dinner reservations:', error);
      }
    }

    // Check brochure orders
    if (!ticket) {
      try {
        console.log('Checking brochure orders...');
        const brochureTicket = await ConventionBrochure.findById(ticketId);
        if (brochureTicket) {
          ticket = brochureTicket;
          ticketType = 'brochure';
          // Fetch user separately
          user = await User.findById(brochureTicket.userId);
          console.log('Found brochure ticket', user);
        }
      } catch (error) {
        console.error('Error checking brochure orders:', error);
      }
    }

    // Check accommodation bookings
    if (!ticket) {
      try {
        console.log('Checking accommodation bookings...');
        const accommodationTicket = await Accommodation.findById(ticketId);
        if (accommodationTicket) {
          ticket = accommodationTicket;
          ticketType = 'accommodation';
          // Fetch user separately
          user = await User.findById(accommodationTicket.userId);
          console.log('Found accommodation ticket');
        }
      } catch (error) {
        console.error('Error checking accommodation bookings:', error);
      }
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Format the response with safe field access
    const ticketData = {
      _id: ticket._id,
      type: ticketType,
      user: {
        fullName: user?.fullName || 'Unknown',
        email: user?.email || 'Unknown',
        phone: user?.phoneNumber || 'Unknown',
        house: user?.house || "Unknown",
        year: user?.year || "Unknown"
      },
      amount: ticket.amount || ticket.totalAmount || 0,
      paymentReference: ticket.paymentReference || 'Unknown',
      status: ticket.status || (ticket.confirmed ? 'confirmed' : ticket.confirm ? 'confirmed' : 'confirmed'), // Default to confirmed for paid tickets
      checkedIn: ticket.checkedIn || ticket.checkIn || false,
      checkedInAt: ticket.checkedInAt || null,
      checkedOutAt: ticket.checkedOutAt || null,
      collected: ticket.collected || false,
      collectedAt: ticket.collectedAt || null,
      checkInHistory: ticket.checkInHistory || [],
      createdAt: ticket.createdAt,
    };

    return NextResponse.json({
      success: true,
      ticket: ticketData,
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}