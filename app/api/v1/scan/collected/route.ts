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

    const { ticketId, ticketType, officialId, officialName } = await request.json();

    if (!ticketId || !ticketType || !officialId || !officialName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the ticket and appropriate model
    let ticket = null;
    let Model = null;

    switch (ticketType) {
      case 'convention':
        ticket = await ConventionRegistration.findById(ticketId);
        Model = ConventionRegistration;
        break;
      case 'dinner':
        ticket = await DinnerReservation.findById(ticketId);
        Model = DinnerReservation;
        break;
      case 'brochure':
        ticket = await ConventionBrochure.findById(ticketId);
        Model = ConventionBrochure;
        break;
      case 'accommodation':
        ticket = await Accommodation.findById(ticketId);
        Model = Accommodation;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid ticket type' },
          { status: 400 }
        );
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if already collected (for brochures)
    if (ticketType === 'brochure' && ticket.collected) {
      return NextResponse.json(
        { error: 'Item already marked as collected' },
        { status: 400 }
      );
    }

    // Create collection history entry
    const collectionEntry = {
      action: 'collected',
      timestamp: new Date(),
      officialId,
      officialName,
    };

    // Update the ticket based on type
    let updateFields = {};

    if (ticketType === 'brochure') {
      updateFields = {
        $set: {
          collected: true,
          collectedAt: new Date(),
        },
        $push: {
          checkInHistory: collectionEntry,
        },
      };
    } else {
      // For other types, use generic "collected" status
      updateFields = {
        $set: {
          collected: true,
          collectedAt: new Date(),
        },
        $push: {
          checkInHistory: collectionEntry,
        },
      };
    }

    const updatedTicket = await Model.findByIdAndUpdate(
      ticketId,
      updateFields,
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
      checkedIn: updatedTicket.checkedIn || false,
      checkedInAt: updatedTicket.checkedInAt,
      checkedOutAt: updatedTicket.checkedOutAt,
      collected: updatedTicket.collected || false,
      collectedAt: updatedTicket.collectedAt,
      checkInHistory: updatedTicket.checkInHistory || [],
      createdAt: updatedTicket.createdAt,
    };

    return NextResponse.json({
      success: true,
      message: 'Item marked as collected successfully',
      ticket: ticketData,
    });

  } catch (error) {
    console.error('Error marking as collected:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}