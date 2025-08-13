import { NextRequest, NextResponse } from 'next/server';
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';
import { PDFLoggerService } from '@/lib/services/pdf-logger.service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { paymentReference, serviceType, phoneNumber, userName } = body;

    if (!paymentReference || !serviceType || !phoneNumber || !userName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: paymentReference, serviceType, phoneNumber, userName',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    console.log('PDF resend requested:', { paymentReference, serviceType, phoneNumber: phoneNumber.substring(0, 6) + '***' });

    // Log the resend request
    PDFLoggerService.logEvent({
      level: 'info',
      operation: 'delivery',
      action: 'resend_request',
      paymentReference,
      serviceType,
      success: true,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        requestedBy: 'api'
      }
    });

    // Check if PDF already exists in database
    const existingPDF = await PDFWhatsAppUtils.getPDFUrlFromDatabase(serviceType, paymentReference);

    if (existingPDF && existingPDF.pdfUrl) {
      // PDF exists, just resend via WhatsApp
      console.log('PDF exists, resending via WhatsApp:', existingPDF.pdfUrl);

      const message = `🎉 Hello ${userName}!

Here's your ${serviceType} confirmation document again.

📄 Your PDF is attached.

📋 **Details:**
• Reference: ${paymentReference}
• Status: Confirmed ✅

🏛️ **GOSA 2025 Convention**
"For Light and Truth"

Need help? Contact our support team.`;

      // Import Wasender dynamically to avoid circular dependencies
      const { Wasender } = await import('@/lib/wasender-api');

      const result = await Wasender.sendDocument({
        to: phoneNumber,
        text: message,
        documentUrl: existingPDF.pdfUrl,
        fileName: existingPDF.pdfFilename || `GOSA_2025_${serviceType}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      });

      const duration = Date.now() - startTime;

      if (result.success) {
        PDFLoggerService.logEvent({
          level: 'info',
          operation: 'delivery',
          action: 'resend_success',
          paymentReference,
          serviceType,
          duration,
          success: true,
          metadata: {
            existingPdf: true,
            messageId: result.data?.msgId
          }
        });

        return NextResponse.json({
          success: true,
          message: 'PDF resent successfully',
          data: {
            paymentReference,
            serviceType,
            pdfUrl: existingPDF.pdfUrl,
            resent: true,
            messageId: result.data?.msgId
          }
        });
      } else {
        // Fallback to text message with link
        const fallbackResult = await Wasender.httpSenderMessage({
          to: phoneNumber,
          text: `${message}\n\n📄 Download your PDF: ${existingPDF.pdfUrl}`
        });

        PDFLoggerService.logEvent({
          level: 'warn',
          operation: 'delivery',
          action: 'resend_fallback',
          paymentReference,
          serviceType,
          duration,
          success: fallbackResult.success,
          error: result.message,
          metadata: {
            existingPdf: true,
            fallbackUsed: true
          }
        });

        return NextResponse.json({
          success: fallbackResult.success,
          message: fallbackResult.success ? 'PDF link sent via text message' : 'Failed to resend PDF',
          data: {
            paymentReference,
            serviceType,
            pdfUrl: existingPDF.pdfUrl,
            fallbackUsed: true
          }
        });
      }
    } else {
      // PDF doesn't exist, need to regenerate
      console.log('PDF not found, regenerating...');

      // Get PDF data for the service
      const pdfData = await PDFWhatsAppUtils.getPDFDataByReference(paymentReference, serviceType as any);

      if (!pdfData) {
        const duration = Date.now() - startTime;

        PDFLoggerService.logEvent({
          level: 'error',
          operation: 'delivery',
          action: 'resend_no_data',
          paymentReference,
          serviceType,
          duration,
          success: false,
          error: 'Payment record not found'
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Payment record not found',
            code: 'PAYMENT_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Update user details with provided information
      pdfData.userDetails.name = userName;
      pdfData.userDetails.phone = phoneNumber;

      // Generate new PDF and send
      const result = await PDFWhatsAppUtils.sendServiceConfirmation(
        serviceType as any,
        pdfData.userDetails,
        {
          paymentReference,
          createdAt: pdfData.operationDetails.date,
          [serviceType === 'convention' ? 'confirm' : 'confirmed']: true,
          [serviceType === 'convention' ? 'amount' :
            serviceType === 'goodwill' ? 'donationAmount' :
              'totalAmount']: pdfData.operationDetails.amount
        },
        pdfData.qrCodeData
      );

      const duration = Date.now() - startTime;

      PDFLoggerService.logEvent({
        level: result.success ? 'info' : 'error',
        operation: 'delivery',
        action: result.success ? 'resend_regenerated' : 'resend_failed',
        paymentReference,
        serviceType,
        duration,
        success: result.success,
        error: result.error,
        metadata: {
          regenerated: true,
          pdfGenerated: result.pdfGenerated,
          whatsappSent: result.whatsappSent
        }
      });

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'PDF regenerated and sent successfully' : 'Failed to regenerate and send PDF',
        data: {
          paymentReference,
          serviceType,
          pdfGenerated: result.pdfGenerated,
          whatsappSent: result.whatsappSent,
          regenerated: true
        },
        error: result.error
      });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    PDFLoggerService.logEvent({
      level: 'error',
      operation: 'delivery',
      action: 'resend_error',
      paymentReference: 'unknown',
      serviceType: 'unknown',
      duration,
      success: false,
      error: errorMessage
    });

    console.error('PDF resend API error:', error);

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