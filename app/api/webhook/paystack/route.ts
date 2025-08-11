import { generateQrCode } from "@/lib/utils";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { DinnerUtils } from "@/lib/utils/dinner.utils";
import { AccommodationUtils } from "@/lib/utils/accommodation.utils";
import { BrochureUtils } from "@/lib/utils/brochure.utils";
import { GoodwillUtils } from "@/lib/utils/goodwill.utils";
import { DonationUtils } from "@/lib/utils/donation.utils";
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

// Enhanced notification service for different payment types
async function sendServiceNotification(serviceType: string, record: any): Promise<any> {
  try {
    const phoneNumber = record.userId?.phoneNumber || record.paymentReference?.split('_')[1];

    if (!phoneNumber) {
      throw new Error('No phone number found for notification');
    }

    const internationalPhone = convertToInternationalFormat(phoneNumber);

    console.log({ internationalPhone })

    let message = '';
    let imageUrl = null;

    switch (serviceType) {
      case 'dinner':
        message = `🍽️ Dinner Reservation Confirmed!\n\nHi ${record.userId?.fullName || 'there'},\n\nYour dinner reservation for ${record.numberOfGuests} guest(s) has been confirmed.\n\nReservation Details:\n• Guests: ${record.numberOfGuests}\n• Amount: ₦${record.totalAmount}\n• Reference: ${record.paymentReference}\n\nYour QR codes are attached. Please present them at the dinner venue.\n\nThank you!\nGOSA Convention 2025 Committee`;
        // QR codes are already generated in the record
        break;

      case 'accommodation':
        message = `🏨 Accommodation Booking Confirmed!\n\nHi ${record.userId?.fullName || 'there'},\n\nYour ${record.accommodationType} accommodation booking has been confirmed.\n\nBooking Details:\n• Type: ${record.accommodationType.charAt(0).toUpperCase() + record.accommodationType.slice(1)}\n• Check-in: ${new Date(record.checkInDate).toLocaleDateString()}\n• Check-out: ${new Date(record.checkOutDate).toLocaleDateString()}\n• Guests: ${record.numberOfGuests}\n• Amount: ₦${record.totalAmount}\n• Confirmation Code: ${record.confirmationCode}\n\nPlease keep your confirmation code safe.\n\nThank you!\nGOSA Convention 2025 Committee`;
        break;

      case 'brochure':
        message = `📖 Brochure Order Confirmed!\n\nHi ${record.userId?.fullName || 'there'},\n\nYour ${record.brochureType} brochure order has been confirmed.\n\nOrder Details:\n• Type: ${record.brochureType.charAt(0).toUpperCase() + record.brochureType.slice(1)}\n• Quantity: ${record.quantity}\n• Amount: ₦${record.totalAmount}\n• Reference: ${record.paymentReference}\n\n${record.brochureType === 'physical' ? 'Your brochures will be available for pickup at the convention venue.' : 'Your digital brochures will be sent to your email shortly.'}\n\nThank you!\nGOSA Convention 2025 Committee`;
        break;

      case 'goodwill':
        message = `💝 Goodwill Message Received!\n\nHi ${record.userId?.fullName || 'there'},\n\nThank you for your goodwill message and donation of ₦${record.donationAmount}.\n\nYour message has been received and is pending approval. Once approved, it will be displayed during the convention.\n\nReference: ${record.paymentReference}\n\nWe appreciate your support!\nGOSA Convention 2025 Committee`;
        break;

      case 'donation':
        message = `🙏 Donation Received!\n\nHi ${record.userId?.fullName || 'there'},\n\nThank you for your generous donation of ₦${record.amount}.\n\nDonation Details:\n• Amount: ₦${record.amount}\n• Receipt Number: ${record.receiptNumber}\n• Reference: ${record.paymentReference}\n${record.onBehalfOf ? `• On behalf of: ${record.onBehalfOf}` : ''}\n\nYour support means a lot to us!\nGOSA Convention 2025 Committee`;
        break;

      default:
        // Convention registration - use existing logic
        return null;
    }

    const result = await Wasender.httpSenderMessage({
      to: internationalPhone,
      text: message,
      imageUrl,
    });

    return {
      success: true,
      serviceType,
      phoneNumber: internationalPhone,
      result,
    };

  } catch (error: any) {
    console.error(`Error sending ${serviceType} notification:`, error);
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

    // Handle convention registration separately (multiple records)
    if (serviceType === 'convention') {
      try {
        // Generate QR codes and send messages for convention registration
        // @ts-ignore
        const qrResults = await generateQrCode(record);

        const failedOperations = qrResults.filter(
          (result) =>
            result.status === "rejected" ||
            (result.status === "fulfilled" && !result.value.success),
        );

        if (failedOperations.length > 0) {
          console.error("Some QR operations failed:", failedOperations);
          return NextResponse.json({
            message: `Convention registration partially successful. ${qrResults.length - failedOperations.length} out of ${qrResults.length} operations completed successfully.`,
            success: true,
            serviceType: 'convention',
            reference: paymentReference,
            details: qrResults,
          });
        }

        return NextResponse.json({
          message: "Convention registration completed successfully",
          success: true,
          serviceType: 'convention',
          reference: paymentReference,
          processed: qrResults.length,
          details: qrResults,
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
