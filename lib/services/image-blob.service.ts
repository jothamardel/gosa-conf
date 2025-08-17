import { put } from '@vercel/blob';
import { ImageData, UserDetails } from '@/lib/types';

/**
 * Service for managing image uploads to Vercel Blob storage
 */
export class ImageBlobService {
  /**
   * Upload image buffer to Vercel Blob storage
   */
  static async uploadImageToBlob(imageBuffer: Buffer, filename: string): Promise<string> {
    const startTime = Date.now();

    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      }

      // Detect content type based on buffer content
      const contentType = this.detectContentType(imageBuffer, filename);

      const blob = await put(filename, imageBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType
      });

      const processingTime = Date.now() - startTime;

      // Record successful blob operation
      const { PDFMonitoringService } = await import('./pdf-monitoring.service');
      await PDFMonitoringService.recordBlobOperation(
        'upload',
        true,
        imageBuffer.length,
        processingTime,
        undefined,
        {
          filename,
          blobUrl: blob.url,
          fileSize: imageBuffer.length,
          contentType,
          fileType: 'image'
        }
      );

      console.log(`[IMAGE-BLOB] Successfully uploaded image to blob storage: ${blob.url}`);
      return blob.url;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Record failed blob operation
      try {
        const { PDFMonitoringService } = await import('./pdf-monitoring.service');
        await PDFMonitoringService.recordBlobOperation(
          'upload',
          false,
          imageBuffer.length,
          processingTime,
          error instanceof Error ? error.message : 'Unknown error',
          {
            filename,
            fileSize: imageBuffer.length,
            contentType: 'image/png',
            fileType: 'image'
          }
        );
      } catch (monitoringError) {
        console.error('[IMAGE-BLOB] Failed to record blob monitoring:', monitoringError);
      }

      console.error('[IMAGE-BLOB] Failed to upload image to blob storage:', error);
      throw error;
    }
  }

  /**
   * Generate descriptive filename for blob storage
   * Format: gosa-2025-{serviceType}-{userName}-{timestamp}.png
   */
  static generateBlobFilename(userDetails: UserDetails, serviceType: string): string {
    const timestamp = Date.now();
    const sanitizedName = userDetails.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const sanitizedServiceType = serviceType
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    // Use .png as default, but this will be adjusted based on actual content type
    return `gosa-2025-${sanitizedServiceType}-${sanitizedName}-${timestamp}.png`;
  }

  /**
   * Handle blob upload errors with fallback mechanisms
   */
  static async handleBlobUploadError(error: Error, fallbackData: ImageData): Promise<string> {
    console.error('[IMAGE-BLOB] Blob upload failed, implementing fallback:', error.message);

    // Log the error for monitoring
    console.log('[IMAGE-BLOB-ERROR]', {
      error: error.message,
      userEmail: fallbackData.userDetails.email,
      paymentReference: fallbackData.operationDetails.paymentReference,
      serviceType: fallbackData.operationDetails.type,
      timestamp: new Date().toISOString()
    });

    // Return fallback URL using the existing image download API
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.gosa.events';
    return `${baseUrl}/api/v1/image/download?ref=${fallbackData.operationDetails.paymentReference}&format=image`;
  }

  /**
   * Detect content type based on buffer content and filename
   */
  private static detectContentType(buffer: Buffer, filename: string): string {
    // Check buffer magic bytes for PNG
    if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4E && buffer[3] === 0x47) {
      console.log('[IMAGE-BLOB] Detected PNG format from magic bytes');
      return 'image/png';
    }

    // Check for JPEG magic bytes
    if (buffer.length >= 3 &&
      buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      console.log('[IMAGE-BLOB] Detected JPEG format from magic bytes');
      return 'image/jpeg';
    }

    // Check for SVG content
    const bufferStart = buffer.toString('utf8', 0, Math.min(200, buffer.length));
    if (bufferStart.includes('<svg') || bufferStart.includes('<?xml')) {
      console.log('[IMAGE-BLOB] Detected SVG format from content');
      return 'image/svg+xml';
    }

    // Fallback based on filename
    if (filename.endsWith('.png')) {
      console.log('[IMAGE-BLOB] Using PNG content type from filename');
      return 'image/png';
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      console.log('[IMAGE-BLOB] Using JPEG content type from filename');
      return 'image/jpeg';
    } else if (filename.endsWith('.svg')) {
      console.log('[IMAGE-BLOB] Using SVG content type from filename');
      return 'image/svg+xml';
    }

    // Default to PNG for WhatsApp compatibility
    console.log('[IMAGE-BLOB] Using default PNG content type');
    return 'image/png';
  }

  /**
   * Validate blob storage configuration
   */
  static validateBlobConfig(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
  }

  /**
   * Get blob storage status for monitoring
   */
  static async getBlobStorageStatus(): Promise<{
    configured: boolean;
    tokenPresent: boolean;
    health: any;
    usage: any;
  }> {
    const { PDFMonitoringService } = await import('./pdf-monitoring.service');

    const health = PDFMonitoringService.getBlobStorageHealth();
    const usage = await PDFMonitoringService.monitorBlobStorageUsage();

    return {
      configured: this.validateBlobConfig(),
      tokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
      health,
      usage
    };
  }
}