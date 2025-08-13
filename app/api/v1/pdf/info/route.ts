import { NextRequest, NextResponse } from 'next/server';
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';
import { PDFLoggerService } from '@/lib/services/pdf-logger.service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let paymentReference: string | null = null;
  let serviceType: string | null = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    paymentReference = searchParams.get('ref');
    const rawServiceType = searchParams.get('type');

    // Validate service type
    const validServiceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];
    serviceType = rawServiceType && validServiceTypes.includes(rawServiceType) ? rawServiceType : null;

    if (!paymentReference) {
      PDFLoggerService.logSecurityEvent(
        'invalid_reference',
        undefined,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || undefined
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

    console.log('PDF info requested:', { paymentReference, serviceType });

    // Log the request
    PDFLoggerService.logEvent({
      level: 'info',
      operation: 'download',
      action: 'info_request',
      paymentReference,
      serviceType: serviceType || 'unknown',
      success: true,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      }
    });

    let pdfInfo = null;

    if (serviceType) {
      // Get PDF info for specific service type
      pdfInfo = await PDFWhatsAppUtils.getPDFUrlFromDatabase(serviceType, paymentReference);
    } else {
      // Try all service types to find the PDF
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];

      for (const type of serviceTypes) {
        pdfInfo = await PDFWhatsAppUtils.getPDFUrlFromDatabase(type, paymentReference);
        if (pdfInfo && pdfInfo.pdfUrl) {
          serviceType = type;
          break;
        }
      }
    }

    if (!pdfInfo || !pdfInfo.pdfUrl) {
      const duration = Date.now() - startTime;

      PDFLoggerService.logEvent({
        level: 'warn',
        operation: 'download',
        action: 'info_not_found',
        paymentReference,
        serviceType: serviceType || 'unknown',
        duration,
        success: false,
        error: 'PDF not found'
      });

      return NextResponse.json(
        {
          success: false,
          error: 'PDF not found for this payment reference',
          code: 'PDF_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;

    // Log successful info retrieval
    PDFLoggerService.logEvent({
      level: 'info',
      operation: 'download',
      action: 'info_found',
      paymentReference,
      serviceType: serviceType || 'unknown',
      duration,
      success: true,
      metadata: {
        hasPdfUrl: !!pdfInfo.pdfUrl,
        pdfGeneratedAt: pdfInfo.pdfGeneratedAt?.toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentReference,
        serviceType,
        pdfUrl: pdfInfo.pdfUrl,
        pdfFilename: pdfInfo.pdfFilename,
        pdfGeneratedAt: pdfInfo.pdfGeneratedAt,
        isAvailable: true
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    PDFLoggerService.logEvent({
      level: 'error',
      operation: 'download',
      action: 'info_error',
      paymentReference: paymentReference || 'unknown',
      serviceType: serviceType || 'unknown',
      duration,
      success: false,
      error: errorMessage
    });

    console.error('PDF info API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}