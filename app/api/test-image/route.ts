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

    // Detect image type more accurately
    const isPNG = imageBuffer.length >= 8 &&
      imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 &&
      imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;

    const isSVG = imageBuffer.toString('utf8', 0, Math.min(100, imageBuffer.length)).includes('<svg');

    const imageType = isPNG ? 'PNG' : isSVG ? 'SVG' : 'Unknown';

    console.log('[TEST-IMAGE] Generated image buffer:', {
      size: imageBuffer.length,
      type: imageType,
      isPNG,
      isSVG
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
        imageType,
        isPNG,
        isSVG,
        blobUrl,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL,
          hasSharp: (() => {
            try {
              require('sharp');
              return true;
            } catch {
              return false;
            }
          })(),
          hasCanvas: (() => {
            try {
              require('canvas');
              return true;
            } catch {
              return false;
            }
          })(),
          hasQRCode: (() => {
            try {
              require('qrcode');
              return true;
            } catch {
              return false;
            }
          })(),
          hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN
        },
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