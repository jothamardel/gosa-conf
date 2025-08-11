import { NextRequest, NextResponse } from 'next/server';
import { GoodwillMessage } from '@/lib/schema/goodwill.schema';
import { NotificationService } from '@/lib/services/notification.service';
import { connectToDatabase } from '@/lib/mongodb';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { Types } from 'mongoose';

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const { messageIds, approved, approvedBy, reason } = await request.json();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message IDs array is required' 
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

    // Validate all message IDs
    const validIds = messageIds.filter(id => Types.ObjectId.isValid(id));
    if (validIds.length !== messageIds.length) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All message IDs must be valid ObjectIds' 
        },
        { status: 400 }
      );
    }

    // Find all messages
    const messages = await GoodwillMessage.find({
      _id: { $in: validIds.map(id => new Types.ObjectId(id)) },
      confirmed: true
    }).populate('userId', 'name email phone');

    if (messages.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No confirmed messages found for the provided IDs' 
        },
        { status: 404 }
      );
    }

    // Update all messages
    const updateResult = await GoodwillMessage.updateMany(
      {
        _id: { $in: messages.map(msg => msg._id) }
      },
      {
        approved,
        approvedBy: new Types.ObjectId(approvedBy),
        approvedAt: approved ? new Date() : null,
        rejectionReason: approved ? null : reason
      }
    );

    // Send notifications for approved messages
    if (approved) {
      const notificationPromises = messages.map(async (message) => {
        try {
          await NotificationService.sendGoodwillApprovalNotification(message);
        } catch (error) {
          console.error(`Failed to send notification for message ${message._id}:`, error);
        }
      });

      // Send notifications in parallel but don't wait for them
      Promise.all(notificationPromises).catch(error => {
        console.error('Some notifications failed to send:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        processedCount: updateResult.modifiedCount,
        totalRequested: messageIds.length,
        foundMessages: messages.length,
        approved,
        message: approved 
          ? `${updateResult.modifiedCount} messages approved successfully`
          : `${updateResult.modifiedCount} messages rejected`
      }
    });

  } catch (error: any) {
    console.error('Bulk goodwill message approval error:', error);
    return ErrorHandler.handleError(error);
  }
}