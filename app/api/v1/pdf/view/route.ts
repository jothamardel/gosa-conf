import { NextRequest, NextResponse } from "next/server";
import {
  PDFGeneratorService,
  PDFGeneratorService as PDFData,
} from "@/lib/services/pdf-generator.service";
import { ConventionRegistration } from "@/lib/schema/convention.schema";
import { DinnerReservation } from "@/lib/schema/dinner.schema";
import { Accommodation } from "@/lib/schema/accommodation.schema";
import { ConventionBrochure } from "@/lib/schema/brochure.schema";
import { GoodwillMessage } from "@/lib/schema/goodwill.schema";
import { Donation } from "@/lib/schema/donation.schema";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const paymentReference = searchParams.get("ref");

    if (!paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required",
        },
        { status: 400 },
      );
    }

    // Try to find the record in different collections
    let record: any = null;
    let operationType: string = "";
    let qrCodeData: string = "";

    // Check convention registrations
    try {
      record = await ConventionRegistration.findOne({
        paymentReference,
      }).populate("userId", "name email phoneNumber");
      if (record) {
        operationType = "convention";
        qrCodeData =
          record.qrCodes?.[0]?.qrCode || `GOSA2025-CONV-${record._id}`;
      }
    } catch (error) {
      console.warn("Convention registration not found");
    }

    // Check dinner reservations
    if (!record) {
      try {
        record = await DinnerReservation.findOne({ paymentReference }).populate(
          "userId",
          "name email phoneNumber",
        );
        if (record) {
          operationType = "dinner";
          qrCodeData =
            record.qrCodes?.[0]?.qrCode || `GOSA2025-DINNER-${record._id}`;
        }
      } catch (error) {
        console.warn("Dinner reservation not found");
      }
    }

    // Check accommodations
    if (!record) {
      try {
        record = await Accommodation.findOne({ paymentReference }).populate(
          "userId",
          "name email phoneNumber",
        );
        if (record) {
          operationType = "accommodation";
          qrCodeData =
            record.qrCodes?.[0]?.qrCode || `GOSA2025-ACCOM-${record._id}`;
        }
      } catch (error) {
        console.warn("Accommodation not found");
      }
    }

    // Check brochures
    if (!record) {
      try {
        record = await ConventionBrochure.findOne({
          paymentReference,
        }).populate("userId", "name email phoneNumber");
        if (record) {
          operationType = "brochure";
          qrCodeData =
            record.qrCodes?.[0]?.qrCode || `GOSA2025-BROCHURE-${record._id}`;
        }
      } catch (error) {
        console.warn("Brochure not found");
      }
    }

    // Check goodwill messages
    if (!record) {
      try {
        record = await GoodwillMessage.findOne({ paymentReference }).populate(
          "userId",
          "name email phoneNumber",
        );
        if (record) {
          operationType = "goodwill";
          qrCodeData = `GOSA2025-GOODWILL-${record._id}`;
        }
      } catch (error) {
        console.warn("Goodwill message not found");
      }
    }

    // Check donations
    if (!record) {
      try {
        record = await Donation.findOne({ paymentReference }).populate(
          "userId",
          "name email phoneNumber",
        );
        if (record) {
          operationType = "donation";
          qrCodeData = `GOSA2025-DONATION-${record._id}`;
        }
      } catch (error) {
        console.warn("Donation not found");
      }
    }

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "Record not found for the provided payment reference",
        },
        { status: 404 },
      );
    }

    // Create PDF data
    const pdfData: PDFData = {
      userDetails: {
        name: record.userId?.name || record.fullName || "Unknown User",
        email: record.userId?.email || record.email || "unknown@email.com",
        phone: record.userId?.phoneNumber || record.phoneNumber || "N/A",
        registrationId: record._id.toString(),
      },
      operationDetails: {
        type: operationType as any,
        amount:
          record.totalAmount || record.donationAmount || record.amount || 0,
        paymentReference: record.paymentReference,
        date: record.createdAt,
        status: record.confirmed ? "confirmed" : "pending",
        description: getOperationDescription(operationType, record),
        additionalInfo: getAdditionalInfo(operationType, record),
      },
      qrCodeData,
    };

    // Generate PDF HTML
    const pdfHTML = await PDFGeneratorService.generatePDFHTML(pdfData);

    return new NextResponse(pdfHTML, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("PDF view error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate PDF view",
      },
      { status: 500 },
    );
  }
}

function getOperationDescription(type: string, record: any): string {
  switch (type) {
    case "convention":
      return `Convention registration${record.accommodationType ? " with accommodation" : ""}`;
    case "dinner":
      return `Dinner reservation for ${record.numberOfGuests || 1} guests`;
    case "accommodation":
      return `${record.accommodationType || "Standard"} accommodation booking`;
    case "brochure":
      return `Convention brochure purchase (${record.quantity || 1} copies)`;
    case "goodwill":
      return "Goodwill message with donation";
    case "donation":
      return "Donation to GOSA Convention";
    default:
      return "GOSA Convention service";
  }
}

function getAdditionalInfo(type: string, record: any): string | undefined {
  switch (type) {
    case "convention":
      return record.accommodationType
        ? `Accommodation: ${record.accommodationType} (${record.numberOfGuests || 1} guests)`
        : undefined;
    case "dinner":
      return `Date: ${record.dinnerDate || "TBD"} | Guests: ${record.numberOfGuests || 1}`;
    case "accommodation":
      return `Check-in: ${record.checkInDate || "TBD"} | Check-out: ${record.checkOutDate || "TBD"} | Guests: ${record.numberOfGuests || 1}`;
    case "brochure":
      return `Delivery Address: ${record.deliveryAddress || "Not specified"}`;
    case "goodwill":
      return record.message
        ? `Message: "${record.message.substring(0, 100)}${record.message.length > 100 ? "..." : ""}"`
        : "Donation only";
    case "donation":
      return record.purpose ? `Purpose: ${record.purpose}` : undefined;
    default:
      return undefined;
  }
}
