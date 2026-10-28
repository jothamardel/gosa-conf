import { NextRequest, NextResponse } from 'next/server';
import { resolveBroadcastAudience } from '@/lib/utils/broadcast-audience';
import { BroadcastAudienceFilter } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = (searchParams.get('filter') || 'no-tickets') as BroadcastAudienceFilter;

    const result = await resolveBroadcastAudience(filter);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Failed to resolve broadcast audience:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to resolve audience' },
      { status: 500 },
    );
  }
}
