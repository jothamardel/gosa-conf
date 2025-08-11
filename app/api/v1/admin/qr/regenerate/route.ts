import { NextRequest, NextResponse } from 'next/server';
import { QRCodeService } from '@/lib/services/qr-code.service';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { serviceType, serviceId, adminId, reason } = await request.json();

    // Validate required fields
    if (!serviceType || !serviceId || !adminId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'serviceType, serviceId, and adminId are required' 
        },
        { status: 400 }
      );
    }

    // Validate service type
    const validServiceTypes = ['convention', 'dinner', 'accommodation', 'brochure'];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid service type. Must be one of: convention, dinner, accommodation, brochure' 
        },
        { status: 400 }
      );
    }

    // Regenerate QR code
    const result = await QRCodeService.regenerateQRCode(
      serviceType,
      serviceId,
      adminId,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        oldQRCode: result.oldQRCode,
        newQRCode: result.newQRCode,
        historyId: result.historyId,
        message: result.message
      }
    });

  } catch (error: any) {
    console.error('QR code regeneration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to regenerate QR code' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (userId) {
      // Get regeneration history for specific user
      const history = await QRCodeService.getRegenerationHistory(userId);
      
      return NextResponse.json({
        success: true,
        data: { history }
      });
    } else {
      // Get all regeneration history (admin view)
      const result = await QRCodeService.getAllRegenerationHistory(page, limit);
      
      return NextResponse.json({
        success: true,
        data: result
      });
    }

  } catch (error: any) {
    console.error('Get QR regeneration history error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve regeneration history' 
      },
      { status: 500 }
    );
  }
}