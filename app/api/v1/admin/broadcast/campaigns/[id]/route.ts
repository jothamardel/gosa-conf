import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BroadcastCampaign } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const campaign = (await BroadcastCampaign.findById(id).lean()) as any;
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    // Extract recent recipient activities for the live feed
    const recipients = (campaign.recipients || []) as any[];
    const recentActivity = recipients
      .filter((r) => r.status === 'sent' || r.status === 'failed')
      .slice(-15)
      .reverse();

    const percentage =
      campaign.totalRecipients > 0
        ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        _id: campaign._id,
        title: campaign.title,
        template: campaign.template,
        audienceFilter: campaign.audienceFilter,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        currentCursor: campaign.currentCursor,
        percentage,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        lastError: campaign.lastError,
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error('Failed to get campaign status:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch campaign' },
      { status: 500 },
    );
  }
}
