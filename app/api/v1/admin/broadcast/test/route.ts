import { NextRequest, NextResponse } from 'next/server';
import { sendBroadcastTest } from '@/lib/utils/broadcast-runner';
import { isDeskAdmin } from '@/lib/constants/admin-access';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, template } = body;

    const adminRole = request.headers.get('x-admin-role') || body.adminRole;
    const adminPhone = request.headers.get('x-admin-phone') || body.adminPhone;
    if (adminRole === 'desk_admin' || (adminPhone && isDeskAdmin(adminPhone))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: Sending broadcast test messages is restricted to Super Administrators.',
        },
        { status: 403 },
      );
    }

    if (!phoneNumber || !template) {
      return NextResponse.json(
        { success: false, error: 'Phone number and template are required' },
        { status: 400 },
      );
    }

    const result = await sendBroadcastTest(phoneNumber, template);

    return NextResponse.json({
      success: result.success,
      previewText: result.previewText,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Failed to send test broadcast:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch test message' },
      { status: 500 },
    );
  }
}
