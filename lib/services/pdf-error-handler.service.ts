import { ErrorCode, AppError, ExternalServiceError } from '../utils/error-handler';
import { WhatsAppPDFData, DeliveryResult } from './whatsapp-pdf.service';
import { Wasender } from '../wasender-api';

export enum PDFErrorType {
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  WHATSAPP_DELIVERY_FAILED = 'WHATSAPP_DELIVERY_FAILED',
  FALLBACK_DELIVERY_FAILED = 'FALLBACK_DELIVERY_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  TEMPLATE_RENDERING_FAILED = 'TEMPLATE_RENDERING_FAILED',
  QR_CODE_GENERATION_FAILED = 'QR_CODE_GENERATION_FAILED',
  FILE_ACCESS_FAILED = 'FILE_ACCESS_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  DOCUMENT_SIZE_EXCEEDED = 'DOCUMENT_SIZE_EXCEEDED',
  BLOB_UPLOAD_FAILED = 'BLOB_UPLOAD_FAILED',
  BLOB_STORAGE_UNAVAILABLE = 'BLOB_STORAGE_UNAVAILABLE',
  BLOB_AUTHENTICATION_FAILED = 'BLOB_AUTHENTICATION_FAILED',
  BLOB_QUOTA_EXCEEDED = 'BLOB_QUOTA_EXCEEDED'
}

export interface PDFError extends AppError {
  type: PDFErrorType;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userImpact: 'none' | 'minor' | 'major' | 'severe';
  adminNotificationRequired: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface ErrorContext {
  paymentReference: string;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
  operationType: string;
  timestamp: Date;
  attemptNumber?: number;
  previousErrors?: string[];
}

export class PDFErrorHandlerService {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 30000
  };

  private static readonly PDF_GENERATION_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 15000
  };

  private static readonly WHATSAPP_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 4,
    backoffMultiplier: 1.5,
    initialDelay: 2000,
    maxDelay: 20000
  };

  private static readonly FALLBACK_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 2,
    backoffMultiplier: 1.5,
    initialDelay: 1000,
    maxDelay: 5000
  };

  /**
   * Create a PDF-specific error with enhanced context
   */
  static createPDFError(
    type: PDFErrorType,
    message: string,
    context: ErrorContext,
    originalError?: Error
  ): PDFError {
    const errorConfig = this.getErrorConfiguration(type);

    const pdfError = new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message,
      errorConfig.statusCode,
      undefined,
      undefined,
      {
        type,
        context,
        originalError: originalError?.message,
        stack: originalError?.stack
      }
    ) as PDFError;

    pdfError.type = type;
    pdfError.retryable = errorConfig.retryable;
    pdfError.severity = errorConfig.severity;
    pdfError.userImpact = errorConfig.userImpact;
    pdfError.adminNotificationRequired = errorConfig.adminNotificationRequired;

    return pdfError;
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: ErrorContext,
    errorType: PDFErrorType
  ): Promise<T> {
    let lastError: Error | null = null;
    const errors: string[] = [];

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`Executing operation attempt ${attempt}/${config.maxAttempts}`, {
          paymentReference: context.paymentReference,
          operationType: context.operationType,
          errorType
        });

        const result = await operation();

        if (attempt > 1) {
          console.log(`Operation succeeded on attempt ${attempt}`, {
            paymentReference: context.paymentReference,
            previousErrors: errors
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        errors.push(`Attempt ${attempt}: ${lastError.message}`);

        console.error(`Operation attempt ${attempt} failed:`, {
          paymentReference: context.paymentReference,
          error: lastError.message,
          errorType
        });

        if (attempt < config.maxAttempts) {
          const delay = Math.min(
            config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
            config.maxDelay
          );

          console.log(`Retrying in ${delay}ms...`, {
            paymentReference: context.paymentReference,
            nextAttempt: attempt + 1
          });

          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    const enhancedContext = {
      ...context,
      attemptNumber: config.maxAttempts,
      previousErrors: errors
    };

    throw this.createPDFError(
      errorType,
      `Operation failed after ${config.maxAttempts} attempts: ${lastError?.message}`,
      enhancedContext,
      lastError || undefined
    );
  }

  /**
   * Handle PDF generation errors with appropriate retry logic
   */
  static async handlePDFGenerationError(
    error: Error,
    context: ErrorContext,
    retryOperation: () => Promise<any>
  ): Promise<any> {
    const errorType = this.classifyPDFGenerationError(error);

    if (this.isRetryableError(errorType)) {
      return await this.executeWithRetry(
        retryOperation,
        this.PDF_GENERATION_RETRY_CONFIG,
        context,
        errorType
      );
    } else {
      throw this.createPDFError(errorType, error.message, context, error);
    }
  }

  /**
   * Handle WhatsApp delivery errors with fallback mechanisms
   */
  static async handleWhatsAppDeliveryError(
    error: Error,
    context: ErrorContext,
    data: WhatsAppPDFData,
    retryOperation: () => Promise<any>
  ): Promise<DeliveryResult> {
    const errorType = this.classifyWhatsAppError(error);

    console.error('WhatsApp delivery error:', {
      paymentReference: context.paymentReference,
      errorType,
      message: error.message
    });

    // Try retry for retryable errors
    if (this.isRetryableError(errorType)) {
      try {
        const result = await this.executeWithRetry(
          retryOperation,
          this.WHATSAPP_RETRY_CONFIG,
          context,
          errorType
        );
        return result;
      } catch (retryError) {
        console.log('WhatsApp retry failed, attempting fallback...', {
          paymentReference: context.paymentReference
        });
        return await this.executeFallbackDelivery(data, context);
      }
    } else {
      // Non-retryable error, go straight to fallback
      return await this.executeFallbackDelivery(data, context);
    }
  }

  /**
   * Handle blob upload failure with local PDF serving fallback
   */
  static async handleBlobUploadFailure(
    data: WhatsAppPDFData,
    context: ErrorContext,
    blobError: Error
  ): Promise<string> {
    console.log('Blob upload failed, falling back to local PDF serving:', {
      paymentReference: context.paymentReference,
      error: blobError.message
    });

    // Log blob failure for monitoring
    try {
      const { PDFMonitoringService } = await import('./pdf-monitoring.service');
      await PDFMonitoringService.recordError(
        'error',
        'BLOB_UPLOAD',
        'BLOB_UPLOAD_FAILED',
        `Blob upload failed, using local fallback: ${blobError.message}`,
        {
          paymentReference: context.paymentReference,
          userPhone: data.userDetails.phone,
          operationType: data.operationDetails.type,
          error: blobError.message,
          fallbackUsed: true
        },
        false // Not requiring immediate action since we have fallback
      );
    } catch (monitoringError) {
      console.error('Failed to record blob failure:', monitoringError);
    }

    // Return local PDF download URL as fallback
    return this.generatePDFDownloadUrl(data.operationDetails.paymentReference);
  }

  /**
   * Execute fallback delivery mechanism (text message with PDF link)
   */
  static async executeFallbackDelivery(
    data: WhatsAppPDFData,
    context: ErrorContext
  ): Promise<DeliveryResult> {
    try {
      console.log('Executing fallback delivery...', {
        paymentReference: context.paymentReference,
        phone: data.userDetails.phone
      });

      const fallbackResult = await this.executeWithRetry(
        () => this.sendFallbackTextMessage(data),
        this.FALLBACK_RETRY_CONFIG,
        context,
        PDFErrorType.FALLBACK_DELIVERY_FAILED
      );

      return {
        success: true,
        pdfGenerated: true,
        whatsappSent: false,
        fallbackUsed: true,
        messageId: fallbackResult.messageId
      };
    } catch (fallbackError) {
      console.error('Fallback delivery failed completely:', {
        paymentReference: context.paymentReference,
        error: fallbackError
      });

      // Notify admin of critical failure
      await this.notifyAdminOfCriticalFailure(data, context, fallbackError as Error);

      return {
        success: false,
        pdfGenerated: true,
        whatsappSent: false,
        fallbackUsed: false,
        error: `Complete delivery failure: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send fallback text message with PDF download link
   */
  private static async sendFallbackTextMessage(data: WhatsAppPDFData): Promise<{ messageId?: string | number }> {
    const pdfDownloadUrl = this.generatePDFDownloadUrl(data.operationDetails.paymentReference);
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    const fallbackMessage = `🎉 *GOSA 2025 Convention*
*For Light and Truth*

Dear ${data.userDetails.name},

Your ${serviceTitle} has been confirmed!

📄 *Download your confirmation document:*
${pdfDownloadUrl}

💳 *Payment Details:*
• Amount: ₦${data.operationDetails.amount.toLocaleString()}
• Reference: ${data.operationDetails.paymentReference}
• Status: Confirmed ✅

📱 *Important Instructions:*
• Click the link above to download your PDF
• Save the document to your device
• Present the QR code when required
• Keep this document for your records

🔗 *Need help?* Contact support@gosa.org

*GOSA 2025 Convention Team*`;

    const result = await Wasender.httpSenderMessage({
      to: data.userDetails.phone,
      text: fallbackMessage
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send fallback message');
    }

    return { messageId: result.data?.msgId };
  }

  /**
   * Notify administrators of critical PDF delivery failures
   */
  static async notifyAdminOfCriticalFailure(
    data: WhatsAppPDFData,
    context: ErrorContext,
    error: Error
  ): Promise<void> {
    try {
      console.error('CRITICAL PDF DELIVERY FAILURE - Admin notification required:', {
        timestamp: new Date().toISOString(),
        paymentReference: context.paymentReference,
        userEmail: data.userDetails.email,
        userName: data.userDetails.name,
        userPhone: data.userDetails.phone,
        operationType: data.operationDetails.type,
        amount: data.operationDetails.amount,
        errorMessage: error.message,
        errorStack: error.stack,
        context
      });

      // Create admin notification message
      const adminMessage = `🚨 *CRITICAL PDF DELIVERY FAILURE*

*User Details:*
• Name: ${data.userDetails.name}
• Email: ${data.userDetails.email}
• Phone: ${data.userDetails.phone}

*Transaction Details:*
• Type: ${data.operationDetails.type}
• Amount: ₦${data.operationDetails.amount.toLocaleString()}
• Reference: ${data.operationDetails.paymentReference}
• Date: ${context.timestamp.toISOString()}

*Error Details:*
• Message: ${error.message}
• Previous Attempts: ${context.previousErrors?.length || 0}

*Action Required:*
Manual intervention needed to ensure user receives confirmation document.

*PDF Download Link:*
${this.generatePDFDownloadUrl(data.operationDetails.paymentReference)}

Time: ${new Date().toLocaleString()}`;

      // Send to admin phone numbers (if configured)
      const adminPhones = this.getAdminPhoneNumbers();

      for (const adminPhone of adminPhones) {
        try {
          await Wasender.httpSenderMessage({
            to: adminPhone,
            text: adminMessage
          });
          console.log(`Admin notification sent to ${adminPhone}`);
        } catch (adminNotificationError) {
          console.error(`Failed to send admin notification to ${adminPhone}:`, adminNotificationError);
        }
      }

      // Log to monitoring system (in production, this would be sent to external monitoring)
      this.logCriticalFailure(data, context, error);

    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
    }
  }

  /**
   * Log critical failures for monitoring and analysis
   */
  private static logCriticalFailure(
    data: WhatsAppPDFData,
    context: ErrorContext,
    error: Error
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      service: 'PDF_WHATSAPP_DELIVERY',
      event: 'COMPLETE_DELIVERY_FAILURE',
      paymentReference: context.paymentReference,
      userDetails: {
        email: data.userDetails.email,
        phone: data.userDetails.phone,
        name: data.userDetails.name
      },
      operationDetails: {
        type: data.operationDetails.type,
        amount: data.operationDetails.amount,
        status: data.operationDetails.status
      },
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      },
      context,
      metrics: {
        totalAttempts: context.previousErrors?.length || 0,
        timeToFailure: Date.now() - context.timestamp.getTime()
      }
    };

    // In production, send to monitoring service (Sentry, DataDog, etc.)
    console.error('CRITICAL_FAILURE_LOG:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Classify PDF generation errors
   */
  private static classifyPDFGenerationError(error: Error): PDFErrorType {
    const message = error.message.toLowerCase();

    // Blob storage specific errors
    if (message.includes('blob_read_write_token') || message.includes('blob authentication')) {
      return PDFErrorType.BLOB_AUTHENTICATION_FAILED;
    }
    if (message.includes('blob') && (message.includes('upload') || message.includes('put'))) {
      return PDFErrorType.BLOB_UPLOAD_FAILED;
    }
    if (message.includes('blob') && message.includes('unavailable')) {
      return PDFErrorType.BLOB_STORAGE_UNAVAILABLE;
    }
    if (message.includes('quota') || message.includes('storage limit')) {
      return PDFErrorType.BLOB_QUOTA_EXCEEDED;
    }

    // Existing error classifications
    if (message.includes('template') || message.includes('render')) {
      return PDFErrorType.TEMPLATE_RENDERING_FAILED;
    }
    if (message.includes('qr') || message.includes('qrcode')) {
      return PDFErrorType.QR_CODE_GENERATION_FAILED;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return PDFErrorType.DATA_VALIDATION_FAILED;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return PDFErrorType.NETWORK_ERROR;
    }
    if (message.includes('file') || message.includes('access')) {
      return PDFErrorType.FILE_ACCESS_FAILED;
    }

    return PDFErrorType.PDF_GENERATION_FAILED;
  }

  /**
   * Classify WhatsApp delivery errors
   */
  private static classifyWhatsAppError(error: Error): PDFErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('phone') || message.includes('number')) {
      return PDFErrorType.INVALID_PHONE_NUMBER;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return PDFErrorType.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('size') || message.includes('large')) {
      return PDFErrorType.DOCUMENT_SIZE_EXCEEDED;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return PDFErrorType.NETWORK_ERROR;
    }

    return PDFErrorType.WHATSAPP_DELIVERY_FAILED;
  }

  /**
   * Check if error type is retryable
   */
  private static isRetryableError(errorType: PDFErrorType): boolean {
    const retryableErrors = [
      PDFErrorType.NETWORK_ERROR,
      PDFErrorType.RATE_LIMIT_EXCEEDED,
      PDFErrorType.PDF_GENERATION_FAILED,
      PDFErrorType.WHATSAPP_DELIVERY_FAILED,
      PDFErrorType.TEMPLATE_RENDERING_FAILED,
      PDFErrorType.FILE_ACCESS_FAILED,
      PDFErrorType.BLOB_UPLOAD_FAILED,
      PDFErrorType.BLOB_STORAGE_UNAVAILABLE,
      PDFErrorType.BLOB_QUOTA_EXCEEDED
    ];

    return retryableErrors.includes(errorType);
  }

  /**
   * Get error configuration for different error types
   */
  private static getErrorConfiguration(type: PDFErrorType) {
    const configs = {
      [PDFErrorType.PDF_GENERATION_FAILED]: {
        statusCode: 500,
        retryable: true,
        severity: 'high' as const,
        userImpact: 'major' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.WHATSAPP_DELIVERY_FAILED]: {
        statusCode: 503,
        retryable: true,
        severity: 'medium' as const,
        userImpact: 'minor' as const,
        adminNotificationRequired: false
      },
      [PDFErrorType.FALLBACK_DELIVERY_FAILED]: {
        statusCode: 503,
        retryable: true,
        severity: 'critical' as const,
        userImpact: 'severe' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.DATA_VALIDATION_FAILED]: {
        statusCode: 400,
        retryable: false,
        severity: 'medium' as const,
        userImpact: 'major' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.INVALID_PHONE_NUMBER]: {
        statusCode: 400,
        retryable: false,
        severity: 'medium' as const,
        userImpact: 'major' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.RATE_LIMIT_EXCEEDED]: {
        statusCode: 429,
        retryable: true,
        severity: 'low' as const,
        userImpact: 'minor' as const,
        adminNotificationRequired: false
      },
      [PDFErrorType.BLOB_UPLOAD_FAILED]: {
        statusCode: 503,
        retryable: true,
        severity: 'high' as const,
        userImpact: 'major' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.BLOB_STORAGE_UNAVAILABLE]: {
        statusCode: 503,
        retryable: true,
        severity: 'high' as const,
        userImpact: 'major' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.BLOB_AUTHENTICATION_FAILED]: {
        statusCode: 401,
        retryable: false,
        severity: 'critical' as const,
        userImpact: 'severe' as const,
        adminNotificationRequired: true
      },
      [PDFErrorType.BLOB_QUOTA_EXCEEDED]: {
        statusCode: 507,
        retryable: false,
        severity: 'critical' as const,
        userImpact: 'severe' as const,
        adminNotificationRequired: true
      }
    };

    return configs[type as keyof typeof configs] || {
      statusCode: 500,
      retryable: true,
      severity: 'medium' as const,
      userImpact: 'minor' as const,
      adminNotificationRequired: false
    };
  }

  /**
   * Generate PDF download URL
   */
  private static generatePDFDownloadUrl(paymentReference: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.gosa.events';
    return `${baseUrl}/api/v1/pdf/download?ref=${encodeURIComponent(paymentReference)}&format=pdf`;
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
   * Get admin phone numbers for critical notifications
   */
  private static getAdminPhoneNumbers(): string[] {
    const adminPhones = process.env.ADMIN_PHONE_NUMBERS;
    if (!adminPhones) {
      console.warn('ADMIN_PHONE_NUMBERS not configured - admin notifications will not be sent');
      return [];
    }
    return adminPhones.split(',').map(phone => phone.trim());
  }

  /**
   * Utility method for sleep/delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create error context from WhatsApp PDF data
   */
  static createErrorContext(data: WhatsAppPDFData): ErrorContext {
    return {
      paymentReference: data.operationDetails.paymentReference,
      userDetails: {
        name: data.userDetails.name,
        email: data.userDetails.email,
        phone: data.userDetails.phone
      },
      operationType: data.operationDetails.type,
      timestamp: new Date()
    };
  }

  /**
   * Validate PDF data before processing
   */
  static validatePDFData(data: WhatsAppPDFData): void {
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

    if (errors.length > 0) {
      const context = this.createErrorContext(data);
      throw this.createPDFError(
        PDFErrorType.DATA_VALIDATION_FAILED,
        `Data validation failed: ${errors.join(', ')}`,
        context
      );
    }
  }
}