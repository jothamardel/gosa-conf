import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  ConventionRegistration,
  DinnerReservation,
  Accommodation,
  ConventionBrochure,
  User
} from "@/lib/schema";
import { QRCodeService } from "@/lib/services/qr-code.service";


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

    console.log(`🔍 Looking for ${serviceType} record with payment reference: ${serviceId}`);

    try {
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

      console.log(`📋 Service record found:`, serviceRecord ? 'Yes' : 'No');
      if (serviceRecord) {
        console.log(`👤 User populated:`, serviceRecord.userId ? 'Yes' : 'No');
      }
    } catch (populateError) {
      console.error('❌ Error during populate operation:', populateError);
      throw new Error(`Database query failed: ${populateError instanceof Error ? populateError.message : 'Unknown error'}`);
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

    // If populate didn't work, try to fetch user separately
    if (!user || typeof user === 'string') {
      console.log('🔄 User not populated, fetching separately...');
      try {
        const userId = typeof user === 'string' ? user : serviceRecord.userId;
        user = await User.findById(userId);
        console.log('👤 User fetched separately:', user ? 'Success' : 'Failed');
      } catch (userFetchError) {
        console.error('❌ Failed to fetch user separately:', userFetchError);
      }
    }

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
    const baseUrl = process.env.GOSA_PUBLIC_URL || 'https://gosa.events';
    const qrData = `${baseUrl}/scan?id=${serviceRecord._id}`;
    newQRCode = await QRCodeService.generateQRCode(qrData);

    // Create structured QR code data for WhatsApp receipt (matches test pattern)
    const structuredQRData = JSON.stringify({
      type: serviceType,
      id: serviceRecord._id.toString(),
      paymentRef: serviceRecord.paymentReference
    });

    console.log('🔗 QR Code data (for scanning):', qrData);
    console.log('📋 Structured QR data (for receipt):', structuredQRData);
    console.log('📏 QR Code data length:', qrData.length, 'characters');
    console.log('📱 QR Code image generated:', newQRCode ? 'Success' : 'Failed');

    // Validate QR data length (QR codes have limits)
    if (qrData.length > 200) {
      console.warn('⚠️ QR Code data might be too long:', qrData.length, 'characters');
    }

    // Update the service record with new QR code URL (not the base64 image)
    switch (serviceType) {
      case 'convention':
        await ConventionRegistration.findByIdAndUpdate(serviceRecord._id, {
          qrCode: qrData  // Store the scannable URL, not the base64 image
        });
        break;
      case 'dinner':
        // Update the first QR code (main attendee)
        await DinnerReservation.findByIdAndUpdate(serviceRecord._id, {
          $set: { 'qrCodes.0.qrCode': qrData }  // Store the scannable URL
        });
        break;
      case 'brochure':
        await ConventionBrochure.findByIdAndUpdate(serviceRecord._id, {
          qrCode: qrData  // Store the scannable URL, not the base64 image
        });
        break;
      case 'accommodation':
        // Accommodation doesn't use QR codes, but we can still send receipt
        break;
    }

    // Format phone number for WhatsApp JID
    let formattedPhone = serviceRecord.paymentReference?.split("_")[1] || user.phoneNumber;

    // Remove any spaces, dashes, or other characters
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

    // Ensure it starts with + and country code
    if (!formattedPhone.startsWith('+')) {
      // If it starts with 0, replace with +234 (Nigeria)
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
      }
      // If it starts with 234, replace with +234
      else if (formattedPhone.startsWith('234')) {
        formattedPhone = '+' + formattedPhone;
      }
      // If it's just the local number (like 7033680280), add +234
      else if (formattedPhone.length === 10 && formattedPhone.match(/^[0-9]+$/)) {
        formattedPhone = '+234' + formattedPhone;
      }
      // Default fallback - add +234
      else {
        formattedPhone = '+234' + formattedPhone;
      }
    }

    // Prepare WhatsApp PDF data
    const status: 'confirmed' | 'pending' = (serviceRecord.confirm || serviceRecord.confirmed) ? 'confirmed' : 'pending';
    const whatsappData = {
      userDetails: {
        name: user.fullName,
        email: user.email,
        phone: formattedPhone,
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
      qrCodeData: qrData
    };

    // Send receipt via WhatsApp
    let whatsappResult = null;
    try {
      console.log('Attempting to send WhatsApp PDF with data:', {
        originalPhone: user.phoneNumber,
        userName: user.fullName,
        serviceType: serviceType,
        paymentReference: serviceRecord.paymentReference
      });

      // First test basic WhatsApp connectivity
      const { Wasender } = await import('@/lib/wasender-api');

      // Format phone number for WhatsApp JID
      let formattedPhone = serviceRecord?.paymentReference?.split("_")[1] || user.phoneNumber;

      // Remove any spaces, dashes, or other characters
      formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

      // Ensure it starts with + and country code
      if (!formattedPhone.startsWith('+')) {
        // If it starts with 0, replace with +234 (Nigeria)
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+234' + formattedPhone.substring(1);
        }
        // If it starts with 234, add +
        else if (formattedPhone.startsWith('234')) {
          formattedPhone = '+' + formattedPhone;
        }
        // If it's just the local number (like 7033680280), add +234
        else if (formattedPhone.length === 10 && formattedPhone.match(/^[0-9]+$/)) {
          formattedPhone = '+234' + formattedPhone;
        }
        // Default fallback - add +234
        else {
          formattedPhone = '+234' + formattedPhone;
        }
      }

      console.log('Original phone:', user.phoneNumber, 'Formatted phone:', formattedPhone);

      const testMessage = await Wasender.httpSenderMessage({
        to: formattedPhone,
        text: `🔄 QR Code Regenerated!\n\nHi ${user.fullName},\n\nYour QR code for ${serviceType} registration (${serviceRecord.paymentReference}) has been regenerated.\n\nYour new receipt with QR code will be sent shortly.\n\nThank you!`
      });



      console.log('Test WhatsApp message result:', testMessage);

      if (testMessage.success) {
        // If basic message works, generate proper receipt using the same format as payment success
        console.log('Test message sent successfully, now generating receipt image...');

        try {
          // Use WhatsApp Image Service to generate PNG receipt (same format as payment receipts)
          const { WhatsAppImageService } = await import('@/lib/services/whatsapp-image.service');

          console.log('📸 Generating image receipt with data:', {
            userName: whatsappData.userDetails.name,
            phone: whatsappData.userDetails.phone,
            serviceType: whatsappData.operationDetails.type,
            amount: whatsappData.operationDetails.amount
          });

          // Generate and send image receipt (PNG format) - same as successful payment receipts
          whatsappResult = await WhatsAppImageService.generateAndSendImage(whatsappData);
          console.log('📱 WhatsApp Image result:', whatsappResult);

        } catch (imageError) {
          console.error('Image receipt generation failed:', imageError);
          whatsappResult = {
            success: false,
            imageGenerated: false,
            whatsappSent: false,
            error: `Image receipt generation failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`
          };
        }
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
          phone: formattedPhone
        },
        qrCodeData: qrData,
        qrCodeImage: newQRCode,
        qrCodeStructuredData: structuredQRData,
        whatsappDelivery: whatsappResult ? {
          success: whatsappResult.success,
          imageGenerated: whatsappResult.imageGenerated,
          whatsappSent: whatsappResult.whatsappSent,
          messageId: whatsappResult.messageId,
          error: whatsappResult.error
        } : {
          success: false,
          error: "WhatsApp service unavailable"
        },
        message: `QR code regenerated successfully for ${serviceType} ${serviceRecord.paymentReference}${whatsappResult?.success ? ' and receipt image sent via WhatsApp' : ''}`
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
