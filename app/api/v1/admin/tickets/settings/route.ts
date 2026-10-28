import { NextRequest, NextResponse } from 'next/server';
import { getCheckInActiveStatus, setCheckInActiveStatus } from '@/lib/utils/checkin-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const checkinActive = await getCheckInActiveStatus();
    return NextResponse.json({
      success: true,
      checkinActive,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch check-in status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkinActive, officialName = 'Desk Admin' } = body;

    if (typeof checkinActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'checkinActive boolean is required' },
        { status: 400 }
      );
    }

    const updatedStatus = await setCheckInActiveStatus(checkinActive, officialName);

    return NextResponse.json({
      success: true,
      checkinActive: updatedStatus,
      message: updatedStatus
        ? 'Check-ins have been activated across all admin desks'
        : 'Check-ins have been deactivated/paused across all admin desks',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update check-in status' },
      { status: 500 }
    );
  }
}
