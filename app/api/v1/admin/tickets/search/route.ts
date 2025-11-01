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

    const tickets = [];

    // Search in all collections for matching payment references
    const searchRegex = new RegExp(`^${searchPattern}`, 'i');

    // Search Convention Registrations
    const conventionTickets = await ConventionRegistration.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of conventionTickets) {
      tickets.push({
        _id: ticket._id,
        type: 'convention',
        paymentReference: ticket.paymentReference,
        amount: ticket.amount,
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
        checkInHistory: ticket.checkInHistory || []
      });
    }

    // Search Dinner Reservations
    const dinnerTickets = await DinnerReservation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of dinnerTickets) {
      tickets.push({
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
      });
    }

    // Search Brochure Orders
    const brochureTickets = await ConventionBrochure.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of brochureTickets) {
      tickets.push({
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
      });
    }

    // Search Accommodation Bookings
    const accommodationTickets = await Accommodation.find({
      paymentReference: { $regex: searchRegex }
    }).populate('userId');

    for (const ticket of accommodationTickets) {
      tickets.push({
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
      });
    }

    // Sort tickets by creation date (newest first)
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      tickets,
      searchPattern,
      totalFound: tickets.length
    });

  } catch (error) {
    console.error('Error searching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}