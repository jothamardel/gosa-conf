import { NextRequest, NextResponse } from 'next/server';
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';
import { PDFSecurityService } from '@/lib/services/pdf-security.service';
import { PDFErrorHandlerService, PDFErrorType } from '@/lib/services/pdf-error-handler.service';
import { PDFMonitoringService } from '@/lib/services/pdf-monitoring.service';
import { ErrorHandler } from '@/lib/utils/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let paymentReference: string | null = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const format = searchParams.get('format') || 'pdf';

    if (!token) {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_SECURE_DOWNLOAD',
        'MISSING_TOKEN',
        'Secure PDF download requested without token',
        {
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.ip || 'unknown'
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Access token is required',
          code: 'MISSING_TOKEN'
        },
        { status: 401 }
      );
    }

    console.log('Secure PDF download requested with token');

    // Validate access using security service
    const accessValidation = await PDFSecurityService.validateAccess(token, request);

    if (!accessValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: accessValidation.reason || 'Access denied',
          code: 'ACCESS_DENIED'
        },
        { status: 403 }
      );
    }

    // Extract payment reference from validated token
    const tokenPayload = PDFSecurityService['verifySecureToken'](token);
    paymentReference = tokenPayload?.ref;

    if (!paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token payload',
          code: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    console.log('Secure PDF download validated for:', {
      paymentReference,
      format,
      remainingDownloads: accessValidation.remainingDownloads,
      userInfo: accessValidation.userInfo
    });

    // Get PDF data with error handling
    const pdfData = await PDFErrorHandlerService.executeWithRetry(
      () => PDFWhatsAppUtils.getPDFDataByReference(paymentReference!),
      PDFErrorHandlerService['DEFAULT_RETRY_CONFIG'],
      {
        paymentReference,
        userDetails: {
          name: 'Secure Download User',
          email: accessValidation.userInfo?.email || 'Unknown',
          phone: accessValidation.userInfo?.phone || 'Unknown'
        },
        operationType: 'secure-download',
        timestamp: new Date()
      },
      PDFErrorType.DATA_VALIDATION_FAILED
    );

    if (!pdfData) {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_SECURE_DOWNLOAD',
        'PAYMENT_REFERENCE_NOT_FOUND',
        `No data found for payment reference: ${paymentReference}`,
        {
          paymentReference,
          userInfo: accessValidation.userInfo
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Generate PDF with error handling
    const pdfBuffer = await PDFErrorHandlerService.executeWithRetry(
      () => PDFGeneratorService.generatePDFBuffer(pdfData),
      PDFErrorHandlerService['PDF_GENERATION_RETRY_CONFIG'],
      {
        paymentReference,
        userDetails: pdfData.userDetails,
        operationType: pdfData.operationDetails.type,
        timestamp: new Date()
      },
      PDFErrorType.PDF_GENERATION_FAILED
    );

    // Record successful download
    PDFSecurityService.recordDownload(paymentReference, accessValidation.userInfo?.ipAddress || 'unknown');

    // Log successful download
    await PDFMonitoringService.recordDeliveryMetrics(
      pdfData as any,
      {
        success: true,
        pdfGenerated: true,
        whatsappSent: false,
        fallbackUsed: false,
        retryAttempts: 0
      },
      Date.now() - startTime
    );

    // Generate filename
    const filename = PDFGeneratorService.generateFilename(
      pdfData.userDetails,
      pdfData.operationDetails.type
    );

    // Return PDF with secure headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        // Security headers
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'",
        // Custom headers for tracking
        'X-Download-ID': crypto.randomUUID(),
        'X-Remaining-Downloads': accessValidation.remainingDownloads?.toString() || '0',
        'X-Expires-At': accessValidation.expiresAt?.toISOString() || ''
      }
    });

  } catch (error) {
    console.error('Secure PDF download error:', error);

    // Record error for monitoring
    await PDFMonitoringService.recordError(
      'error',
      'PDF_SECURE_DOWNLOAD',
      'DOWNLOAD_FAILED',
      `Secure PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        paymentReference,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent')
      }
    );

    // Handle specific error types
    if (error instanceof Error && error.message.includes('PDF generation')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to generate PDF document. Please try again later.',
          code: 'PDF_GENERATION_FAILED'
        },
        { status: 503 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found. Please check your access token.',
          code: 'DOCUMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing your request. Please try again later.',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

// Generate secure download link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      paymentReference,
      userEmail,
      userPhone,
      expiresIn,
      maxDownloads,
      allowedIPs,
      requireAuth
    } = body;

    if (!paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment reference is required',
          code: 'MISSING_PAYMENT_REFERENCE'
        },
        { status: 400 }
      );
    }

    // Validate payment reference format
    if (!PDFSecurityService.validatePaymentReference(paymentReference)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment reference format',
          code: 'INVALID_PAYMENT_REFERENCE'
        },
        { status: 400 }
      );
    }

    // Verify that the payment reference exists
    const pdfData = await PDFWhatsAppUtils.getPDFDataByReference(paymentReference);
    if (!pdfData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment reference not found',
          code: 'PAYMENT_REFERENCE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Generate secure URL
    const secureURL = PDFSecurityService.generateSecureURL({
      paymentReference,
      userEmail,
      userPhone,
      expiresIn,
      maxDownloads,
      allowedIPs,
      requireAuth
    });

    // Log secure URL generation
    await PDFMonitoringService.recordError(
      'warning',
      'PDF_SECURE_DOWNLOAD',
      'SECURE_URL_GENERATED',
      'Secure PDF download URL generated',
      {
        paymentReference,
        userEmail,
        userPhone,
        expiresIn,
        maxDownloads,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent')
      }
    );

    return NextResponse.json({
      success: true,
      secureURL,
      expiresIn: expiresIn || PDFSecurityService['DEFAULT_EXPIRY'],
      maxDownloads: maxDownloads || PDFSecurityService['MAX_DOWNLOADS_DEFAULT']
    });

  } catch (error) {
    console.error('Secure URL generation error:', error);
    return ErrorHandler.handleError(error);
  }
}

// Get download statistics and access history
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentReference, action } = body;

    if (!paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment reference is required',
          code: 'MISSING_PAYMENT_REFERENCE'
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'stats':
        const stats = PDFSecurityService.getDownloadStats(paymentReference);
        return NextResponse.json({
          success: true,
          stats
        });

      case 'history':
        const history = PDFSecurityService.getAccessHistory(paymentReference);
        return NextResponse.json({
          success: true,
          history: history.map(attempt => ({
            timestamp: attempt.timestamp,
            success: attempt.success,
            reason: attempt.reason,
            ipAddress: attempt.ipAddress,
            userAgent: attempt.userAgent
          }))
        });

      case 'revoke':
        PDFSecurityService.revokeAccess(paymentReference);
        return NextResponse.json({
          success: true,
          message: 'Access revoked successfully'
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: stats, history, revoke',
            code: 'INVALID_ACTION'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('PDF security management error:', error);
    return ErrorHandler.handleError(error);
  }
}