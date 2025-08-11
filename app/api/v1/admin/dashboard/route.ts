import { NextRequest, NextResponse } from 'next/server';
import { AdminUtils } from '@/lib/utils/admin.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get dashboard summary data
    const dashboardData = await AdminUtils.getDashboardSummary();

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error: any) {
    console.error('Get dashboard data error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve dashboard data' 
      },
      { status: 500 }
    );
  }
}