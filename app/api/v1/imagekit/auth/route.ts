import { NextRequest, NextResponse } from 'next/server';
import ImageKitService from '@/lib/services/imagekit.service';

/**
 * Generate authentication parameters for ImageKit client-side uploads
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters (optional)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expireParam = searchParams.get('expire');

    // Default expiration: 1 hour
    const expire = expireParam ? parseInt(expireParam) : 3600;

    // Generate authentication parameters
    const authParams = ImageKitService.generateAuthenticationParameters(token || undefined, expire);

    return NextResponse.json({
      success: true,
      ...authParams,
    });
  } catch (error) {
    console.error('ImageKit auth API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate authentication parameters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}