import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConventionRegistration } from '@/lib/schema/convention.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { ProductPurchase } from '@/lib/schema/product-purchase.schema';
import { Donation } from '@/lib/schema/donation.schema';
import { Transaction } from '@/lib/schema/transaction.schema';
import { User } from '@/lib/schema/user.schema';
import { Types } from 'mongoose';

// Ensure all models are registered
User;
ConventionRegistration;
DinnerReservation;
ConventionBrochure;
ProductPurchase;
Donation;
Transaction;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const ticketId = params.id;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    console.log('Resolving ticket details for ID:', ticketId);

    let ticket: any = null;
    let ticketType = 'Convention Ticket';
    let user: any = null;

    const isValidObjectId = Types.ObjectId.isValid(ticketId);

    // 1. Search ConventionRegistrations
    if (isValidObjectId) {
      ticket = await ConventionRegistration.findById(ticketId);
      if (ticket) {
        ticketType = 'Convention Registration Pass';
        user = await User.findById(ticket.userId);
      }
    }

    // 2. Search DinnerReservations
    if (!ticket && isValidObjectId) {
      ticket = await DinnerReservation.findById(ticketId);
      if (ticket) {
        ticketType = 'Dinner Ticket Pass';
        user = await User.findById(ticket.userId);
      }
    }

    // 3. Search ConventionBrochures
    if (!ticket && isValidObjectId) {
      ticket = await ConventionBrochure.findById(ticketId);
      if (ticket) {
        ticketType = 'Convention Brochure Pass';
        user = await User.findById(ticket.userId);
      }
    }

    // 4. Search ProductPurchases
    if (!ticket && isValidObjectId) {
      ticket = await ProductPurchase.findById(ticketId);
      if (ticket) {
        ticketType = `Product Purchase (${ticket.productType || 'Uniform'})`;
        user = await User.findById(ticket.userId);
      }
    }

    // 5. Search Donations
    if (!ticket && isValidObjectId) {
      ticket = await Donation.findById(ticketId);
      if (ticket) {
        ticketType = 'GOSA Donation Receipt';
        user = await User.findById(ticket.userId);
      }
    }

    // 6. Search Transactions by _id or paymentReference
    if (!ticket) {
      const query = isValidObjectId
        ? { $or: [{ _id: ticketId }, { paymentReference: ticketId }] }
        : { paymentReference: ticketId };
      ticket = await Transaction.findOne(query);
      if (ticket) {
        ticketType = 'GOSA Service Transaction';
        user = await User.findById(ticket.userId);
      }
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const attendeeName =
      user?.fullName ||
      ticket.guestDetails?.[0]?.name ||
      ticket.recipientDetails?.[0]?.name ||
      ticket.donorName ||
      'GOSA Valued Member';

    const attendeeEmail =
      user?.email ||
      ticket.guestDetails?.[0]?.email ||
      ticket.recipientDetails?.[0]?.email ||
      ticket.donorEmail ||
      '';

    const attendeePhone =
      user?.phoneNumber ||
      ticket.guestDetails?.[0]?.phone ||
      ticket.recipientDetails?.[0]?.phone ||
      ticket.donorPhone ||
      '';

    const paymentRef = ticket.paymentReference || ticket.receiptNumber || ticketId;
    const amount = ticket.amount || ticket.totalAmount || 0;

    return NextResponse.json({
      success: true,
      ticket: {
        _id: ticket._id?.toString() || ticketId,
        ticketType,
        paymentReference: paymentRef,
        amount,
        status: ticket.status === 'pending' ? 'Pending' : 'Confirmed',
        confirmed: true,
        user: {
          fullName: attendeeName,
          email: attendeeEmail,
          phone: attendeePhone,
          house: user?.house || 'Gindiri Alumnus',
          year: user?.year || '2026',
        },
        createdAt: ticket.createdAt || new Date(),
        details: {
          quantity: ticket.quantity || ticket.numberOfGuests || 1,
          items: ticket.metadata?.items || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Error resolving ticket:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve ticket details' },
      { status: 500 }
    );
  }
}
