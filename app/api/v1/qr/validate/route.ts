import { NextRequest, NextResponse } from 'next/server';
import { QRCodeService } from '@/lib/services/qr-code.service';
import { connectToDatabase } from '@/lib/mongodb';
import { ErrorHandler } from '@/lib/utils/error-handler';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { qrCodeData, markAsUsed = false } = await request.json();

    if (!qrCodeData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'QR code data is required' 
        },
        { status: 400 }
      );
    }

    // Validate and parse QR code
    const validation = QRCodeService.validateAndParseQRCode(qrCodeData);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error || 'Invalid QR code',
          valid: false
        },
        { status: 400 }
      );
    }

    // Mark as used if requested
    if (markAsUsed && validation.data) {
      const marked = await QRCodeService.markQRCodeAsUsed(
        validation.data.type,
        validation.data.id,
        qrCodeData
      );

      if (!marked) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to mark QR code as used' 
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        type: validation.data.type,
        id: validation.data.id,
        userId: validation.data.userId,
        guestName: validation.data.guestName,
        guestIndex: validation.data.guestIndex,
        validUntil: validation.data.validUntil,
        marked: markAsUsed
      }
    });

  } catch (error: any) {
    console.error('QR code validation error:', error);
    return ErrorHandler.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get QR code usage statistics
    const stats = await QRCodeService.getQRCodeStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('QR code stats error:', error);
    return ErrorHandler.handleError(error);
  }
}