import { NextRequest, NextResponse } from "next/server";
import { ImageGeneratorService } from "@/lib/services/image-generator.service";
import { WhatsAppImageData } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create test data for image generation
    const testData: WhatsAppImageData = {
      userDetails: {
        name: body.name || "Test User",
        email: body.email || "test@example.com",
        phone: body.phone || "+2349035634935",
        registrationId: "test123"
      },
      operationDetails: {
        type: body.type || 'convention',
        amount: body.amount || 50000,
        paymentReference: body.reference || 'test_ref_123',
        date: new Date(),
        status: 'confirmed' as const,
        description: 'Test image generation',
        additionalInfo: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        })
      },
      qrCodeData: body.qrCode || 'GOSA2025-TEST-123'
    };

    console.log('[TEST-IMAGE] Generating test image with data:', {
      user: testData.userDetails.name,
      type: testData.operationDetails.type,
      reference: testData.operationDetails.paymentReference
    });

    // Generate image buffer
    const imageBuffer = await ImageGeneratorService.generateImageBuffer(testData);

    console.log('[TEST-IMAGE] Generated image buffer:', {
      size: imageBuffer.length,
      type: imageBuffer.toString('utf8', 0, 10).includes('<svg') ? 'SVG' : 'Binary'
    });

    // Try to upload to blob
    let blobUrl = null;
    try {
      blobUrl = await ImageGeneratorService.generateAndUploadToBlob(testData);
      console.log('[TEST-IMAGE] Successfully uploaded to blob:', blobUrl);
    } catch (blobError) {
      console.error('[TEST-IMAGE] Blob upload failed:', blobError);
    }

    return NextResponse.json({
      success: true,
      message: "Test image generated successfully",
      data: {
        imageSize: imageBuffer.length,
        imageType: imageBuffer.toString('utf8', 0, 10).includes('<svg') ? 'SVG' : 'Binary',
        blobUrl,
        testData: {
          user: testData.userDetails.name,
          type: testData.operationDetails.type,
          amount: testData.operationDetails.amount,
          reference: testData.operationDetails.paymentReference
        }
      }
    });

  } catch (error: any) {
    console.error('[TEST-IMAGE] Test failed:', error);

    return NextResponse.json({
      success: false,
      message: "Test image generation failed",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Test Image Generation API",
    usage: "POST with optional body: { name, email, phone, type, amount, reference, qrCode }",
    example: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+2349035634935",
      type: "convention",
      amount: 50000,
      reference: "test_ref_123",
      qrCode: "GOSA2025-TEST-123"
    }
  });
}