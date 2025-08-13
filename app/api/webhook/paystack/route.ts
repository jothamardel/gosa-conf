import { generateQrCode } from "@/lib/utils";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { DinnerUtils } from "@/lib/utils/dinner.utils";
import { AccommodationUtils } from "@/lib/utils/accommodation.utils";
import { BrochureUtils } from "@/lib/utils/brochure.utils";
import { GoodwillUtils } from "@/lib/utils/goodwill.utils";
import { DonationUtils } from "@/lib/utils/donation.utils";
import { PDFWhatsAppUtils } from "@/lib/utils/pdf-whatsapp.utils";
import { Wasender } from "@/lib/wasender-api";
import { NextRequest, NextResponse } from "next/server";

// Payment type detection from reference patterns
// function determinePaymentType(reference: string): string {
//   if (reference.includes('DINNER_')) return 'dinner';
//   if (reference.includes('ACCOM_')) return 'accommodation';
//   if (reference.includes('BROCH_')) return 'brochure';
//   if (reference.includes('GOOD_')) return 'goodwill';
//   if (reference.includes('DONA_')) return 'donation';
//   return 'convention'; // Default to convention registration
// }

async function determinePaymentTypeByReference(reference: string): Promise<any> {
  console.log(`Running parallel queries for reference: ${reference}`);

  // Execute all queries simultaneously
  const [
    dinnerResult,
    accommodationResult,
    brochureResult,
    goodwillResult,
    donationResult,
    conventionResult
  ] = await Promise.allSettled([
    DinnerUtils.findAndConfirmMany(reference),
    AccommodationUtils.findAndConfirmMany(reference),
    BrochureUtils.findAndConfirmMany(reference),
    GoodwillUtils.findAndConfirmMany(reference),
    DonationUtils.findAndConfirmMany(reference),
    ConventionUtils.findAndConfirmMany(reference)
  ]);


  console.log({
    dinnerResult,
    accommodationResult,
    brochureResult,
    goodwillResult,
    donationResult,
    conventionResult
  })

  // Check results and return the first match found
  if (dinnerResult.status === 'fulfilled' && dinnerResult.value.modifiedCount) {
    const data = await DinnerUtils.findMany(reference)
    return data;
  }

  if (accommodationResult.status === 'fulfilled' && accommodationResult.value.modifiedCount) {
    const data = await AccommodationUtils.findMany(reference)
    return data;
  }

  if (brochureResult.status === 'fulfilled' && brochureResult.value.modifiedCount) {
    const data = await BrochureUtils.findMany(reference)
    return data;
  }

  if (goodwillResult.status === 'fulfilled' && goodwillResult.value.modifiedCount) {
    const data = await GoodwillUtils.findMany(reference)
    return data;
  }

  if (donationResult.status === 'fulfilled' && donationResult.value.modifiedCount) {
    const data = await DonationUtils.findMany(reference)
    return data;
  }

  if (conventionResult.status === 'fulfilled' && conventionResult.value.modifiedCount) {
    const data = await ConventionUtils.findMany(reference)
    return data;
  }

  // console.log('Reference not found in any collection');
  return null;
}
async function findAndConfirmPaymentByReference(reference: string): Promise<{
  serviceType: string;
  record: any;
  success: boolean;
} | null> {
  console.log(`Searching for payment reference: ${reference}`);

  // Since Paystack sends us "xp0hxfljal" but we store "xp0hxfljal_09065577709",
  // we need to search using a partial match (startsWith pattern)

  try {
    // Try dinner reservations
    const dinnerRecord = await DinnerUtils.findByReferencePattern(reference);
    if (dinnerRecord) {
      console.log(`Found dinner reservation with reference pattern: ${reference}`);
      const confirmedRecord = await DinnerUtils.confirmReservation(dinnerRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: 'dinner',
          record: confirmedRecord,
          success: true
        };
      }
    }

    // Try accommodation bookings
    const accommodationRecord = await AccommodationUtils.findByReferencePattern(reference);
    if (accommodationRecord) {
      console.log(`Found accommodation booking with reference pattern: ${reference}`);
      const confirmedRecord = await AccommodationUtils.confirmBooking(accommodationRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: 'accommodation',
          record: confirmedRecord,
          success: true
        };
      }
    }

    // Try brochure orders
    const brochureRecord = await BrochureUtils.findByReferencePattern(reference);
    if (brochureRecord) {
      console.log(`Found brochure order with reference pattern: ${reference}`);
      const confirmedRecord = await BrochureUtils.confirmOrder(brochureRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: 'brochure',
          record: confirmedRecord,
          success: true
        };
      }
    }

    // Try goodwill messages
    const goodwillRecord = await GoodwillUtils.findByReferencePattern(reference);
    if (goodwillRecord) {
      console.log(`Found goodwill message with reference pattern: ${reference}`);
      const confirmedRecord = await GoodwillUtils.confirmMessage(goodwillRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: 'goodwill',
          record: confirmedRecord,
          success: true
        };
      }
    }

    // Try donations
    const donationRecord = await DonationUtils.findByReferencePattern(reference);
    if (donationRecord) {
      console.log(`Found donation with reference pattern: ${reference}`);
      const confirmedRecord = await DonationUtils.confirmDonation(donationRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: 'donation',
          record: confirmedRecord,
          success: true
        };
      }
    }

    // Try convention registrations
    const conventionRecords = await ConventionUtils.findByReferencePattern(reference);
    if (conventionRecords && conventionRecords.length > 0) {
      console.log(`Found convention registration(s) with reference pattern: ${reference}`);
      // For convention, we need to handle multiple records
      await ConventionUtils.confirmByReferencePattern(reference);
      const confirmedRecords = await ConventionUtils.findByReferencePattern(reference);
      if (confirmedRecords && confirmedRecords.length > 0) {
        return {
          serviceType: 'convention',
          record: confirmedRecords,
          success: true
        };
      }
    }

    console.log(`No records found for reference pattern: ${reference}`);
    return null;

  } catch (error: any) {
    console.error(`Error searching for payment reference ${reference}:`, error);
    return null;
  }
}

// Helper function to check if a query result contains valid data
function hasValidResult(result: any): boolean {
  if (!result) return false;
  if (Array.isArray(result)) return result.length > 0;
  return true;
}

// Enhanced notification service for different payment types with PDF generation
async function sendServiceNotification(serviceType: string, record: any): Promise<any> {
  let internationalPhone: string = '';

  try {
    // Only send PDF for confirmed payments
    const isConfirmed = record.confirmed || record.confirm || false;
    if (!isConfirmed) {
      console.log(`Skipping PDF delivery for unconfirmed ${serviceType} payment:`, record.paymentReference);
      return {
        success: false,
        serviceType,
        error: 'Payment not confirmed',
        skipped: true
      };
    }

    const phoneNumber = record.userId?.phoneNumber || record.paymentReference?.split('_')[1];

    if (!phoneNumber) {
      throw new Error('No phone number found for notification');
    }

    internationalPhone = convertToInternationalFormat(phoneNumber);
    console.log({ internationalPhone });

    // Prepare user details for PDF generation
    const userDetails = {
      name: record.userId?.fullName || record.fullName || 'Unknown User',
      email: record.userId?.email || record.email || 'unknown@email.com',
      phone: internationalPhone,
      registrationId: record._id?.toString()
    };

    // Generate QR code data - use existing QR codes if available
    let qrCodeData = record.qrCodes?.[0]?.qrCode;

    // If no QR code exists, generate a basic one
    if (!qrCodeData) {
      qrCodeData = `GOSA2025-${serviceType.toUpperCase()}-${record._id}`;
    }

    let pdfResult: any = null;

    console.log(`Generating PDF for ${serviceType} payment:`, record.paymentReference);

    // Generate and send PDF based on service type (using existing methods for now)
    switch (serviceType) {
      case 'dinner':
        pdfResult = await PDFWhatsAppUtils.sendDinnerConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      case 'accommodation':
        pdfResult = await PDFWhatsAppUtils.sendAccommodationConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      case 'brochure':
        pdfResult = await PDFWhatsAppUtils.sendBrochureConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      case 'goodwill':
        pdfResult = await PDFWhatsAppUtils.sendGoodwillConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      case 'donation':
        pdfResult = await PDFWhatsAppUtils.sendDonationConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      case 'convention':
        pdfResult = await PDFWhatsAppUtils.sendConventionConfirmation(
          userDetails,
          record,
          qrCodeData
        );
        break;

      default:
        console.warn(`Unknown service type for PDF delivery: ${serviceType}`);
        return {
          success: false,
          serviceType,
          error: `Unsupported service type: ${serviceType}`
        };
    }

    const result = {
      success: pdfResult?.success || false,
      serviceType,
      phoneNumber: internationalPhone,
      pdfGenerated: pdfResult?.pdfGenerated || false,
      whatsappSent: pdfResult?.whatsappSent || false,
      fallbackUsed: pdfResult?.fallbackUsed || false,

      error: pdfResult?.error
    };

    console.log(`PDF delivery result for ${serviceType}:`, result);
    return result;

  } catch (error: any) {
    console.error(`Error sending ${serviceType} notification with PDF:`, error);

    // Record error for monitoring
    try {
      const { PDFMonitoringService } = await import('@/lib/services/pdf-monitoring.service');
      await PDFMonitoringService.recordError(
        'error',
        'WEBHOOK_PDF_DELIVERY',
        'PDF_DELIVERY_EXCEPTION',
        `PDF delivery failed in webhook for ${serviceType}: ${error.message}`,
        {
          serviceType,
          paymentReference: record?.paymentReference,
          userPhone: internationalPhone,
          error: error.message,
          stack: error.stack
        },
        true // Requires immediate action
      );
    } catch (monitoringError) {
      console.error('Failed to record webhook PDF error:', monitoringError);
    }

    return {
      success: false,
      serviceType,
      error: error.message,
    };
  }
}

function convertToInternationalFormat(phoneNumber: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
    return "+" + cleanNumber;
  }

  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    return "+234" + cleanNumber.substring(1);
  }

  if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
    return "+234" + cleanNumber;
  }

  throw new Error("Invalid Nigerian phone number format");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Webhook received:", body?.data?.reference);

    if (!body?.data?.reference) {
      return NextResponse.json({
        message: "Failed! No reference provided",
        success: false,
      });
    }

    const paymentReference = body.data.reference;

    // Find and confirm the payment using the new brute force approach
    const paymentResult = await findAndConfirmPaymentByReference(paymentReference);

    if (!paymentResult) {
      return NextResponse.json({
        message: "No payment record found for the given reference",
        success: false,
        reference: paymentReference,
      });
    }

    const { serviceType, record, success } = paymentResult;

    if (!success) {
      return NextResponse.json({
        message: `Failed to confirm ${serviceType} payment`,
        success: false,
        serviceType,
        reference: paymentReference,
      });
    }

    console.log(`Successfully processed ${serviceType} payment:`, paymentReference);

    // Handle convention registration with PDF delivery (same as other services)
    if (serviceType === 'convention') {
      try {
        console.log('Processing convention registration with PDF delivery...');

        // Handle multiple convention records (array)
        const conventionRecords = Array.isArray(record) ? record : [record];
        const pdfResults = [];

        for (const conventionRecord of conventionRecords) {
          try {
            // Use the same notification service as other service types
            const notificationResult = await sendServiceNotification('convention', conventionRecord);

            pdfResults.push({
              registrationId: conventionRecord._id,
              paymentReference: conventionRecord.paymentReference,
              success: notificationResult.success,
              pdfGenerated: notificationResult.pdfGenerated,
              whatsappSent: notificationResult.whatsappSent,
              fallbackUsed: notificationResult.fallbackUsed,
              phoneNumber: notificationResult.phoneNumber,
              error: notificationResult.error,
              handledSeparately: notificationResult.handledSeparately
            });

            console.log(`Convention PDF processed for ${conventionRecord.paymentReference}:`, {
              success: notificationResult.success,
              pdfGenerated: notificationResult.pdfGenerated,
              whatsappSent: notificationResult.whatsappSent
            });

          } catch (recordError: any) {
            console.error(`Error processing convention record ${conventionRecord._id}:`, recordError);
            pdfResults.push({
              registrationId: conventionRecord._id,
              paymentReference: conventionRecord.paymentReference,
              success: false,
              error: recordError.message
            });
          }
        }

        const successfulDeliveries = pdfResults.filter(result => result.success).length;
        const failedDeliveries = pdfResults.filter(result => !result.success).length;

        if (failedDeliveries > 0) {
          console.error("Some convention PDF deliveries failed:", pdfResults.filter(r => !r.success));
        }

        return NextResponse.json({
          message: `Convention registration processed. ${successfulDeliveries} out of ${pdfResults.length} PDF confirmations sent successfully.`,
          success: successfulDeliveries > 0,
          serviceType: 'convention',
          reference: paymentReference,
          processed: pdfResults.length,
          successful: successfulDeliveries,
          failed: failedDeliveries,
          details: pdfResults,
        });

      } catch (error: any) {
        console.error("Error processing convention registration:", error);
        return NextResponse.json({
          message: "Failed to process convention registration",
          success: false,
          serviceType: 'convention',
          reference: paymentReference,
          error: error.message,
        }, { status: 500 });
      }
    }

    // Handle other service types with notifications
    let notificationResult = null;
    try {
      notificationResult = await sendServiceNotification(serviceType, record);
    } catch (notificationError: any) {
      console.error(`Error sending ${serviceType} notification:`, notificationError);
      // Don't fail the webhook if notification fails
    }

    return NextResponse.json({
      message: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} payment processed successfully`,
      success: true,
      serviceType,
      reference: paymentReference,
      record: {
        id: record._id,
        paymentReference: record.paymentReference,
        confirmed: record.confirmed,
        totalAmount: record.totalAmount || record.amount || record.donationAmount,
      },
      notification: notificationResult,
    });

    // return NextResponse.json(
    //   {
    //     message: "Success",
    //     success: true,

    //   },

    // );
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
