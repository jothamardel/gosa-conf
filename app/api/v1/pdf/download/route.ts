import { NextRequest, NextResponse } from 'next/server';
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';
import { PDFErrorHandlerService, PDFErrorType } from '@/lib/services/pdf-error-handler.service';
import { PDFMonitoringService } from '@/lib/services/pdf-monitoring.service';
import { PDFSecurityService } from '@/lib/services/pdf-security.service';
import { PDFPerformanceService } from '@/lib/services/pdf-performance.service';
import { PDFLoggerService } from '@/lib/services/pdf-logger.service';
import { ErrorHandler } from '@/lib/utils/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let paymentReference: string | null = null;
  let serviceType: string = 'unknown';

  try {
    const searchParams = request.nextUrl.searchParams;
    paymentReference = searchParams.get('ref');
    const format = searchParams.get('format') || 'pdf';

    if (!paymentReference) {
      PDFLoggerService.logSecurityEvent(
        'invalid_reference',
        undefined,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || undefined
      );

      await PDFMonitoringService.recordError(
        'warning',
        'PDF_DOWNLOAD',
        'MISSING_PAYMENT_REFERENCE',
        'PDF download requested without payment reference',
        { userAgent: request.headers.get('user-agent') }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Payment reference is required',
          code: 'MISSING_PAYMENT_REFERENCE'
        },
        { status: 400 }
      );
    }

    // Log download request
    PDFLoggerService.logDownloadRequest(
      paymentReference,
      serviceType, // Will be updated once we determine the service type
      format as 'pdf' | 'html',
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    console.log('PDF download requested:', { paymentReference, format });

    // Validate payment reference format
    if (!PDFSecurityService.validatePaymentReference(paymentReference)) {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_DOWNLOAD',
        'INVALID_PAYMENT_REFERENCE_FORMAT',
        `Invalid payment reference format: ${paymentReference}`,
        {
          paymentReference,
          ipAddress: PDFSecurityService['getClientIP'](request),
          userAgent: request.headers.get('user-agent')
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment reference format',
          code: 'INVALID_PAYMENT_REFERENCE'
        },
        { status: 400 }
      );
    }

    // Check rate limiting for this IP
    const clientIP = PDFSecurityService['getClientIP'](request);
    const rateLimitResult = PDFSecurityService['checkRateLimit'](clientIP);

    if (!rateLimitResult.allowed) {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_DOWNLOAD',
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded for IP: ${clientIP}`,
        {
          paymentReference,
          ipAddress: clientIP,
          userAgent: request.headers.get('user-agent'),
          resetIn: rateLimitResult.resetIn
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds`,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    // Get PDF data with error handling
    const pdfData = await PDFErrorHandlerService.executeWithRetry(
      () => PDFWhatsAppUtils.getPDFDataByReference(paymentReference!),
      PDFErrorHandlerService['DEFAULT_RETRY_CONFIG'],
      {
        paymentReference,
        userDetails: { name: 'Unknown', email: 'Unknown', phone: 'Unknown' },
        operationType: 'download',
        timestamp: new Date()
      },
      PDFErrorType.DATA_VALIDATION_FAILED
    );

    if (!pdfData) {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_DOWNLOAD',
        'PAYMENT_REFERENCE_NOT_FOUND',
        `No data found for payment reference: ${paymentReference}`,
        { paymentReference }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Payment reference not found',
          code: 'PAYMENT_REFERENCE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Generate PDF with performance optimization and error handling
    const pdfBuffer: any = await PDFErrorHandlerService.executeWithRetry(
      () => PDFPerformanceService.generateOptimizedPDF(pdfData, 7), // Higher priority for direct downloads
      PDFErrorHandlerService['PDF_GENERATION_RETRY_CONFIG'],
      {
        paymentReference,
        userDetails: pdfData.userDetails,
        operationType: pdfData.operationDetails.type,
        timestamp: new Date()
      },
      PDFErrorType.PDF_GENERATION_FAILED
    );

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

    // Update rate limit counter
    PDFSecurityService['updateRateLimit'](clientIP);

    // Log access attempt
    await PDFMonitoringService.recordError(
      'warning',
      'PDF_DOWNLOAD',
      'DOWNLOAD_SUCCESS',
      'PDF downloaded successfully via basic endpoint',
      {
        paymentReference,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent'),
        filename,
        fileSize: pdfBuffer.length
      }
    );

    // Return PDF with enhanced security headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        // Enhanced cache control
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'",
        // Custom tracking headers
        'X-Download-ID': crypto.randomUUID(),
        'X-Download-Time': new Date().toISOString(),
        'X-Security-Level': 'basic'
      }
    });

  } catch (error) {
    console.error('PDF download error:', error);

    // Record error for monitoring
    await PDFMonitoringService.recordError(
      'error',
      'PDF_DOWNLOAD',
      'DOWNLOAD_FAILED',
      `PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        paymentReference,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime
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
          error: 'Document not found. Please check your payment reference.',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentReference, regenerate = false } = body;

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

    // If regenerate is requested, clear any cached PDF and regenerate
    if (regenerate) {
      console.log('Regenerating PDF for:', paymentReference);

      // Get PDF data
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

      // Force regeneration by clearing cache (if implemented)
      // await PDFGeneratorService.clearCache(paymentReference);

      // Generate new PDF
      const pdfBuffer = await PDFGeneratorService.generatePDFBuffer(pdfData);

      return NextResponse.json({
        success: true,
        message: 'PDF regenerated successfully',
        downloadUrl: `/api/v1/pdf/download?ref=${encodeURIComponent(paymentReference)}&format=pdf`,
        size: pdfBuffer.length
      });
    }

    // Default behavior - just return download URL
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/v1/pdf/download?ref=${encodeURIComponent(paymentReference)}&format=pdf`
    });

  } catch (error) {
    console.error('PDF POST endpoint error:', error);
    return ErrorHandler.handleError(error);
  }
}

// Health check endpoint for PDF service
export async function HEAD(request: NextRequest) {
  try {
    // Simple health check - verify PDF generation capability
    const testData = {
      userDetails: {
        name: 'Health Check',
        email: 'healthcheck@test.com',
        phone: '+1234567890',
        registrationId: 'test'
      },
      operationDetails: {
        type: 'convention' as const,
        amount: 100,
        paymentReference: 'HEALTH_CHECK',
        date: new Date(),
        status: 'confirmed' as const,
        description: 'Health Check',
        additionalInfo: 'System health verification'
      },
      qrCodeData: JSON.stringify({ test: true })
    };

    // Try to generate a small test PDF
    await PDFGeneratorService.generatePDFHTML(testData);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Service-Status': 'healthy',
        'X-Service-Name': 'PDF-Generation-Service',
        'X-Timestamp': new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PDF service health check failed:', error);

    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Service-Status': 'unhealthy',
        'X-Service-Name': 'PDF-Generation-Service',
        'X-Error': error instanceof Error ? error.message : 'Unknown error',
        'X-Timestamp': new Date().toISOString()
      }
    });
  }
}