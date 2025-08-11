import { NextRequest, NextResponse } from 'next/server';
import { BadgeUtils } from '@/lib/utils/badge.utils';
import { connectToDatabase } from '@/lib/mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const badgeId = params.id;

    if (!badgeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge ID is required' 
        },
        { status: 400 }
      );
    }

    // Delete badge
    const deleted = await BadgeUtils.deleteBadge(badgeId);

    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete badge' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Badge deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete badge error:', error);
    
    if (error.message.includes('Badge not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete badge' 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const badgeId = params.id;
    const { socialMediaShared } = await request.json();

    if (!badgeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge ID is required' 
        },
        { status: 400 }
      );
    }

    if (typeof socialMediaShared !== 'boolean') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'socialMediaShared must be a boolean value' 
        },
        { status: 400 }
      );
    }

    // Update badge sharing status
    const updatedBadge = await BadgeUtils.updateSocialMediaShared(badgeId, socialMediaShared);

    if (!updatedBadge) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Badge not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        badgeId: updatedBadge._id,
        socialMediaShared: updatedBadge.socialMediaShared,
        message: `Badge ${socialMediaShared ? 'shared' : 'unshared'} successfully`
      }
    });

  } catch (error: any) {
    console.error('Update badge error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update badge' 
      },
      { status: 500 }
    );
  }
}