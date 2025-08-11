import { NextRequest, NextResponse } from 'next/server';
import { BadgeUtils } from '@/lib/utils/badge.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get badge statistics
    const stats = await BadgeUtils.getBadgeStatistics();

    // Format recent badges data
    const formattedRecentBadges = stats.recentBadges.map(badge => ({
      badgeId: badge._id,
      badgeImageUrl: badge.badgeImageUrl,
      attendeeName: badge.attendeeName,
      attendeeTitle: badge.attendeeTitle,
      organization: badge.organization,
      socialMediaShared: badge.socialMediaShared,
      downloadCount: badge.downloadCount,
      createdAt: badge.createdAt,
      user: badge.user ? {
        name: (badge.user as any).name,
        email: (badge.user as any).email
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalBadges: stats.totalBadges,
        sharedBadges: stats.sharedBadges,
        totalDownloads: stats.totalDownloads,
        shareRate: stats.totalBadges > 0 ? (stats.sharedBadges / stats.totalBadges * 100).toFixed(1) : '0',
        averageDownloads: stats.totalBadges > 0 ? (stats.totalDownloads / stats.totalBadges).toFixed(1) : '0',
        recentBadges: formattedRecentBadges
      }
    });

  } catch (error: any) {
    console.error('Get badge statistics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve badge statistics' 
      },
      { status: 500 }
    );
  }
}