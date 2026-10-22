import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Accommodation,
  User
} from '@/lib/schema';

function extractBaseReference(ref: string): string {
  if (!ref) return 'unknown';
  const parts = ref.split('_');
  if (parts.length >= 3) {
    return parts.slice(0, 3).join('_');
  }
  return parts[0];
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference parameter is required' },
        { status: 400 }
      );
    }

    // Extract base reference for searching
    const searchPattern = reference.includes('_')
      ? extractBaseReference(reference)
      : reference.trim();

    console.log(`Searching for tickets with reference pattern: ${searchPattern}`);

    const ticketGroups: { [key: string]: any } = {};

    // Search in all collections for matching payment references
    const searchRegex = new RegExp(`^${searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

    // Search Convention Registrations
    const conventionTickets = await ConventionRegistration.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of conventionTickets) {
      const baseReference = extractBaseReference(ticket.paymentReference);

      if (!ticketGroups[baseReference]) {
        ticketGroups[baseReference] = {
          baseReference,
          type: 'convention',
          totalTickets: 0,
          totalAmount: 0,
          mainTicket: null,
          secondaryTickets: [],
          status: ticket.status || (ticket.confirm ? 'confirmed' : 'pending'),
          createdAt: ticket.createdAt
        };
      } else if (ticketGroups[baseReference].type !== 'convention') {
        ticketGroups[baseReference].type = 'cart';
      }

      const ticketData = {
        _id: ticket._id,
        type: 'convention',
        paymentReference: ticket.paymentReference,
        amount: ticket.amount || 0,
        quantity: ticket.quantity,
        status: ticket.status || (ticket.confirm ? 'confirmed' : 'pending'),
        checkedIn: ticket.checkedIn || false,
        checkedInAt: ticket.checkedInAt,
        checkedOutAt: ticket.checkedOutAt,
        collected: ticket.collected || false,
        collectedAt: ticket.collectedAt,
        user: {
          fullName: ticket.userId?.fullName || 'Unknown',
          email: ticket.userId?.email || 'Unknown',
          phone: ticket.userId?.phoneNumber || 'Unknown',
        },
        createdAt: ticket.createdAt,
        checkInHistory: ticket.checkInHistory || [],
        persons: ticket.persons || []
      };

      // Determine if this is the main ticket (usually has quantity > 1 or contains main phone number)
      const isMainTicket = ticket.quantity > 1 ||
        ticket.paymentReference.includes(ticket.userId?.phoneNumber || '');

      if (isMainTicket || !ticketGroups[baseReference].mainTicket) {
        ticketGroups[baseReference].mainTicket = ticketData;
      } else {
        ticketGroups[baseReference].secondaryTickets.push(ticketData);
      }

      ticketGroups[baseReference].totalTickets += 1;
      ticketGroups[baseReference].totalAmount += (ticket.amount || 0);
    }

    // Search Dinner Reservations
    const dinnerTickets = await DinnerReservation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of dinnerTickets) {
      const baseReference = extractBaseReference(ticket.paymentReference);

      if (!ticketGroups[baseReference]) {
        ticketGroups[baseReference] = {
          baseReference,
          type: 'dinner',
          totalTickets: 0,
          totalAmount: 0,
          mainTicket: null,
          secondaryTickets: [],
          status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
          createdAt: ticket.createdAt
        };
      } else if (ticketGroups[baseReference].type !== 'dinner') {
        ticketGroups[baseReference].type = 'cart';
      }

      const ticketAmount = ticket.totalAmount || ticket.amount || 0;
      const ticketData = {
        _id: ticket._id,
        type: 'dinner',
        paymentReference: ticket.paymentReference,
        amount: ticketAmount,
        status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
        checkedIn: ticket.checkedIn || false,
        checkedInAt: ticket.checkedInAt,
        checkedOutAt: ticket.checkedOutAt,
        collected: ticket.collected || false,
        collectedAt: ticket.collectedAt,
        user: {
          fullName: ticket.userId?.fullName || 'Unknown',
          email: ticket.userId?.email || 'Unknown',
          phone: ticket.userId?.phoneNumber || 'Unknown',
        },
        createdAt: ticket.createdAt,
        checkInHistory: ticket.checkInHistory || [],
        guestDetails: ticket.guestDetails || []
      };

      if (!ticketGroups[baseReference].mainTicket) {
        ticketGroups[baseReference].mainTicket = ticketData;
      } else {
        ticketGroups[baseReference].secondaryTickets.push(ticketData);
      }

      ticketGroups[baseReference].totalTickets += 1;
      ticketGroups[baseReference].totalAmount += ticketAmount;
    }

    // Search Brochure Orders
    const brochureTickets = await ConventionBrochure.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of brochureTickets) {
      const baseReference = extractBaseReference(ticket.paymentReference);

      if (!ticketGroups[baseReference]) {
        ticketGroups[baseReference] = {
          baseReference,
          type: 'brochure',
          totalTickets: 0,
          totalAmount: 0,
          mainTicket: null,
          secondaryTickets: [],
          status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
          createdAt: ticket.createdAt
        };
      } else if (ticketGroups[baseReference].type !== 'brochure') {
        ticketGroups[baseReference].type = 'cart';
      }

      const ticketAmount = ticket.totalAmount || ticket.amount || 0;
      const ticketData = {
        _id: ticket._id,
        type: 'brochure',
        paymentReference: ticket.paymentReference,
        amount: ticketAmount,
        status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
        checkedIn: ticket.checkedIn || false,
        checkedInAt: ticket.checkedInAt,
        checkedOutAt: ticket.checkedOutAt,
        collected: ticket.collected || false,
        collectedAt: ticket.collectedAt,
        user: {
          fullName: ticket.userId?.fullName || 'Unknown',
          email: ticket.userId?.email || 'Unknown',
          phone: ticket.userId?.phoneNumber || 'Unknown',
        },
        createdAt: ticket.createdAt,
        checkInHistory: ticket.checkInHistory || []
      };

      if (!ticketGroups[baseReference].mainTicket) {
        ticketGroups[baseReference].mainTicket = ticketData;
      } else {
        ticketGroups[baseReference].secondaryTickets.push(ticketData);
      }

      ticketGroups[baseReference].totalTickets += 1;
      ticketGroups[baseReference].totalAmount += ticketAmount;
    }

    // Search Accommodation Bookings
    const accommodationTickets = await Accommodation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of accommodationTickets) {
      const baseReference = extractBaseReference(ticket.paymentReference);

      if (!ticketGroups[baseReference]) {
        ticketGroups[baseReference] = {
          baseReference,
          type: 'accommodation',
          totalTickets: 0,
          totalAmount: 0,
          mainTicket: null,
          secondaryTickets: [],
          status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
          createdAt: ticket.createdAt
        };
      } else if (ticketGroups[baseReference].type !== 'accommodation') {
        ticketGroups[baseReference].type = 'cart';
      }

      const ticketAmount = ticket.totalAmount || ticket.amount || 0;
      const ticketData = {
        _id: ticket._id,
        type: 'accommodation',
        paymentReference: ticket.paymentReference,
        amount: ticketAmount,
        status: ticket.status || (ticket.confirmed ? 'confirmed' : 'pending'),
        checkedIn: ticket.checkedIn || false,
        checkedInAt: ticket.checkedInAt,
        checkedOutAt: ticket.checkedOutAt,
        collected: ticket.collected || false,
        collectedAt: ticket.collectedAt,
        user: {
          fullName: ticket.userId?.fullName || 'Unknown',
          email: ticket.userId?.email || 'Unknown',
          phone: ticket.userId?.phoneNumber || 'Unknown',
        },
        createdAt: ticket.createdAt,
        checkInHistory: ticket.checkInHistory || []
      };

      if (!ticketGroups[baseReference].mainTicket) {
        ticketGroups[baseReference].mainTicket = ticketData;
      } else {
        ticketGroups[baseReference].secondaryTickets.push(ticketData);
      }

      ticketGroups[baseReference].totalTickets += 1;
      ticketGroups[baseReference].totalAmount += ticketAmount;
    }

    // Convert to array and sort by creation date (newest first)
    const ticketGroupsArray = Object.values(ticketGroups).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      ticketGroups: ticketGroupsArray,
      searchPattern,
      totalGroups: ticketGroupsArray.length,
      totalTickets: ticketGroupsArray.reduce((sum: number, group: any) => sum + group.totalTickets, 0)
    });

  } catch (error) {
    console.error('Error searching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}