import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BroadcastCampaign, BroadcastAudienceFilter } from '@/lib/schema';
import { resolveBroadcastAudience } from '@/lib/utils/broadcast-audience';
import { runCampaignBackground } from '@/lib/utils/broadcast-runner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Find the latest active campaign if any
    const activeCampaign = (await BroadcastCampaign.findOne({
      status: { $in: ['running', 'paused'] },
    })
      .sort({ updatedAt: -1 })
      .lean()) as any;

    // Find 5 most recent campaigns (excluding the active one if present)
    const recentCampaigns = await BroadcastCampaign.find(
      activeCampaign ? { _id: { $ne: activeCampaign._id } } : {},
    )
      .select('title audienceFilter status totalRecipients sentCount failedCount createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        activeCampaign,
        recentCampaigns,
      },
    });
  } catch (error: any) {
    console.error('Failed to list broadcast campaigns:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch campaigns' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      title,
      template,
      audienceFilter = 'no-tickets',
      minDelaySeconds = 8,
      maxDelaySeconds = 18,
    } = body;

    if (!title || !template) {
      return NextResponse.json(
        { success: false, error: 'Campaign title and message template are required' },
        { status: 400 },
      );
    }

    // Check if another campaign is already actively running
    const existingRunning = await BroadcastCampaign.findOne({ status: 'running' });
    if (existingRunning) {
      return NextResponse.json(
        {
          success: false,
          error: `Another campaign "${existingRunning.title}" is currently running. Please pause or wait for it to complete.`,
        },
        { status: 409 },
      );
    }

    // Resolve audience members
    const audience = await resolveBroadcastAudience(audienceFilter as BroadcastAudienceFilter);

    if (audience.recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching recipients found for the selected audience filter.' },
        { status: 400 },
      );
    }

    // Map into recipient documents
    const recipients = audience.recipients.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      phoneNumber: r.formattedPhone || r.phoneNumber,
      email: r.email,
      status: 'pending' as const,
    }));

    const campaign = new BroadcastCampaign({
      title: title.trim(),
      template: template.trim(),
      audienceFilter,
      status: 'running',
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      currentCursor: 0,
      minDelaySeconds: Math.max(5, Number(minDelaySeconds) || 8),
      maxDelaySeconds: Math.max(Number(minDelaySeconds) || 8, Number(maxDelaySeconds) || 18),
      recipients,
      startedAt: new Date(),
      createdBy: 'Desk Admin',
    });

    await campaign.save();

    // Trigger background execution
    runCampaignBackground(String(campaign._id));

    return NextResponse.json({
      success: true,
      data: {
        campaignId: String(campaign._id),
        title: campaign.title,
        totalRecipients: campaign.totalRecipients,
        status: campaign.status,
      },
    });
  } catch (error: any) {
    console.error('Failed to create and launch broadcast campaign:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to launch campaign' },
      { status: 500 },
    );
  }
}
