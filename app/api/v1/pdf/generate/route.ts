import { NextRequest, NextResponse } from 'next/server';
import { PDFGeneratorService, PDFData } from '@/lib/services/pdf-generator.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userDetails || !body.operationDetails || !body.qrCodeData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userDetails, operationDetails, and qrCodeData are required'
        },
        { status: 400 }
      );
    }

    // Create PDF data
    const pdfData: PDFData = {
      userDetails: {
        name: body.userDetails.name,
        email: body.userDetails.email,
        phone: body.userDetails.phone,
        registrationId: body.userDetails.registrationId
      },
      operationDetails: {
        type: body.operationDetails.type,
        amount: body.operationDetails.amount,
        paymentReference: body.operationDetails.paymentReference,
        date: new Date(body.operationDetails.date),
        status: body.operationDetails.status,
        description: body.operationDetails.description,
        additionalInfo: body.operationDetails.additionalInfo
      },
      qrCodeData: body.qrCodeData
    };

    // Generate PDF HTML
    const pdfHTML = await PDFGeneratorService.generatePDFHTML(pdfData);

    // Generate filename
    const filename = PDFGeneratorService.generateFilename(
      pdfData.userDetails,
      pdfData.operationDetails.type
    );

    return NextResponse.json({
      success: true,
      data: {
        html: pdfHTML,
        filename,
        userDetails: pdfData.userDetails,
        operationType: pdfData.operationDetails.type
      }
    });

  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate PDF. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Example usage endpoint - shows how to use the PDF generator
    const exampleData: PDFData = {
      userDetails: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+234 123 456 7890',
        registrationId: 'GOSA2025-001'
      },
      operationDetails: {
        type: 'convention',
        amount: 50000,
        paymentReference: 'PAY_123456789',
        date: new Date(),
        status: 'confirmed',
        description: 'Convention registration with accommodation and dinner package',
        additionalInfo: 'Includes welcome package and conference materials'
      },
      qrCodeData: 'GOSA2025-CONV-001-JOHN-DOE'
    };

    const pdfHTML = await PDFGeneratorService.generatePDFHTML(exampleData);

    return new NextResponse(pdfHTML, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('PDF preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate PDF preview'
      },
      { status: 500 }
    );
  }
}