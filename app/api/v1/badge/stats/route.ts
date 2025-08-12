import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return sample badge statistics
    const sampleStats = {
      totalBadges: 6,
      sharedBadges: 4,
      totalDownloads: 84,
      shareRate: '66.7',
      averageDownloads: '14.0',
      recentBadges: [
        {
          badgeId: 'badge_1',
          badgeImageUrl: '/api/v1/badge/placeholder?name=John%20Doe&title=Pastor&org=First%20Baptist%20Church',
          attendeeName: 'John Doe',
          attendeeTitle: 'Pastor',
          organization: 'First Baptist Church',
          socialMediaShared: true,
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
          socialMediaShared: true,
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
          socialMediaShared: true,
          downloadCount: 22,
          createdAt: new Date('2024-01-17').toISOString(),
          user: {
            name: 'Michael Johnson',
            email: 'michael.johnson@example.com'
          }
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: sampleStats
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