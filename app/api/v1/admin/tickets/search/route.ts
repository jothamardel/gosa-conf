import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Accommodation,
  User
} from '@/lib/schema';

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

    // Extract the part before underscore for searching
    const searchPattern = reference.split('_')[0];

    console.log(`Searching for tickets with reference pattern: ${searchPattern}`);

    const ticketGroups: { [key: string]: any } = {};

    // Search in all collections for matching payment references
    const searchRegex = new RegExp(`^${searchPattern}`, 'i');

    // Search Convention Registrations
    const conventionTickets = await ConventionRegistration.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of conventionTickets) {
      const baseReference = ticket.paymentReference.split('_')[0];

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
      }

      const ticketData = {
        _id: ticket._id,
        type: 'convention',
        paymentReference: ticket.paymentReference,
        amount: ticket.amount,
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
      ticketGroups[baseReference].totalAmount += ticket.amount;
    }

    // Search Dinner Reservations
    const dinnerTickets = await DinnerReservation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of dinnerTickets) {
      const baseReference = ticket.paymentReference.split('_')[0];

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
      }

      const ticketData = {
        _id: ticket._id,
        type: 'dinner',
        paymentReference: ticket.paymentReference,
        amount: ticket.totalAmount,
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
      ticketGroups[baseReference].totalAmount += ticket.totalAmount;
    }

    // Search Brochure Orders
    const brochureTickets = await ConventionBrochure.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of brochureTickets) {
      const baseReference = ticket.paymentReference.split('_')[0];

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
      }

      const ticketData = {
        _id: ticket._id,
        type: 'brochure',
        paymentReference: ticket.paymentReference,
        amount: ticket.totalAmount,
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
      ticketGroups[baseReference].totalAmount += ticket.totalAmount;
    }

    // Search Accommodation Bookings
    const accommodationTickets = await Accommodation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of accommodationTickets) {
      const baseReference = ticket.paymentReference.split('_')[0];

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
      }

      const ticketData = {
        _id: ticket._id,
        type: 'accommodation',
        paymentReference: ticket.paymentReference,
        amount: ticket.totalAmount,
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
      ticketGroups[baseReference].totalAmount += ticket.totalAmount;
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