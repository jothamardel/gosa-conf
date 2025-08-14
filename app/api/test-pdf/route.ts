import { NextRequest, NextResponse } from "next/server";
import { WhatsAppPDFService, WhatsAppPDFData } from "@/lib/services/whatsapp-pdf.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create test data for PDF generation
    const testData: WhatsAppPDFData = {
      userDetails: {
        name: body.name || "Test User",
        email: body.email || "test@example.com",
        phone: body.phone || "+2347033680280",
        registrationId: "test-registration-id"
      },
      operationDetails: {
        type: body.type || "convention",
        amount: body.amount || 50000,
        paymentReference: body.reference || "test-ref-" + Date.now(),
        date: new Date(),
        status: "confirmed",
        description: "Test PDF generation",
        additionalInfo: JSON.stringify({ test: true })
      },
      qrCodeData: body.qrCodeData || "GOSA2025-TEST-" + Date.now()
    };

    console.log("Testing PDF generation with data:", testData);

    // Generate and send PDF
    const result = await WhatsAppPDFService.generateAndSendPDF(testData);

    return NextResponse.json({
      success: result.success,
      message: result.success ? "PDF generated and sent successfully" : "PDF generation failed",
      details: {
        pdfGenerated: result.pdfGenerated,
        whatsappSent: result.whatsappSent,
        fallbackUsed: result.fallbackUsed,
        messageId: result.messageId,
        error: result.error,
        errorType: result.errorType
      }
    });

  } catch (error: any) {
    console.error("Test PDF endpoint error:", error);
    return NextResponse.json({
      success: false,
      message: "Test failed",
      error: error.message
    }, { status: 500 });
  }
}