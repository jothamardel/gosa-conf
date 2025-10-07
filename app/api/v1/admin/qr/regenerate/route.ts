import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ConventionRegistration } from "@/lib/schema/convention.schema";
import { DinnerReservation } from "@/lib/schema/dinner.schema";
import { Accommodation } from "@/lib/schema/accommodation.schema";
import { ConventionBrochure } from "@/lib/schema/brochure.schema";
import { QRCodeService } from "@/lib/services/qr-code.service";
import { WhatsAppPDFService } from "@/lib/services/whatsapp-pdf.service";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { serviceType, serviceId, adminId, reason } = await request.json();

    // Validate required fields
    if (!serviceType || !serviceId) {
      return NextResponse.json(
        {
          success: false,
          error: "serviceType and serviceId are required",
        },
        { status: 400 },
      );
    }

    // Validate service type
    const validServiceTypes = [
      "convention",
      "dinner",
      "accommodation",
      "brochure",
    ];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid service type. Must be one of: convention, dinner, accommodation, brochure",
        },
        { status: 400 },
      );
    }

    // Find service record by paymentReference (serviceId is actually paymentReference)
    let serviceRecord: any = null;
    let user: any = null;

    switch (serviceType) {
      case 'convention':
        serviceRecord = await ConventionRegistration.findOne({
          paymentReference: serviceId
        }).populate('userId');
        break;
      case 'dinner':
        serviceRecord = await DinnerReservation.findOne({
          paymentReference: serviceId
        }).populate('userId');
        break;
      case 'accommodation':
        serviceRecord = await Accommodation.findOne({
          paymentReference: serviceId
        }).populate('userId');
        break;
      case 'brochure':
        serviceRecord = await ConventionBrochure.findOne({
          paymentReference: serviceId
        }).populate('userId');
        break;
    }

    if (!serviceRecord) {
      return NextResponse.json(
        {
          success: false,
          error: `${serviceType} record not found with payment reference: ${serviceId}`,
        },
        { status: 404 },
      );
    }

    user = serviceRecord.userId;
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found for this service record",
        },
        { status: 404 },
      );
    }

    // Generate new QR code for the service
    let newQRCode: string;
    const qrData = `https://gosa.events/scan?id=${serviceRecord._id}`;
    newQRCode = await QRCodeService.generateQRCode(qrData);

    // Update the service record with new QR code
    switch (serviceType) {
      case 'convention':
        await ConventionRegistration.findByIdAndUpdate(serviceRecord._id, {
          qrCode: newQRCode
        });
        break;
      case 'dinner':
        // Update the first QR code (main attendee)
        await DinnerReservation.findByIdAndUpdate(serviceRecord._id, {
          $set: { 'qrCodes.0.qrCode': newQRCode }
        });
        break;
      case 'brochure':
        await ConventionBrochure.findByIdAndUpdate(serviceRecord._id, {
          qrCode: newQRCode
        });
        break;
      case 'accommodation':
        // Accommodation doesn't use QR codes, but we can still send receipt
        break;
    }

    // Prepare WhatsApp PDF data
    const status: 'confirmed' | 'pending' = (serviceRecord.confirm || serviceRecord.confirmed) ? 'confirmed' : 'pending';
    const whatsappData = {
      userDetails: {
        name: user.fullName,
        email: user.email,
        phone: user.phoneNumber,
        registrationId: serviceRecord._id.toString()
      },
      operationDetails: {
        type: serviceType as 'convention' | 'dinner' | 'accommodation' | 'brochure',
        amount: serviceRecord.amount || serviceRecord.totalAmount || 0,
        paymentReference: serviceRecord.paymentReference,
        date: serviceRecord.createdAt || new Date(),
        status: status,
        description: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Registration`,
        additionalInfo: reason ? `QR Code regenerated: ${reason}` : 'QR Code regenerated'
      },
      qrCodeData: newQRCode
    };

    // Send receipt via WhatsApp
    let whatsappResult = null;
    try {
      console.log('Attempting to send WhatsApp PDF with data:', {
        userPhone: user.phoneNumber,
        userName: user.fullName,
        serviceType: serviceType,
        paymentReference: serviceRecord.paymentReference
      });

      // First test basic WhatsApp connectivity
      const { Wasender } = await import('@/lib/wasender-api');

      const testMessage = await Wasender.httpSenderMessage({
        to: user.phoneNumber,
        text: `🔄 QR Code Regenerated!\n\nHi ${user.fullName},\n\nYour QR code for ${serviceType} registration (${serviceRecord.paymentReference}) has been regenerated.\n\nYour new receipt with QR code will be sent shortly.\n\nThank you!`
      });

      console.log('Test WhatsApp message result:', testMessage);

      if (testMessage.success) {
        // If basic message works, try PDF
        whatsappResult = await WhatsAppPDFService.generateAndSendPDF(whatsappData);
        console.log('WhatsApp PDF result:', whatsappResult);
      } else {
        whatsappResult = {
          success: false,
          pdfGenerated: false,
          whatsappSent: false,
          error: `WhatsApp connection failed: ${testMessage.error}`
        };
      }
    } catch (whatsappError) {
      console.error('WhatsApp delivery failed with error:', whatsappError);
      whatsappResult = {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: `WhatsApp service error: ${whatsappError instanceof Error ? whatsappError.message : 'Unknown error'}`
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        serviceRecord: {
          id: serviceRecord._id,
          paymentReference: serviceRecord.paymentReference,
          serviceType: serviceType
        },
        user: {
          name: user.fullName,
          email: user.email,
          phone: user.phoneNumber
        },
        newQRCode: newQRCode,
        whatsappDelivery: whatsappResult ? {
          success: whatsappResult.success,
          pdfGenerated: whatsappResult.pdfGenerated,
          whatsappSent: whatsappResult.whatsappSent,
          messageId: whatsappResult.messageId,
          error: whatsappResult.error
        } : {
          success: false,
          error: "WhatsApp service unavailable"
        },
        message: `QR code regenerated successfully for ${serviceType} ${serviceRecord.paymentReference}${whatsappResult?.success ? ' and receipt sent via WhatsApp' : ''}`
      },
    });
  } catch (error: any) {
    console.error("QR code regeneration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to regenerate QR code",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (userId) {
      // Get regeneration history for specific user
      const history = await QRCodeService.getRegenerationHistory(userId);

      return NextResponse.json({
        success: true,
        data: { history },
      });
    } else {
      // Get all regeneration history (admin view)
      const result = await QRCodeService.getAllRegenerationHistory(page, limit);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  } catch (error: any) {
    console.error("Get QR regeneration history error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve regeneration history",
      },
      { status: 500 },
    );
  }
}
