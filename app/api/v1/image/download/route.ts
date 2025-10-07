import { NextRequest, NextResponse } from "next/server";
import { ImageGeneratorService } from "@/lib/services/image-generator.service";
import { ImageData } from "@/lib/types";
import { ConventionRegistration } from "@/lib/schema/convention.schema";
import { DinnerReservation } from "@/lib/schema/dinner.schema";
import { Accommodation } from "@/lib/schema/accommodation.schema";
import { ConventionBrochure } from "@/lib/schema/brochure.schema";
import { GoodwillMessage } from "@/lib/schema/goodwill.schema";
import { Donation } from "@/lib/schema/donation.schema";
import connectDB from "@/lib/mongodb";

/**
 * Detect content type from buffer
 */
function detectImageContentType(buffer: Buffer): string {
  // Check buffer magic bytes for PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // Check for SVG content
  const bufferStart = buffer.toString("utf8", 0, Math.min(100, buffer.length));
  if (bufferStart.includes("<svg") || bufferStart.includes("<?xml")) {
    return "image/svg+xml";
  }

  // Default to PNG
  return "image/png";
}

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentReference = searchParams.get("ref");
    const format = searchParams.get("format") || "png";

    if (!paymentReference) {
      return NextResponse.json(
        { success: false, error: "Payment reference is required" },
        { status: 400 },
      );
    }

    // Connect to database
    await connectDB();

    // Find the record by payment reference
    let record: any = null;
    let serviceType: string = "";

    // Search across all collections
    const collections = [
      { model: ConventionRegistration, type: "convention" },
      { model: DinnerReservation, type: "dinner" },
      { model: Accommodation, type: "accommodation" },
      { model: ConventionBrochure, type: "brochure" },
      { model: GoodwillMessage, type: "goodwill" },
      { model: Donation, type: "donation" },
    ];

    for (const { model, type } of collections) {
      try {
        const found = await model
          .findOne({
            paymentReference: { $regex: `^${paymentReference}` },
          })
          .populate("userId");

        if (found) {
          record = found;
          serviceType = type;
          break;
        }
      } catch (error) {
        console.error(`Error searching ${type}:`, error);
      }
    }

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Payment record not found" },
        { status: 404 },
      );
    }

    // Prepare image data
    const userDetails = {
      name: record.userId?.fullName || record.fullName || "Unknown User",
      email: record.userId?.email || record.email || "unknown@email.com",
      phone: record.userId?.phoneNumber || "Unknown Phone",
      registrationId: record._id?.toString(),
    };

    // Generate QR code data
    let qrCodeData = record.qrCodes?.[0]?.qrCode;
    if (!qrCodeData) {
      const baseUrl = process.env.GOSA_PUBLIC_URL || 'https://gosa.events';
      qrCodeData = `${baseUrl}/scan?id=${record._id}`;
    }

    const imageData: ImageData = {
      userDetails,
      operationDetails: {
        type: serviceType as
          | "convention"
          | "dinner"
          | "accommodation"
          | "brochure"
          | "goodwill"
          | "donation",
        amount:
          record.totalAmount || record.amount || record.donationAmount || 0,
        paymentReference: record.paymentReference,
        date: record.createdAt || new Date(),
        status: "confirmed",
        description: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} confirmation`,
        additionalInfo: JSON.stringify({
          serviceType,
          recordId: record._id,
          confirmed: true,
        }),
      },
      qrCodeData,
    };

    if (format === "png" || format === "image") {
      // Generate and return image (PNG or SVG depending on what's available)
      const imageBuffer: any =
        await ImageGeneratorService.generateImageBuffer(imageData);

      // Detect content type from buffer
      const contentType = detectImageContentType(imageBuffer);
      const extension = contentType === "image/svg+xml" ? "svg" : "png";

      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="gosa-2025-${serviceType}-${userDetails.name.replace(/[^a-z0-9]/gi, "-")}.${extension}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      // Return HTML preview
      const htmlContent: any =
        await ImageGeneratorService.generateImageBufferFallback(imageData);

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (error: any) {
    console.error("Image download error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate image. Please try again later.",
      },
      { status: 500 },
    );
  }
}
