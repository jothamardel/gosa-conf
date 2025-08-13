import { NextRequest, NextResponse } from 'next/server';
import { PDFGeneratorService, PDFGeneratorService as PDFData } from '@/lib/services/pdf-generator.service';

export async function GET(request: NextRequest) {
  try {
    // Create sample data for testing
    const sampleData: PDFData = {
      userDetails: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+234 123 456 7890',
        registrationId: 'GOSA2025-001'
      },
      operationDetails: {
        type: 'convention',
        amount: 75000,
        paymentReference: 'PAY_123456789_01234567890',
        date: new Date(),
        status: 'confirmed',
        description: 'Convention registration with Standard accommodation and dinner package',
        additionalInfo: 'Accommodation: Standard (2 guests) | Dinner: 2 guests | Welcome package included'
      },
      qrCodeData: 'GOSA2025-CONV-001-JOHN-DOE-CONFIRMED'
    };

    // Generate PDF HTML
    const pdfHTML = await PDFGeneratorService.generatePDFHTML(sampleData);

    return new NextResponse(pdfHTML, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('PDF test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate test PDF'
      },
      { status: 500 }
    );
  }
}