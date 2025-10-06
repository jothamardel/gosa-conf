import { NextRequest, NextResponse } from 'next/server';
import StorageService from '@/lib/services/storage.service';

/**
 * Handle file uploads to ImageKit
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get additional parameters
    const fileName = formData.get('fileName') as string || file.name;
    const folder = formData.get('folder') as string;
    const tags = formData.get('tags') as string;
    const uploadType = formData.get('uploadType') as string || 'general';

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload using storage service
    const uploadResponse = await StorageService.uploadFile(buffer, fileName, {
      folder: folder || '/gosa-convention/general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : ['gosa', 'convention'],
    });

    return NextResponse.json({
      success: true,
      data: uploadResponse,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('ImageKit upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}