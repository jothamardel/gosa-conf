import { NextRequest, NextResponse } from 'next/server';
import { sendBroadcastTest } from '@/lib/utils/broadcast-runner';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, template } = body;

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
