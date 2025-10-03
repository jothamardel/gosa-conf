import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConventionRegistration } from '@/lib/schema/convention.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { Accommodation } from '@/lib/schema/accommodation.schema';
import { User } from '@/lib/schema/user.schema';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const email = searchParams.get('email');

    if (!reference && !email) {
      return NextResponse.json(
        { error: 'Either reference or email parameter is required' },
        { status: 400 }
      );
    }

    let ticket = null;
    let ticketType = '';
    let user = null;

    if (reference) {
      // Search by payment reference
      const conventionTicket = await ConventionRegistration.findOne({ paymentReference: reference });
      if (conventionTicket) {
        ticket = conventionTicket;
        ticketType = 'convention';
        user = await User.findById(conventionTicket.userId);
      }

      if (!ticket) {
        const dinnerTicket = await DinnerReservation.findOne({ paymentReference: reference });
        if (dinnerTicket) {
          ticket = dinnerTicket;
          ticketType = 'dinner';
          user = await User.findById(dinnerTicket.userId);
        }
      }

      if (!ticket) {
        const brochureTicket = await ConventionBrochure.findOne({ paymentReference: reference });
        if (brochureTicket) {
          ticket = brochureTicket;
          ticketType = 'brochure';
          user = await User.findById(brochureTicket.userId);
        }
      }

      if (!ticket) {
        const accommodationTicket = await Accommodation.findOne({ paymentReference: reference });
        if (accommodationTicket) {
          ticket = accommodationTicket;
          ticketType = 'accommodation';
          user = await User.findById(accommodationTicket.userId);
        }
      }
    } else if (email) {
      // Search by user email
      const foundUser = await User.findOne({ email: email.toLowerCase() });
      if (!foundUser) {
        return NextResponse.json(
          { error: 'No user found with this email address' },
          { status: 404 }
        );
      }

      // Find the most recent ticket for this user
      const [conventionTicket, dinnerTicket, brochureTicket, accommodationTicket] = await Promise.all([
        ConventionRegistration.findOne({ userId: foundUser._id }).sort({ createdAt: -1 }),
        DinnerReservation.findOne({ userId: foundUser._id }).sort({ createdAt: -1 }),
        ConventionBrochure.findOne({ userId: foundUser._id }).sort({ createdAt: -1 }),
        Accommodation.findOne({ userId: foundUser._id }).sort({ createdAt: -1 }),
      ]);

      // Find the most recent ticket
      const tickets = [
        { ticket: conventionTicket, type: 'convention' },
        { ticket: dinnerTicket, type: 'dinner' },
        { ticket: brochureTicket, type: 'brochure' },
        { ticket: accommodationTicket, type: 'accommodation' },
      ].filter(t => t.ticket !== null);

      if (tickets.length === 0) {
        return NextResponse.json(
          { error: 'No tickets found for this user' },
          { status: 404 }
        );
      }

      // Get the most recent ticket
      const mostRecent = tickets.reduce((latest, current) => {
        if (!latest.ticket || current.ticket.createdAt > latest.ticket.createdAt) {
          return current;
        }
        return latest;
      });

      ticket = mostRecent.ticket;
      ticketType = mostRecent.type;
      user = foundUser;
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Format the response
    const ticketData = {
      _id: ticket._id,
      type: ticketType,
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      amount: ticket.amount || ticket.totalAmount || 0,
      paymentReference: ticket.paymentReference,
      status: ticket.status || (ticket.confirmed ? 'confirmed' : 'confirmed'),
      checkedIn: ticket.checkedIn || false,
      checkedInAt: ticket.checkedInAt,
      checkedOutAt: ticket.checkedOutAt,
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
    console.error('Error searching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}