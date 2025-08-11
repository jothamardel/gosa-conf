import { NextRequest, NextResponse } from 'next/server';
import { GoodwillMessage } from '@/lib/schema/goodwill.schema';
import { NotificationService } from '@/lib/services/notification.service';
import { connectToDatabase } from '@/lib/mongodb';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { Types } from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const messageId = params.id;
    const { approved, approvedBy, reason } = await request.json();

    if (!messageId || !Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid message ID is required' 
        },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Approval status must be a boolean value' 
        },
        { status: 400 }
      );
    }

    if (!approvedBy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Approver ID is required' 
        },
        { status: 400 }
      );
    }

    // Find the goodwill message
    const message = await GoodwillMessage.findById(messageId);

    if (!message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Goodwill message not found' 
        },
        { status: 404 }
      );
    }

    if (!message.confirmed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message must be confirmed before approval' 
        },
        { status: 400 }
      );
    }

    // Update approval status
    const updatedMessage = await GoodwillMessage.findByIdAndUpdate(
      messageId,
      {
        approved,
        approvedBy: new Types.ObjectId(approvedBy),
        approvedAt: approved ? new Date() : null,
        rejectionReason: approved ? null : reason
      },
      { new: true }
    ).populate('userId', 'name email phone');

    if (!updatedMessage) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update message approval status' 
        },
        { status: 500 }
      );
    }

    // Send notification if approved
    if (approved) {
      try {
        await NotificationService.sendGoodwillApprovalNotification(updatedMessage);
      } catch (notificationError) {
        console.error('Failed to send approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: updatedMessage._id,
        approved: updatedMessage.approved,
        approvedBy: updatedMessage.approvedBy,
        approvedAt: updatedMessage.approvedAt,
        rejectionReason: updatedMessage.rejectionReason,
        message: approved ? 'Message approved successfully' : 'Message rejected'
      }
    });

  } catch (error: any) {
    console.error('Goodwill message approval error:', error);
    return ErrorHandler.handleError(error);
  }
}