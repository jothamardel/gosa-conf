import { NextRequest, NextResponse } from 'next/server';
import { BadgeUtils } from '@/lib/utils/badge.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    
    // Extract form data
    const userId = formData.get('userId') as string;
    const attendeeName = formData.get('attendeeName') as string;
    const attendeeTitle = formData.get('attendeeTitle') as string;
    const organization = formData.get('organization') as string;
    const profilePhoto = formData.get('profilePhoto') as File;

    // Validate required fields
    if (!userId || !attendeeName || !profilePhoto) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userId, attendeeName, and profilePhoto are required' 
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

    // Convert file to buffer
    const photoBuffer = Buffer.from(await profilePhoto.arrayBuffer());

    // Create badge data
    const badgeData = {
      userId,
      profilePhoto: photoBuffer,
      profilePhotoFilename: profilePhoto.name,
      attendeeName,
      attendeeTitle: attendeeTitle || undefined,
      organization: organization || undefined
    };

    // Generate badge
    const badge = await BadgeUtils.createBadge(badgeData);

    return NextResponse.json({
      success: true,
      data: {
        badgeId: badge._id,
        badgeImageUrl: badge.badgeImageUrl,
        profilePhotoUrl: badge.profilePhotoUrl,
        attendeeName: badge.attendeeName,
        attendeeTitle: badge.attendeeTitle,
        organization: badge.organization,
        createdAt: badge.createdAt
      }
    });

  } catch (error: any) {
    console.error('Badge generation error:', error);
    
    // Handle specific error types
    if (error.message.includes('Badge already exists')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge already exists for this user' 
        },
        { status: 409 }
      );
    }

    if (error.message.includes('File size exceeds') || error.message.includes('Invalid file type')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 400 }
      );
    }

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
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId parameter is required' 
        },
        { status: 400 }
      );
    }

    // Get user's badge
    const badge = await BadgeUtils.getBadgeByUserId(userId);

    if (!badge) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge not found for this user' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        badgeId: badge._id,
        badgeImageUrl: badge.badgeImageUrl,
        profilePhotoUrl: badge.profilePhotoUrl,
        attendeeName: badge.attendeeName,
        attendeeTitle: badge.attendeeTitle,
        organization: badge.organization,
        socialMediaShared: badge.socialMediaShared,
        downloadCount: badge.downloadCount,
        createdAt: badge.createdAt
      }
    });

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