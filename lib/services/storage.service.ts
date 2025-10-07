/**
 * Unified Storage Service
 * Supports both Vercel Blob and ImageKit storage providers
 */

import ImageKitService, { ImageKitUploadResponse } from './imagekit.service';

// Storage provider types
type StorageProvider = 'vercel' | 'imagekit';

// Unified upload response interface
interface StorageUploadResponse {
  success: boolean;
  url: string;
  fileId?: string;
  fileName: string;
  size: number;
  provider: StorageProvider;
  metadata?: any;
}

// Upload options interface
interface StorageUploadOptions {
  fileName?: string;
  folder?: string;
  tags?: string[];
  isPrivate?: boolean;
  contentType?: string;
  userDetails?: {
    name: string;
    email: string;
    type?: string;
    registrationId?: string;
  };
}

class StorageService {
  private static defaultProvider: StorageProvider = 'imagekit';

  /**
   * Get the current storage provider from environment or default
   */
  private static getProvider(): StorageProvider {
    const envProvider = process.env.STORAGE_PROVIDER as StorageProvider;
    return envProvider || this.defaultProvider;
  }

  /**
   * Upload a file with ImageKit-first strategy and Vercel fallback
   * @param file - File buffer or base64 string
   * @param fileName - Name for the uploaded file
   * @param options - Upload options
   * @returns Upload response
   */
  static async uploadFile(
    file: Buffer | string,
    fileName: string,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResponse> {
    const startTime = Date.now();
    let primaryError: Error | null = null;
    let fallbackError: Error | null = null;

    // Step 1: Try ImageKit first (primary)
    console.log('🔄 Attempting upload to ImageKit (primary)...');
    try {
      const result = await this.uploadToImageKit(file, fileName, options);
      console.log('✅ ImageKit upload successful');
      return result;
    } catch (error) {
      primaryError = error instanceof Error ? error : new Error('ImageKit upload failed');
      console.error('❌ ImageKit upload failed:', primaryError.message);
    }

    // Step 2: Try Vercel Blob as fallback
    console.log('🔄 Attempting fallback to Vercel Blob...');
    try {
      const result = await this.uploadToVercel(file, fileName, options);
      console.log('✅ Vercel Blob fallback upload successful');

      // Log successful fallback for monitoring
      this.logFallbackSuccess(fileName, primaryError.message);

      return result;
    } catch (error) {
      fallbackError = error instanceof Error ? error : new Error('Vercel upload failed');
      console.error('❌ Vercel Blob fallback upload failed:', fallbackError.message);
    }

    // Step 3: Both failed - notify admin and throw error
    const duration = Date.now() - startTime;
    await this.notifyStorageFailure(fileName, primaryError, fallbackError, duration, options.userDetails);

    throw new Error(`Complete storage failure: ImageKit (${primaryError.message}) and Vercel (${fallbackError.message}) both failed`);
  }

  /**
   * Upload to ImageKit
   */
  private static async uploadToImageKit(
    file: Buffer | string,
    fileName: string,
    options: StorageUploadOptions
  ): Promise<StorageUploadResponse> {
    const uploadOptions = {
      fileName: options.fileName || fileName,
      folder: options.folder || '/gosa-convention',
      tags: options.tags || ['gosa', 'convention', '2025'],
      isPrivateFile: options.isPrivate || false,
    };

    const result = await ImageKitService.uploadFile(file, fileName, uploadOptions);

    return {
      success: true,
      url: result.url,
      fileId: result.fileId,
      fileName: result.name,
      size: result.size,
      provider: 'imagekit',
      metadata: {
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        fileType: result.fileType,
        filePath: result.filePath,
        tags: result.tags,
      },
    };
  }

  /**
   * Upload to Vercel Blob (fallback)
   */
  private static async uploadToVercel(
    file: Buffer | string,
    fileName: string,
    options: StorageUploadOptions
  ): Promise<StorageUploadResponse> {
    // Import Vercel Blob dynamically to avoid errors if not configured
    try {
      const { put } = await import('@vercel/blob');

      const buffer = typeof file === 'string' ? Buffer.from(file, 'base64') : file;
      const contentType = options.contentType || 'application/octet-stream';

      const result = await put(fileName, buffer, {
        access: 'public', // Vercel Blob only supports public access in current version
        contentType,
      });

      return {
        success: true,
        url: result.url,
        fileName: fileName,
        size: buffer.length,
        provider: 'vercel',
        metadata: {
          pathname: result.pathname,
          contentType: result.contentType,
          contentDisposition: result.contentDisposition,
        },
      };
    } catch (error) {
      throw new Error(`Vercel Blob upload failed: ${error}`);
    }
  }

  /**
   * Upload PDF receipt with ImageKit-first strategy
   * @param pdfBuffer - PDF file buffer
   * @param fileName - Name for the PDF file
   * @param userDetails - User information
   * @returns Upload response
   */
  static async uploadPDFReceipt(
    pdfBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; type: string }
  ): Promise<StorageUploadResponse> {
    return this.uploadFile(pdfBuffer, `${fileName}.pdf`, {
      folder: '/receipts',
      contentType: 'application/pdf',
      tags: ['receipt', 'pdf', userDetails.type, 'gosa-2025'],
      userDetails,
    });
  }

  /**
   * Upload QR regeneration receipt (optimized for WhatsApp delivery)
   * @param pdfBuffer - PDF file buffer
   * @param paymentReference - Payment reference for naming
   * @param serviceType - Type of service (convention, dinner, etc.)
   * @param userDetails - User information
   * @returns Upload response
   */
  static async uploadQRRegenerationReceipt(
    pdfBuffer: Buffer,
    paymentReference: string,
    serviceType: string,
    userDetails: { name: string; email: string; phone: string }
  ): Promise<StorageUploadResponse> {
    const fileName = `qr-regenerated-${serviceType}-${paymentReference}-${Date.now()}`;

    return this.uploadFile(pdfBuffer, `${fileName}.pdf`, {
      folder: '/qr-regeneration',
      contentType: 'application/pdf',
      tags: ['qr-regeneration', 'receipt', serviceType, 'whatsapp-delivery'],
      userDetails: {
        name: userDetails.name,
        email: userDetails.email,
        type: `${serviceType}-regeneration`,
        registrationId: paymentReference
      },
    });
  }

  /**
   * Upload image receipt with Vercel-first strategy
   * @param imageBuffer - Image file buffer
   * @param fileName - Name for the image file
   * @param userDetails - User information
   * @returns Upload response
   */
  static async uploadImageReceipt(
    imageBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; type: string }
  ): Promise<StorageUploadResponse> {
    return this.uploadFile(imageBuffer, `${fileName}.png`, {
      folder: '/images',
      contentType: 'image/png',
      userDetails,
    });
  }

  /**
   * Upload badge image with Vercel-first strategy
   * @param badgeBuffer - Badge image buffer
   * @param fileName - Name for the badge file
   * @param userDetails - User information
   * @returns Upload response
   */
  static async uploadBadge(
    badgeBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; registrationId: string }
  ): Promise<StorageUploadResponse> {
    return this.uploadFile(badgeBuffer, `badge-${fileName}.png`, {
      folder: '/badges',
      contentType: 'image/png',
      userDetails: {
        name: userDetails.name,
        email: userDetails.email,
        type: 'badge',
        registrationId: userDetails.registrationId,
      },
    });
  }

  /**
   * Delete a file
   * @param fileId - File identifier
   * @param provider - Storage provider (optional, will detect from fileId)
   */
  static async deleteFile(fileId: string, provider?: StorageProvider): Promise<void> {
    const storageProvider = provider || this.getProvider();

    try {
      switch (storageProvider) {
        case 'imagekit':
          await ImageKitService.deleteFile(fileId);
          break;

        case 'vercel':
          const { del } = await import('@vercel/blob');
          await del(fileId);
          break;

        default:
          throw new Error(`Unsupported storage provider: ${storageProvider}`);
      }
    } catch (error) {
      console.error(`Storage delete error (${storageProvider}):`, error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Generate a URL for file access with optional transformations
   * @param filePath - File path or URL
   * @param transformations - Transformation options (ImageKit only)
   * @returns File URL
   */
  static generateURL(
    filePath: string,
    transformations?: {
      height?: number;
      width?: number;
      quality?: number;
      format?: string;
    }
  ): string {
    const provider = this.getProvider();

    if (provider === 'imagekit' && transformations) {
      return ImageKitService.generateURL(filePath, transformations);
    }

    // For Vercel or no transformations, return the original path/URL
    return filePath;
  }

  /**
   * Log successful fallback for monitoring
   */
  private static logFallbackSuccess(fileName: string, primaryError: string): void {
    console.log(`📊 STORAGE_FALLBACK_SUCCESS: ${fileName} - Primary failed: ${primaryError}`);

    // You could also send this to your monitoring service
    // Example: analytics.track('storage_fallback_success', { fileName, primaryError });
  }

  /**
   * Notify admin of complete storage failure via WhatsApp
   */
  private static async notifyStorageFailure(
    fileName: string,
    primaryError: Error,
    fallbackError: Error,
    duration: number,
    userDetails?: { name: string; email: string; type?: string; registrationId?: string }
  ): Promise<void> {
    try {
      const notificationPhone = process.env.STORAGE_FAILURE_NOTIFICATION_PHONE;
      if (!notificationPhone) {
        console.error('❌ No notification phone configured for storage failures');
        return;
      }

      // Import WhatsApp service dynamically to avoid circular dependencies
      const { Wasender } = await import('../wasender-api');

      const message = `🚨 *CRITICAL STORAGE FAILURE*

📁 *File:* ${fileName}
⏱️ *Duration:* ${duration}ms
👤 *User:* ${userDetails?.name || 'Unknown'} (${userDetails?.email || 'No email'})
🎫 *Type:* ${userDetails?.type || 'Unknown'}

❌ *Vercel Blob Error:*
${primaryError.message}

❌ *ImageKit Error:*
${fallbackError.message}

⚠️ *Action Required:* Both storage providers failed. Please check system status immediately.

*Time:* ${new Date().toLocaleString()}
*GOSA Storage Monitoring*`;

      await Wasender.httpSenderMessage({
        to: notificationPhone,
        text: message
      });

      console.log(`📱 Storage failure notification sent to ${notificationPhone}`);
    } catch (notificationError) {
      console.error('❌ Failed to send storage failure notification:', notificationError);
    }
  }

  /**
   * Get storage provider configuration status
   * @returns Configuration status for each provider
   */
  static getProviderStatus(): {
    imagekit: { configured: boolean; active: boolean };
    vercel: { configured: boolean; active: boolean };
    current: StorageProvider;
  } {
    const currentProvider = this.getProvider();

    const imagekitConfigured = !!(process.env.IMAGEKIT_PUBLIC_KEY &&
      process.env.IMAGEKIT_PRIVATE_KEY &&
      process.env.IMAGEKIT_URL_ENDPOINT);

    const vercelConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

    return {
      imagekit: {
        configured: imagekitConfigured,
        active: currentProvider === 'imagekit',
      },
      vercel: {
        configured: vercelConfigured,
        active: currentProvider === 'vercel',
      },
      current: currentProvider,
    };
  }
}

export default StorageService;
export type { StorageUploadResponse, StorageUploadOptions, StorageProvider };