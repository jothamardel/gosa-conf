import { NextRequest, NextResponse } from 'next/server';
import { AdminUtils } from '@/lib/utils/admin.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get comprehensive analytics data
    const analytics = await AdminUtils.getAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error: any) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve analytics data' 
      },
      { status: 500 }
    );
  }
}