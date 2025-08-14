import { ImageGeneratorService } from './image-generator.service';
import { Wasender, WASenderImage, WASenderResult } from '../wasender-api';
import { ImageData, WhatsAppImageData } from '@/lib/types';
import {
  PDFErrorHandlerService,
  PDFErrorType,
  ErrorContext
} from './pdf-error-handler.service';
import { PDFMonitoringService } from './pdf-monitoring.service';
import { PDFLoggerService } from './pdf-logger.service';

export interface DeliveryResult {
  success: boolean;
  imageGenerated: boolean;
  whatsappSent: boolean;
  error?: string;
  fallbackUsed?: boolean;
  messageId?: string | number;
  retryAttempts?: number;
  errorType?: PDFErrorType;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export class WhatsAppImageService {
  private static readonly IMAGE_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  };

  private static readonly WHATSAPP_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 1.5,
    initialDelay: 2000
  };

  /**
   * Main orchestrator method - generates image and sends via WhatsApp with comprehensive error handling
   */
  static async generateAndSendImage(data: WhatsAppImageData): Promise<DeliveryResult> {
    const startTime = Date.now();

    // Log delivery start
    PDFLoggerService.logDeliveryStart(
      data.operationDetails.paymentReference,
      data.operationDetails.type,
      data.userDetails.phone,
      data.userDetails.registrationId
    );

    console.log('Starting image generation and WhatsApp delivery for:', {
      user: data.userDetails.name,
      type: data.operationDetails.type,
      reference: data.operationDetails.paymentReference
    });

    const result: DeliveryResult = {
      success: false,
      imageGenerated: false,
      whatsappSent: false,
      retryAttempts: 0
    };

    try {
      // Step 0: Validate input data
      PDFErrorHandlerService.validatePDFData(data);
      const context = PDFErrorHandlerService.createErrorContext(data);

      // Step 1: Generate image and upload to Vercel Blob storage
      let blobUrl: string;
      try {
        blobUrl = await PDFErrorHandlerService.executeWithRetry(
          () => ImageGeneratorService.generateAndUploadToBlob(data),
          PDFErrorHandlerService['PDF_GENERATION_RETRY_CONFIG'],
          context,
          PDFErrorType.PDF_GENERATION_FAILED
        );

        result.imageGenerated = true;
        console.log('Image generated and uploaded to blob successfully for:', data.operationDetails.paymentReference);
      } catch (imageError) {
        console.error('Image generation and blob upload failed completely:', imageError);
        result.error = `Image generation failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`;
        result.errorType = PDFErrorType.PDF_GENERATION_FAILED;

        // Notify admin for critical image generation failures
        if (imageError instanceof Error) {
          await PDFErrorHandlerService.notifyAdminOfCriticalFailure(data, context, imageError);
        }

        return result;
      }

      // Step 2: Send image via WhatsApp using Vercel Blob URL
      try {
        const whatsappResult = await PDFErrorHandlerService.executeWithRetry(
          () => this.sendImageDocumentWithBlob(data, blobUrl),
          PDFErrorHandlerService['WHATSAPP_RETRY_CONFIG'],
          context,
          PDFErrorType.WHATSAPP_DELIVERY_FAILED
        );

        result.whatsappSent = true;
        result.success = true;
        result.messageId = whatsappResult.messageId;
        console.log('Image sent successfully via WhatsApp to:', data.userDetails.phone);

        return result;
      } catch (whatsappError) {
        console.log('WhatsApp image delivery failed after retries, attempting fallback...', {
          paymentReference: data.operationDetails.paymentReference,
          error: whatsappError instanceof Error ? whatsappError.message : 'Unknown error'
        });

        // Step 3: Execute fallback delivery with error handling
        const fallbackResult = await PDFErrorHandlerService.executeFallbackDelivery(data, context);

        result.success = fallbackResult.success;
        result.fallbackUsed = fallbackResult.fallbackUsed;
        result.messageId = fallbackResult.messageId;
        result.error = fallbackResult.error;
        result.errorType = PDFErrorType.WHATSAPP_DELIVERY_FAILED;

        if (!fallbackResult.success) {
          console.error('Complete delivery failure for:', data.operationDetails.paymentReference);
        } else {
          console.log('Fallback delivery successful for:', data.operationDetails.paymentReference);
        }

        return result;
      }
    } catch (error) {
      console.error('Unexpected error in image generation and delivery:', error);

      const context = PDFErrorHandlerService.createErrorContext(data);
      if (error instanceof Error) {
        await PDFErrorHandlerService.notifyAdminOfCriticalFailure(data, context, error);
      }

      result.error = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errorType = PDFErrorType.PDF_GENERATION_FAILED;
      return result;
    }
  }

  /**
   * Send image via WhatsApp using Vercel Blob URL (extracted for retry logic)
   */
  private static async sendImageDocumentWithBlob(data: WhatsAppImageData, blobUrl: string): Promise<{ messageId?: string | number }> {
    const imageData = await this.createImageMessage(data, blobUrl);
    const result = await Wasender.sendImage(imageData);

    if (!result.success) {
      throw new Error(result.error || 'WhatsApp image delivery failed');
    }

    return { messageId: result.data?.msgId };
  }

  /**
   * Create WhatsApp image message data with Vercel Blob URL
   */
  private static async createImageMessage(data: WhatsAppImageData, blobUrl: string): Promise<WASenderImage> {
    const messageText = this.createStandardizedGOSAMessage(data, blobUrl);

    return {
      to: data.userDetails.phone,
      text: messageText,
      imageUrl: blobUrl
    };
  }

  /**
   * Create standardized GOSA WhatsApp message with personalized details
   */
  private static createStandardizedGOSAMessage(data: WhatsAppImageData, imageUrl: string): string {
    const { userDetails, operationDetails } = data;
    const serviceTitle = this.getServiceTitle(operationDetails.type);

    return `🎉 GOSA 2025 Convention
For Light and Truth

Dear ${userDetails.name},

Your ${serviceTitle} has been confirmed!

💳 Payment Details:
• Amount: ₦${operationDetails.amount.toLocaleString()}
• Reference: ${operationDetails.paymentReference}
• Status: Confirmed ✅

📱 Important Instructions:
• Save this confirmation image to your device
• Present the QR code when required
• Keep this document for your records

🔗 Need help? Contact support@gosa.org

GOSA 2025 Convention Team
www.gosa.events`;
  }

  /**
   * Get service title for messages
   */
  private static getServiceTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'convention': 'Convention Registration',
      'dinner': 'Dinner Reservation',
      'accommodation': 'Accommodation Booking',
      'brochure': 'Brochure Order',
      'goodwill': 'Goodwill Message & Donation',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Enhanced delivery status tracking
   */
  static async trackDeliveryStatus(
    messageId: string | number,
    paymentReference: string
  ): Promise<{
    status: 'pending' | 'delivered' | 'failed' | 'read';
    timestamp: Date;
    attempts: number;
  }> {
    try {
      // In production, this would query the WhatsApp API for delivery status
      console.log('Tracking delivery status for:', { messageId, paymentReference });

      // Mock implementation - replace with actual WASender API call
      return {
        status: 'delivered',
        timestamp: new Date(),
        attempts: 1
      };
    } catch (error) {
      console.error('Failed to track delivery status:', error);
      return {
        status: 'failed',
        timestamp: new Date(),
        attempts: 0
      };
    }
  }

  /**
   * Validate WhatsApp image data before processing
   */
  static validateWhatsAppImageData(data: WhatsAppImageData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate user details
    if (!data.userDetails.name?.trim()) {
      errors.push('User name is required');
    }
    if (!data.userDetails.email?.trim()) {
      errors.push('User email is required');
    }
    if (!data.userDetails.phone?.trim()) {
      errors.push('User phone number is required');
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (data.userDetails.phone && !phoneRegex.test(data.userDetails.phone.replace(/\s+/g, ''))) {
      errors.push('Invalid phone number format');
    }

    // Validate operation details
    if (!data.operationDetails.paymentReference?.trim()) {
      errors.push('Payment reference is required');
    }
    if (!data.operationDetails.type) {
      errors.push('Operation type is required');
    }
    if (data.operationDetails.amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    // Validate QR code data
    if (!data.qrCodeData?.trim()) {
      errors.push('QR code data is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}