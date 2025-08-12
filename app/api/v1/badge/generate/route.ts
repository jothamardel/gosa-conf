import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form data
    const userId = formData.get('userId') as string || 'demo-user';
    const attendeeName = formData.get('attendeeName') as string;
    const attendeeTitle = formData.get('attendeeTitle') as string;
    const organization = formData.get('organization') as string;
    const profilePhoto = formData.get('profilePhoto') as File;

    // Validate required fields
    if (!attendeeName || !profilePhoto) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: attendeeName and profilePhoto are required'
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!profilePhoto.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only image files are allowed'
        },
        { status: 400 }
      );
    }

    // For now, create a simple badge record without complex image processing
    const badgeId = `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a simple badge URL (placeholder for now)
    const badgeImageUrl = `/api/v1/badge/placeholder?name=${encodeURIComponent(attendeeName)}&title=${encodeURIComponent(attendeeTitle || '')}&org=${encodeURIComponent(organization || '')}`;

    // Convert file to data URL for profile photo
    const photoBuffer = Buffer.from(await profilePhoto.arrayBuffer());
    const profilePhotoUrl = `data:${profilePhoto.type};base64,${photoBuffer.toString('base64')}`;

    // Return badge data
    return NextResponse.json({
      success: true,
      data: {
        badgeId,
        badgeImageUrl,
        profilePhotoUrl,
        attendeeName,
        attendeeTitle: attendeeTitle || undefined,
        organization: organization || undefined,
        socialMediaShared: false,
        downloadCount: 0,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Badge generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate badge. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    // For now, return null to indicate no existing badge
    return NextResponse.json({
      success: false,
      error: 'Badge not found for this user'
    }, { status: 404 });

  } catch (error: any) {
    console.error('Get badge error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve badge'
      },
      { status: 500 }
    );
  }
}