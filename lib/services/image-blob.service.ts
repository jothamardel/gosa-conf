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

      // Use PNG content type for all images
      const contentType = 'image/png';

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
    return `${baseUrl}/api/v1/image/download?ref=${fallbackData.operationDetails.paymentReference}&format=png`;
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