import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // For now, return sample badge data since we simplified the badge system
    const sampleBadges = [
      {
        badgeId: 'badge_1',
        badgeImageUrl: '/api/v1/badge/placeholder?name=John%20Doe&title=Pastor&org=First%20Baptist%20Church',
        attendeeName: 'John Doe',
        attendeeTitle: 'Pastor',
        organization: 'First Baptist Church',
        downloadCount: 15,
        createdAt: new Date('2024-01-15').toISOString(),
        user: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        }
      },
      {
        badgeId: 'badge_2',
        badgeImageUrl: '/api/v1/badge/placeholder?name=Jane%20Smith&title=Elder&org=Grace%20Community%20Church',
        attendeeName: 'Jane Smith',
        attendeeTitle: 'Elder',
        organization: 'Grace Community Church',
        downloadCount: 8,
        createdAt: new Date('2024-01-16').toISOString(),
        user: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com'
        }
      },
      {
        badgeId: 'badge_3',
        badgeImageUrl: '/api/v1/badge/placeholder?name=Michael%20Johnson&title=Deacon&org=Hope%20Fellowship',
        attendeeName: 'Michael Johnson',
        attendeeTitle: 'Deacon',
        organization: 'Hope Fellowship',
        downloadCount: 22,
        createdAt: new Date('2024-01-17').toISOString(),
        user: {
          name: 'Michael Johnson',
          email: 'michael.johnson@example.com'
        }
      },
      {
        badgeId: 'badge_4',
        badgeImageUrl: '/api/v1/badge/placeholder?name=Sarah%20Williams&title=Youth%20Leader&org=New%20Life%20Church',
        attendeeName: 'Sarah Williams',
        attendeeTitle: 'Youth Leader',
        organization: 'New Life Church',
        downloadCount: 12,
        createdAt: new Date('2024-01-18').toISOString(),
        user: {
          name: 'Sarah Williams',
          email: 'sarah.williams@example.com'
        }
      },
      {
        badgeId: 'badge_5',
        badgeImageUrl: '/api/v1/badge/placeholder?name=David%20Brown&title=Minister&org=Faith%20Assembly',
        attendeeName: 'David Brown',
        attendeeTitle: 'Minister',
        organization: 'Faith Assembly',
        downloadCount: 18,
        createdAt: new Date('2024-01-19').toISOString(),
        user: {
          name: 'David Brown',
          email: 'david.brown@example.com'
        }
      },
      {
        badgeId: 'badge_6',
        badgeImageUrl: '/api/v1/badge/placeholder?name=Lisa%20Davis&title=Worship%20Leader&org=Cornerstone%20Church',
        attendeeName: 'Lisa Davis',
        attendeeTitle: 'Worship Leader',
        organization: 'Cornerstone Church',
        downloadCount: 9,
        createdAt: new Date('2024-01-20').toISOString(),
        user: {
          name: 'Lisa Davis',
          email: 'lisa.davis@example.com'
        }
      }
    ];

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedBadges = sampleBadges.slice(skip, skip + limit);
    const totalBadges = sampleBadges.length;
    const totalPages = Math.ceil(totalBadges / limit);

    return NextResponse.json({
      success: true,
      data: {
        badges: paginatedBadges,
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
        // For now, just simulate download count increment
        result = { message: 'Download count incremented', badgeId };
        break;

      case 'share':
        result = { message: 'Badge shared to gallery', badgeId, shared: true };
        break;

      case 'unshare':
        result = { message: 'Badge removed from gallery', badgeId, shared: false };
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