import { PDFGeneratorService } from './pdf-generator.service';
import { Wasender, WASenderDocument, WASenderResult } from '../wasender-api';
import { PDFWhatsAppUtils, WhatsAppPDFData, PDFData } from '../utils/pdf-whatsapp.utils';
import {
  PDFErrorHandlerService,
  PDFErrorType,
  ErrorContext
} from './pdf-error-handler.service';
import { PDFMonitoringService } from './pdf-monitoring.service';
import { PDFLoggerService } from './pdf-logger.service';

export interface DeliveryResult {
  success: boolean;
  pdfGenerated: boolean;
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

export class WhatsAppPDFService {
  private static readonly PDF_RETRY_CONFIG: RetryConfig = {
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
   * Main orchestrator method - generates PDF and sends via WhatsApp with comprehensive error handling
   */
  static async generateAndSendPDF(data: WhatsAppPDFData): Promise<DeliveryResult> {
    const startTime = Date.now();

    // Log delivery start
    PDFLoggerService.logDeliveryStart(
      data.operationDetails.paymentReference,
      data.operationDetails.type,
      data.userDetails.phone,
      data.userDetails.registrationId
    );

    console.log('Starting PDF generation and WhatsApp delivery for:', {
      user: data.userDetails.name,
      type: data.operationDetails.type,
      reference: data.operationDetails.paymentReference
    });

    const result: DeliveryResult = {
      success: false,
      pdfGenerated: false,
      whatsappSent: false,
      retryAttempts: 0
    };

    try {
      // Step 0: Validate input data
      PDFErrorHandlerService.validatePDFData(data);
      const context = PDFErrorHandlerService.createErrorContext(data);

      // Step 1: Generate PDF with comprehensive error handling and retry logic
      try {
        await PDFErrorHandlerService.executeWithRetry(
          () => PDFGeneratorService.generatePDFHTML(data),
          PDFErrorHandlerService['PDF_GENERATION_RETRY_CONFIG'],
          context,
          PDFErrorType.PDF_GENERATION_FAILED
        );

        result.pdfGenerated = true;
        console.log('PDF generated successfully for:', data.operationDetails.paymentReference);
      } catch (pdfError) {
        console.error('PDF generation failed completely:', pdfError);
        result.error = `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`;
        result.errorType = PDFErrorType.PDF_GENERATION_FAILED;

        // Notify admin for critical PDF generation failures
        if (pdfError instanceof Error) {
          await PDFErrorHandlerService.notifyAdminOfCriticalFailure(data, context, pdfError);
        }

        return result;
      }

      // Step 2: Send PDF via WhatsApp with comprehensive error handling
      try {
        const whatsappResult = await PDFErrorHandlerService.executeWithRetry(
          () => this.sendPDFDocument(data),
          PDFErrorHandlerService['WHATSAPP_RETRY_CONFIG'],
          context,
          PDFErrorType.WHATSAPP_DELIVERY_FAILED
        );

        result.whatsappSent = true;
        result.success = true;
        result.messageId = whatsappResult.messageId;
        console.log('PDF sent successfully via WhatsApp to:', data.userDetails.phone);

        return result;
      } catch (whatsappError) {
        console.log('WhatsApp document delivery failed after retries, attempting fallback...', {
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
      console.error('Unexpected error in PDF generation and delivery:', error);

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
   * Send PDF document via WhatsApp (extracted for retry logic)
   */
  private static async sendPDFDocument(data: WhatsAppPDFData): Promise<{ messageId?: string | number }> {
    const documentData = this.createDocumentMessage(data);
    const result = await Wasender.sendDocument(documentData);

    if (!result.success) {
      throw new Error(result.error || 'WhatsApp document delivery failed');
    }

    return { messageId: result.data?.msgId };
  }

  /**
   * Enhanced error monitoring and logging
   */
  static async logDeliveryMetrics(
    data: WhatsAppPDFData,
    result: DeliveryResult,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime;

    try {
      // Record metrics using the monitoring service
      await PDFMonitoringService.recordDeliveryMetrics(data, result, processingTime);
    } catch (monitoringError) {
      console.error('Failed to record delivery metrics:', monitoringError);

      // Fallback to basic logging
      const metrics = {
        timestamp: new Date().toISOString(),
        paymentReference: data.operationDetails.paymentReference,
        operationType: data.operationDetails.type,
        userPhone: data.userDetails.phone,
        success: result.success,
        pdfGenerated: result.pdfGenerated,
        whatsappSent: result.whatsappSent,
        fallbackUsed: result.fallbackUsed || false,
        retryAttempts: result.retryAttempts || 0,
        errorType: result.errorType,
        processingTime,
        messageId: result.messageId
      };

      console.log('PDF_DELIVERY_METRICS_FALLBACK:', JSON.stringify(metrics, null, 2));
    }
  }

  /**
   * Create WhatsApp document message data
   */
  private static createDocumentMessage(data: WhatsAppPDFData): WASenderDocument {
    const filename = PDFGeneratorService.generateFilename(data.userDetails, data.operationDetails.type);
    const pdfDownloadUrl = this.generatePDFDownloadUrl(data.operationDetails.paymentReference);

    const messageText = this.createServiceSpecificMessage(data);

    return {
      to: data.userDetails.phone,
      text: messageText,
      documentUrl: pdfDownloadUrl,
      fileName: filename
    };
  }

  /**
   * Generate PDF download URL
   */
  private static generatePDFDownloadUrl(paymentReference: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/pdf/download?ref=${encodeURIComponent(paymentReference)}&format=pdf`;
  }

  /**
   * Create service-specific WhatsApp message
   */
  private static createServiceSpecificMessage(data: WhatsAppPDFData): string {
    const { userDetails, operationDetails } = data;
    const serviceTitle = this.getServiceTitle(operationDetails.type);

    const baseMessage = `🎉 *GOSA 2025 Convention*\n*For Light and Truth*\n\nDear ${userDetails.name},\n\nYour ${serviceTitle} has been confirmed! 📄\n\n`;

    const serviceSpecificContent = this.getServiceSpecificContent(operationDetails);

    const instructions = this.getServiceInstructions(operationDetails.type);

    const footer = `\n📱 *Important:*\n• Save this PDF to your device\n• Present the QR code when required\n• Keep this document for your records\n\n🔗 *Need help?* Contact support@gosa.org\n\n*GOSA 2025 Convention Team*`;

    return baseMessage + serviceSpecificContent + instructions + footer;
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
   * Get service-specific content for WhatsApp message
   */
  private static getServiceSpecificContent(operationDetails: WhatsAppPDFData['operationDetails']): string {
    switch (operationDetails.type) {
      case 'convention':
        return `✅ *Registration Details:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Convention Dates: Dec 26-29, 2025\n\n`;

      case 'dinner':
        return `🍽️ *Dinner Details:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Date: December 28, 2025 at 7:00 PM\n• Venue: Grand Ballroom\n\n`;

      case 'accommodation':
        return `🏨 *Accommodation Details:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Check-in: Dec 25, 2025 (3:00 PM)\n• Check-out: Dec 30, 2025 (11:00 AM)\n\n`;

      case 'brochure':
        return `📚 *Brochure Order:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Status: Processing\n\n`;

      case 'goodwill':
        return `💝 *Goodwill Message:*\n• Donation: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Status: Under Review\n\n`;

      case 'donation':
        return `🙏 *Donation Receipt:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n• Receipt Number: ${this.generateReceiptNumber(operationDetails.paymentReference)}\n\n`;

      default:
        return `💳 *Payment Details:*\n• Amount: ₦${operationDetails.amount.toLocaleString()}\n• Reference: ${operationDetails.paymentReference}\n\n`;
    }
  }

  /**
   * Get service-specific instructions
   */
  private static getServiceInstructions(type: string): string {
    switch (type) {
      case 'convention':
        return `📋 *Next Steps:*\n• Present QR code at convention entrance\n• Arrive early for check-in (8:00-10:00 AM)\n• Bring valid ID for verification\n`;

      case 'dinner':
        return `🎭 *Dinner Instructions:*\n• Dress code: Formal/Black Tie\n• Arrive by 6:30 PM for cocktails\n• Present QR code at venue entrance\n`;

      case 'accommodation':
        return `🗝️ *Check-in Instructions:*\n• Present this confirmation at hotel reception\n• Bring valid ID for check-in\n• Early check-in available upon request\n`;

      case 'brochure':
        return `📦 *Delivery Information:*\n• You'll be notified when ready for pickup\n• Present QR code for collection\n• Digital copies available immediately\n`;

      case 'goodwill':
        return `📝 *Message Review:*\n• Your message is under review\n• Approved messages may be featured\n• Thank you for your generous contribution\n`;

      case 'donation':
        return `🧾 *Tax Information:*\n• Keep this receipt for tax purposes\n• Donation is tax-deductible where applicable\n• Thank you for supporting GOSA\n`;

      default:
        return `📄 *General Instructions:*\n• Keep this document safe\n• Contact support if you need assistance\n`;
    }
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
   * Handle delivery failure with admin notification
   */
  private static async handleDeliveryFailure(error: Error, data: WhatsAppPDFData): Promise<void> {
    console.error('Complete PDF delivery failure:', {
      error: error.message,
      user: data.userDetails.name,
      phone: data.userDetails.phone,
      reference: data.operationDetails.paymentReference,
      type: data.operationDetails.type
    });

    // TODO: Implement admin notification system
    // This could send an email to administrators or log to a monitoring system
    try {
      // For now, we'll just log the failure
      // In a production system, this would trigger admin alerts
      console.log('Admin notification needed for delivery failure:', {
        timestamp: new Date().toISOString(),
        userEmail: data.userDetails.email,
        paymentReference: data.operationDetails.paymentReference,
        errorMessage: error.message
      });
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
    }
  }

  /**
   * Generate receipt number from payment reference
   */
  private static generateReceiptNumber(paymentReference: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const refSuffix = paymentReference.slice(-4).toUpperCase();
    return `GOSA-${timestamp}-${refSuffix}`;
  }

  /**
   * Utility method for sleep/delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate WhatsApp PDF data before processing
   */
  static validateWhatsAppPDFData(data: WhatsAppPDFData): { valid: boolean; errors: string[] } {
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

  /**
   * Create WhatsApp PDF data from payment reference
   */
  static async createWhatsAppPDFDataFromReference(paymentReference: string): Promise<WhatsAppPDFData | null> {
    try {
      const pdfData = await PDFWhatsAppUtils.getPDFDataByReference(paymentReference);
      if (!pdfData) {
        console.error('No PDF data found for payment reference:', paymentReference);
        return null;
      }

      // WhatsAppPDFData extends PDFData, so we can return it directly
      return pdfData as WhatsAppPDFData;
    } catch (error) {
      console.error('Error creating WhatsApp PDF data from reference:', error);
      return null;
    }
  }
}