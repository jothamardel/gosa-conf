import { NextRequest, NextResponse } from "next/server";
import { WhatsAppImageService } from "@/lib/services/whatsapp-image.service";
import { WhatsAppImageData } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create test data for image generation
    const testData: WhatsAppImageData = {
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
        description: "Test image generation",
        additionalInfo: JSON.stringify({ test: true })
      },
      qrCodeData: body.qrCodeData || "GOSA2025-TEST-" + Date.now()
    };

    console.log("Testing image generation with data:", testData);

    // Generate and send image
    const result = await WhatsAppImageService.generateAndSendImage(testData);

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Image generated and sent successfully" : "Image generation failed",
      details: {
        imageGenerated: result.imageGenerated,
        whatsappSent: result.whatsappSent,
        fallbackUsed: result.fallbackUsed,
        messageId: result.messageId,
        error: result.error,
        errorType: result.errorType
      }
    });

  } catch (error: any) {
    console.error("Test image endpoint error:", error);
    return NextResponse.json({
      success: false,
      message: "Test failed",
      error: error.message
    }, { status: 500 });
  }
}