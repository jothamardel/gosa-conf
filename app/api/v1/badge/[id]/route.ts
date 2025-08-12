import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // For now, simulate badge deletion
    console.log(`Simulating deletion of badge: ${badgeId}`);

    return NextResponse.json({
      success: true,
      message: 'Badge deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete badge error:', error);
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

    // For now, simulate badge sharing status update
    console.log(`Simulating sharing status update for badge: ${badgeId}, shared: ${socialMediaShared}`);

    return NextResponse.json({
      success: true,
      data: {
        badgeId,
        socialMediaShared,
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