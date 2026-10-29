import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BroadcastCampaign } from '@/lib/schema';
import {
  runCampaignBackground,
  pauseCampaignRemote,
  cancelCampaignRemote,
} from '@/lib/utils/broadcast-runner';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const campaign = await BroadcastCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 },
      );
    }

    if (action === 'pause') {
      if (campaign.status === 'running') {
        campaign.status = 'paused';
        await campaign.save();
        await pauseCampaignRemote(id);
      }
      return NextResponse.json({ success: true, status: campaign.status });
    }

    if (action === 'resume') {
      campaign.status = 'running';
      await campaign.save();
      await runCampaignBackground(id);
      return NextResponse.json({ success: true, status: campaign.status });
    }

    if (action === 'cancel') {
      campaign.status = 'cancelled';
      campaign.completedAt = new Date();
      await campaign.save();
      await cancelCampaignRemote(id);
      return NextResponse.json({ success: true, status: campaign.status });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action "${action}". Allowed: pause, resume, cancel` },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('Failed to update campaign status:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to control campaign' },
      { status: 500 },
    );
  }
}
