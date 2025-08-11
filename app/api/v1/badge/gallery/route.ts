import { NextRequest, NextResponse } from 'next/server';
import { BadgeUtils } from '@/lib/utils/badge.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get all badges for gallery (only shared ones)
    const badges = await BadgeUtils.getAllBadges();
    
    // Apply pagination
    const paginatedBadges = badges.slice(skip, skip + limit);
    const totalBadges = badges.length;
    const totalPages = Math.ceil(totalBadges / limit);

    // Format response data
    const formattedBadges = paginatedBadges.map(badge => ({
      badgeId: badge._id,
      badgeImageUrl: badge.badgeImageUrl,
      attendeeName: badge.attendeeName,
      attendeeTitle: badge.attendeeTitle,
      organization: badge.organization,
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
        badges: formattedBadges,
        pagination: {
          currentPage: page,
          totalPages,
          totalBadges,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('Get badge gallery error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve badge gallery' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { badgeId, action } = await request.json();

    if (!badgeId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'badgeId and action are required' 
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'download':
        await BadgeUtils.incrementDownloadCount(badgeId);
        result = { message: 'Download count incremented' };
        break;

      case 'share':
        result = await BadgeUtils.updateSocialMediaShared(badgeId, true);
        break;

      case 'unshare':
        result = await BadgeUtils.updateSocialMediaShared(badgeId, false);
        break;

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Supported actions: download, share, unshare' 
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Badge action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform badge action' 
      },
      { status: 500 }
    );
  }
}