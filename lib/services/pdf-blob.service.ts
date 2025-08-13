import { put } from '@vercel/blob';
import { PDFData, UserDetails } from '@/lib/types';

/**
 * Service for managing PDF uploads to Vercel Blob storage
 */
export class PDFBlobService {
  /**
   * Upload PDF buffer to Vercel Blob storage
   */
  static async uploadPDFToBlob(pdfBuffer: Buffer, filename: string): Promise<string> {
    const startTime = Date.now();

    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      }

      const blob = await put(filename, pdfBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/pdf'
      });

      const processingTime = Date.now() - startTime;

      // Record successful blob operation
      const { PDFMonitoringService } = await import('./pdf-monitoring.service');
      await PDFMonitoringService.recordBlobOperation(
        'upload',
        true,
        pdfBuffer.length,
        processingTime,
        undefined,
        {
          filename,
          blobUrl: blob.url,
          fileSize: pdfBuffer.length,
          contentType: 'application/pdf'
        }
      );

      console.log(`[PDF-BLOB] Successfully uploaded PDF to blob storage: ${blob.url}`);
      return blob.url;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Record failed blob operation
      try {
        const { PDFMonitoringService } = await import('./pdf-monitoring.service');
        await PDFMonitoringService.recordBlobOperation(
          'upload',
          false,
          pdfBuffer.length,
          processingTime,
          error instanceof Error ? error.message : 'Unknown error',
          {
            filename,
            fileSize: pdfBuffer.length,
            contentType: 'application/pdf'
          }
        );
      } catch (monitoringError) {
        console.error('[PDF-BLOB] Failed to record blob monitoring:', monitoringError);
      }

      console.error('[PDF-BLOB] Failed to upload PDF to blob storage:', error);
      throw error;
    }
  }

  /**
   * Generate descriptive filename for blob storage
   * Format: gosa-2025-{serviceType}-{userName}-{timestamp}.pdf
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

    return `gosa-2025-${sanitizedServiceType}-${sanitizedName}-${timestamp}.pdf`;
  }

  /**
   * Handle blob upload errors with fallback mechanisms
   */
  static async handleBlobUploadError(error: Error, fallbackData: PDFData): Promise<string> {
    console.error('[PDF-BLOB] Blob upload failed, implementing fallback:', error.message);

    // Log the error for monitoring
    console.log('[PDF-BLOB-ERROR]', {
      error: error.message,
      userEmail: fallbackData.userDetails.email,
      paymentReference: fallbackData.operationDetails.paymentReference,
      serviceType: fallbackData.operationDetails.type,
      timestamp: new Date().toISOString()
    });

    // Return fallback URL using the existing PDF download API
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.gosa.events';
    return `${baseUrl}/api/v1/pdf/download?ref=${fallbackData.operationDetails.paymentReference}&format=pdf`;
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