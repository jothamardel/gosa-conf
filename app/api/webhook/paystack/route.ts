import { ConventionUtils } from "@/lib/utils/convention.utils";
import { DinnerUtils } from "@/lib/utils/dinner.utils";
import { AccommodationUtils } from "@/lib/utils/accommodation.utils";
import { BrochureUtils } from "@/lib/utils/brochure.utils";
import { GoodwillUtils } from "@/lib/utils/goodwill.utils";
import { DonationUtils } from "@/lib/utils/donation.utils";
import { ProductPurchaseUtils } from "@/lib/utils/product-purchase.utils";
import { Wasender } from "@/lib/wasender-api";
import { NextRequest, NextResponse } from "next/server";

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
    const paymentResult =
      await findAndConfirmPaymentByReference(paymentReference);

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

    console.log(
      `Successfully processed ${serviceType} payment:`,
      paymentReference,
    );
    console.log({ paymentResult, record, serviceType, success });

    // Handle convention registration with image delivery (same as other services)
    if (serviceType === "convention") {
      try {
        console.log(
          "Processing convention registration with image delivery...",
        );

        // Handle multiple convention records (array)
        const conventionRecords = Array.isArray(record) ? record : [record];
        const imageResults: any = [];

        console.log({ conventionRecords })

        // Group records by unique phone numbers to avoid duplicate notifications
        const phoneGroups = new Map<string, any[]>();

        for (const conventionRecord of conventionRecords) {
          const phoneNumber = conventionRecord.paymentReference?.split("_")[1] || conventionRecord.userId?.phoneNumber
          // const phoneNumber =
          //   conventionRecord.userId?.phoneNumber ||
          //   conventionRecord.paymentReference?.split("_")[1];
          if (phoneNumber) {
            if (!phoneGroups.has(phoneNumber)) {
              phoneGroups.set(phoneNumber, []);
            }
            phoneGroups.get(phoneNumber)!.push(conventionRecord);
          }
        }

        console.log(
          `Found ${phoneGroups.size} unique phone numbers for ${conventionRecords.length} convention records`,
        );

        // Log the grouping for debugging
        for (const [phone, records] of phoneGroups) {
          console.log(`Phone ${phone}: ${records.length} registrations`);
        }
        console.log({
          phoneGroups,
        });

        // Send one notification per unique phone number
        for (const [phoneNumber, records] of phoneGroups) {
          try {
            // Use the first record for notification (they all have the same user info)
            const primaryRecord = records[0];

            // Calculate total quantity for this phone number
            const totalQuantity = records.length;

            // Add quantity info to the record for better messaging
            const recordWithQuantity = {
              ...primaryRecord,
              ...primaryRecord._doc,
              totalQuantity,
              allRecords: records,
            };

            console.log({
              recordWithQuantity,
            });

            // Use the same notification service as other service types
            const notificationResult = await sendServiceNotification(
              "convention",
              recordWithQuantity,
            );

            console.log({ notificationResult });

            // Add results for all records under this phone number
            for (const conventionRecord of records) {
              imageResults.push({
                registrationId: conventionRecord._id,
                paymentReference: conventionRecord.paymentReference,
                success: notificationResult.success,
                imageGenerated: notificationResult.imageGenerated,
                whatsappSent: notificationResult.whatsappSent,
                fallbackUsed: notificationResult.fallbackUsed,
                phoneNumber: notificationResult.phoneNumber,
                error: notificationResult.error,
                groupedDelivery: true,
                totalQuantity,
              });
            }

            console.log(
              `Convention image processed for phone ${phoneNumber} (${totalQuantity} registrations):`,
              {
                success: notificationResult.success,
                imageGenerated: notificationResult.imageGenerated,
                whatsappSent: notificationResult.whatsappSent,
                totalQuantity,
              },
            );
          } catch (recordError: any) {
            console.error(
              `Error processing convention records for phone ${phoneNumber}:`,
              recordError,
            );

            // Add error results for all records under this phone number
            for (const conventionRecord of records) {
              imageResults.push({
                registrationId: conventionRecord._id,
                paymentReference: conventionRecord.paymentReference,
                success: false,
                error: recordError.message,
                phoneNumber,
              });
            }
          }
        }

        const successfulDeliveries = imageResults.filter(
          (result: any) => result.success,
        ).length;
        const failedDeliveries = imageResults.filter(
          (result: any) => !result.success,
        ).length;

        if (failedDeliveries > 0) {
          console.error(
            "Some convention image deliveries failed:",
            imageResults.filter((r: any) => !r.success),
          );
        }

        const uniquePhoneNumbers = phoneGroups.size;
        const successfulPhoneNumbers = [...phoneGroups.keys()].filter((phone) =>
          imageResults.some(
            (result: any) =>
              result.phoneNumber?.includes(phone) && result.success,
          ),
        ).length;

        return NextResponse.json({
          message: `Convention registration processed. ${successfulPhoneNumbers} out of ${uniquePhoneNumbers} unique phone numbers received confirmations (${successfulDeliveries} total registrations).`,
          success: successfulDeliveries > 0,
          serviceType: "convention",
          reference: paymentReference,
          totalRegistrations: imageResults.length,
          uniquePhoneNumbers,
          successfulPhoneNumbers,
          successful: successfulDeliveries,
          failed: failedDeliveries,
          details: imageResults,
        });
      } catch (error: any) {
        console.error("Error processing convention registration:", error);
        return NextResponse.json(
          {
            message: "Failed to process convention registration",
            success: false,
            serviceType: "convention",
            reference: paymentReference,
            error: error.message,
          },
          { status: 500 },
        );
      }
    }

    // Handle other service types with notifications
    // Skip main notification for dinner since we handle individual receipts above
    let notificationResult = null;
    if (serviceType !== 'dinner') {
      try {
        notificationResult = await sendServiceNotification(serviceType, record);
      } catch (notificationError: any) {
        console.error(
          `Error sending ${serviceType} notification:`,
          notificationError,
        );
        // Don't fail the webhook if notification fails
      }
    } else {
      console.log(`ℹ️ Skipping main notification for dinner - individual receipts already sent`);
    }

    // Update the Transaction status to 'completed'
    try {
      const { Transaction } = await import("@/lib/schema");
      const updatedTx = await Transaction.findOneAndUpdate(
        { paymentReference: { $regex: `^${paymentReference}` } },
        { status: 'completed' },
        { new: true }
      );
      if (updatedTx) {
        console.log(`Updated Transaction ${updatedTx.paymentReference} status to completed`);
      } else {
        console.log(`No Transaction record found starting with reference ${paymentReference}`);
      }
    } catch (txError) {
      console.error("Error updating Transaction record status:", txError);
    }

    return NextResponse.json({
      message: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} payment processed successfully`,
      success: true,
      serviceType,
      reference: paymentReference,
      record: {
        id: record._id,
        paymentReference: record.paymentReference,
        confirmed: record.confirm || record.confirmed,
        totalAmount:
          record.totalAmount || record.amount || record.donationAmount,
      },
      notification: notificationResult,
    });
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

async function findAndConfirmPaymentByReference(reference: string): Promise<{
  serviceType: string;
  record: any;
  success: boolean;
} | null> {
  console.log(`Searching for payment reference: ${reference}`);

  try {
    if (reference.startsWith('cart')) {
      const { Transaction } = await import("@/lib/schema");
      const tx = await Transaction.findOneAndUpdate(
        { paymentReference: { $regex: `^${reference}` }, type: 'cart' },
        { status: 'completed' },
        { new: true }
      );
      if (tx) {
        console.log(`Found and completed combined cart transaction: ${tx.paymentReference}`);
        
        // Confirm all items in other tables that share this prefix
        const hasProduct = await ProductPurchaseUtils.findByReferencePattern(reference);
        if (hasProduct) {
          await ProductPurchaseUtils.confirmPurchase(hasProduct.paymentReference);
        }
        const hasDinner = await DinnerUtils.findByReferencePattern(reference);
        if (hasDinner) {
          await DinnerUtils.confirmReservation(hasDinner.paymentReference);
        }
        const hasAccommodation = await AccommodationUtils.findByReferencePattern(reference);
        if (hasAccommodation) {
          await AccommodationUtils.confirmBooking(hasAccommodation.paymentReference);
        }
        const hasBrochure = await BrochureUtils.findByReferencePattern(reference);
        if (hasBrochure) {
          await BrochureUtils.confirmOrder(hasBrochure.paymentReference);
        }
        const hasGoodwill = await GoodwillUtils.findByReferencePattern(reference);
        if (hasGoodwill) {
          await GoodwillUtils.confirmMessage(hasGoodwill.paymentReference);
        }
        const hasDonation = await DonationUtils.findByReferencePattern(reference);
        if (hasDonation) {
          await DonationUtils.confirmDonation(hasDonation.paymentReference);
        }
        const hasConvention = await ConventionUtils.findByReferencePattern(reference);
        if (hasConvention && hasConvention.length > 0) {
          await ConventionUtils.confirmByReferencePattern(reference);
        }

        return {
          serviceType: "cart",
          record: tx,
          success: true
        };
      }
    }

    // Try product purchases (uniform, emblem, magazine)
    const productRecord = await ProductPurchaseUtils.findByReferencePattern(reference);
    if (productRecord) {
      console.log(`Found product purchase with reference pattern: ${reference}`);
      const confirmedRecord = await ProductPurchaseUtils.confirmPurchase(productRecord.paymentReference);
      if (confirmedRecord) {
        return {
          serviceType: confirmedRecord.productType,
          record: confirmedRecord,
          success: true,
        };
      }
    }

    // Try dinner reservations
    const dinnerRecord = await DinnerUtils.findByReferencePattern(reference);
    if (dinnerRecord) {
      console.log(
        `Found dinner reservation with reference pattern: ${reference}`,
      );
      // Enhanced dinner confirmation returns array of reservations
      const dinnerReservations = await DinnerUtils.confirmReservation(
        dinnerRecord.paymentReference,
      );


      if (dinnerReservations && dinnerReservations.length > 0) {
        console.log(`🍽️ Confirmed ${dinnerReservations.length} dinner reservations for ${reference}`);

        // Send individual receipts to all guests (clean approach - 1 guest = 1 document)
        console.log(`📱 About to send ${dinnerReservations.length} individual receipts`);

        for (let i = 0; i < dinnerReservations.length; i++) {
          const reservation = dinnerReservations[i];
          try {
            console.log(`📱 Sending receipt ${i + 1}/${dinnerReservations.length} to guest: ${reservation.guestDetails[0]?.name} (Index: ${reservation.guestIndex}, ID: ${reservation._id})`);
            await sendIndividualDinnerReceipt(reservation, reference);
            console.log(`✅ Successfully sent receipt ${i + 1}/${dinnerReservations.length}`);
          } catch (receiptError) {
            console.error(`❌ Failed to send receipt ${i + 1}/${dinnerReservations.length} to ${(reservation.userId as any).email}:`, receiptError);
          }
        }

        console.log(`📱 Completed sending ${dinnerReservations.length} receipts`);

        return {
          serviceType: "dinner",
          record: dinnerReservations[0], // Use primary reservation for main processing
          success: true,
        };
      }
    }

    // Try accommodation bookings
    const accommodationRecord =
      await AccommodationUtils.findByReferencePattern(reference);
    if (accommodationRecord) {
      console.log(
        `Found accommodation booking with reference pattern: ${reference}`,
      );
      const confirmedRecord = await AccommodationUtils.confirmBooking(
        accommodationRecord.paymentReference,
      );
      if (confirmedRecord) {
        return {
          serviceType: "accommodation",
          record: confirmedRecord,
          success: true,
        };
      }
    }

    // Try brochure orders
    const brochureRecord =
      await BrochureUtils.findByReferencePattern(reference);
    if (brochureRecord) {
      console.log(`Found brochure order with reference pattern: ${reference}`);
      const confirmedRecord = await BrochureUtils.confirmOrder(
        brochureRecord.paymentReference,
      );
      if (confirmedRecord) {
        return {
          serviceType: "brochure",
          record: confirmedRecord,
          success: true,
        };
      }
    }

    // Try goodwill messages
    const goodwillRecord =
      await GoodwillUtils.findByReferencePattern(reference);
    if (goodwillRecord) {
      console.log(
        `Found goodwill message with reference pattern: ${reference}`,
      );
      const confirmedRecord = await GoodwillUtils.confirmMessage(
        goodwillRecord.paymentReference,
      );
      if (confirmedRecord) {
        return {
          serviceType: "goodwill",
          record: confirmedRecord,
          success: true,
        };
      }
    }

    // Try donations
    const donationRecord =
      await DonationUtils.findByReferencePattern(reference);
    if (donationRecord) {
      console.log(`Found donation with reference pattern: ${reference}`);
      const confirmedRecord = await DonationUtils.confirmDonation(
        donationRecord.paymentReference,
      );
      if (confirmedRecord) {
        return {
          serviceType: "donation",
          record: confirmedRecord,
          success: true,
        };
      }
    }

    // Try convention registrations
    const conventionRecords =
      await ConventionUtils.findByReferencePattern(reference);
    if (conventionRecords && conventionRecords.length > 0) {
      console.log(
        `Found convention registration(s) with reference pattern: ${reference}`,
      );
      // For convention, we need to handle multiple records
      await ConventionUtils.confirmByReferencePattern(reference);
      const confirmedRecords =
        await ConventionUtils.findByReferencePattern(reference);
      if (confirmedRecords && confirmedRecords.length > 0) {
        return {
          serviceType: "convention",
          record: confirmedRecords,
          success: true,
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

// Enhanced notification service for different payment types with image generation
async function sendServiceNotification(
  serviceType: string,
  record: any,
): Promise<any> {
  console.log({
    serviceType,
    record,
  });
  let internationalPhone: string = "";

  try {
    // Check if payment is confirmed - use the correct field name from schema (confirm is primary)
    const isConfirmed =
      record.confirm ||
      record.confirmed ||
      record.status === "confirmed" ||
      record.paymentStatus === "confirmed" ||
      record.status === "completed";

    // paymentReference
    console.log(`Payment confirmation check for ${record.paymentReference}:`, {
      confirm: record.confirm,
      confirmed: record.confirmed,
      status: record.status,
      paymentStatus: record.paymentStatus,
      isConfirmed,
    });

    if (!isConfirmed) {
      console.log(
        `Skipping image delivery for unconfirmed ${serviceType} payment:`,
        record.paymentReference,
      );
      return {
        success: false,
        serviceType,
        error: "Payment not confirmed",
        skipped: true,
      };
    }

    let targetJid = "";
    try {
      const { Transaction } = await import("@/lib/schema");
      // Split reference to match the exact parent transaction reference prefix
      const parts = record.paymentReference?.split("_") || [];
      const baseRef = parts.slice(0, 3).join("_");
      console.log(`[PAYSTACK-WEBHOOK] Looking up transaction with reference: ${baseRef}`);
      const tx = await Transaction.findOne({ paymentReference: baseRef });
      if (tx) {
        if (tx.source) {
          targetJid = tx.source;
          console.log(`[PAYSTACK-WEBHOOK] Resolved target JID from Transaction source field: ${targetJid}`);
        } else if (tx.metadata?.groupJid) {
          targetJid = tx.metadata.groupJid;
          console.log(`[PAYSTACK-WEBHOOK] Resolved target JID from Transaction metadata groupJid: ${targetJid}`);
        }
      }
    } catch (e) {
      console.error("Failed to query transaction for routing:", e);
    }

    if (!targetJid) {
      // Fallback 1: Prioritize populated user phoneNumber
      const rawPhone = record.userId?.phoneNumber || record.donorPhone || "";
      if (rawPhone) {
        targetJid = convertToInternationalFormat(rawPhone);
        console.log(`[PAYSTACK-WEBHOOK] Fallback: Routing privately to user phone JID: ${targetJid}`);
      }
    }

    if (!targetJid) {
      // Fallback 2: Parse phone number from reference
      const parts = record.paymentReference?.split("_") || [];
      const phoneCandidate = parts.length > 2 ? parts[2] : parts[1];
      if (phoneCandidate && phoneCandidate.length > 5) {
        targetJid = convertToInternationalFormat(phoneCandidate);
        console.log(`[PAYSTACK-WEBHOOK] Fallback 2: Routing privately to parsed phone JID: ${targetJid}`);
      }
    }

    if (!targetJid) {
      throw new Error("No destination JID found for notification");
    }

    // Set internationalPhone to targetJid so that it maps correctly throughout the rest of the function (for result payloads)
    internationalPhone = targetJid;

    // Prepare user details for image generation (use personal phone number, not group JID, to prevent exposure)
    const personalPhone = record.userId?.phoneNumber || record.donorPhone || "";
    const userDetails = {
      name: record.userId?.fullName || record.fullName || "Unknown User",
      email: record.userId?.email || record.email || "unknown@email.com",
      phone: personalPhone || targetJid,
      registrationId: record._id?.toString(),
    };

    const isGroup = targetJid.endsWith('@g.us');

    if (serviceType === 'cart') {
      const cartItems = record.metadata?.items || [];
      let cartSummary = "";
      for (const item of cartItems) {
        const label = item.type.charAt(0).toUpperCase() + item.type.slice(1);
        const qty = item.targetJids?.length || item.quantity || 1;
        cartSummary += `• ${qty}x GOSA ${label}\n`;
      }

      const textMessage = `🎉 *GOSA Combined Purchase Confirmation*
For Light and Truth

Dear ${userDetails.name},

Your combined purchase/registration has been confirmed! ✅

📦 *Confirmed Items:*
${cartSummary.trim()}

💳 *Payment Details:*
• Total Amount: ₦${record.amount.toLocaleString()}
${isGroup ? "" : `• Reference: ${record.paymentReference}\n`}• Status: Confirmed ✅

Thank you for supporting the GOSA community, sir!`;

      const formattedText = isGroup ? formatGroupResponse(textMessage) : sanitizeMessage(textMessage);

      const wasenderRes = await Wasender.httpSenderMessage({
        to: targetJid,
        text: formattedText
      });

      return {
        success: wasenderRes.success,
        serviceType,
        phoneNumber: targetJid,
        whatsappSent: wasenderRes.success,
        error: wasenderRes.error
      };
    }

    if (isGroup) {
      let typeLabel = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
      if (serviceType === 'convention') typeLabel = 'Convention Registration';
      else if (serviceType === 'dinner') typeLabel = 'Dinner Reservation';
      else if (serviceType === 'brochure') typeLabel = 'Convention Brochure';
      else if (serviceType === 'donation') typeLabel = 'Donation';

      const amountVal = record.totalAmount || record.amount || record.donationAmount || 0;
      const quantityVal = record.quantity || record.totalQuantity || 1;

      const textMessage = `🎉 *GOSA Confirmation*
For Light and Truth

Dear ${userDetails.name},

Your purchase/registration of *${quantityVal}x GOSA ${typeLabel}* has been confirmed! ✅

💳 *Payment Details:*
• Amount: ₦${amountVal.toLocaleString()}
• Status: Confirmed ✅

Thank you for supporting the GOSA community, sir!`;

      const formattedText = formatGroupResponse(textMessage);

      const wasenderRes = await Wasender.httpSenderMessage({
        to: targetJid,
        text: formattedText
      });

      return {
        success: wasenderRes.success,
        serviceType,
        phoneNumber: targetJid,
        whatsappSent: wasenderRes.success,
        error: wasenderRes.error
      };
    }

    if (serviceType === 'uniform' || serviceType === 'emblem' || serviceType === 'magazine') {
      const typeLabel = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
      const textMessage = `🎉 *GOSA Shop Confirmation*
For Light and Truth

Dear ${userDetails.name},

Your purchase of *${record.quantity}x GOSA ${typeLabel}* has been confirmed! ✅

💳 *Payment Details:*
• Amount: ₦${record.totalAmount.toLocaleString()}
• Reference: ${record.paymentReference}
• Status: Confirmed ✅

Thank you for supporting the GOSA community, sir!`;
      
      const formattedText = sanitizeMessage(textMessage);

      const wasenderRes = await Wasender.httpSenderMessage({
        to: targetJid,
        text: formattedText
      });
      return {
        success: wasenderRes.success,
        serviceType,
        phoneNumber: targetJid,
        whatsappSent: wasenderRes.success,
        error: wasenderRes.error
      };
    }

    // Generate QR code data - use existing QR codes if available
    let qrCodeData = record.qrCodes?.[0]?.qrCode;

    // If no QR code exists, generate a basic one
    if (!qrCodeData) {
      const baseUrl = process.env.GOSA_PUBLIC_URL || 'https://gosa.events';
      qrCodeData = `${baseUrl}/scan?id=${record._id}`;
    }

    let imageResult: any = null;

    console.log(
      `Generating image with Vercel Blob for ${serviceType} payment:`,
      record.paymentReference,
    );

    // Use the new WhatsApp Image Service with Vercel Blob integration
    const { WhatsAppImageService } = await import(
      "@/lib/services/whatsapp-image.service"
    );

    // Prepare WhatsApp image data
    const whatsappImageData = {
      userDetails: {
        ...userDetails,
        registrationId:
          userDetails.registrationId || record._id?.toString() || "",
      },
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
        date: new Date(),
        status: "confirmed" as const,
        description:
          record.totalQuantity > 1
            ? `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} confirmation (${record.totalQuantity} registrations)`
            : `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} confirmation`,
        additionalInfo: JSON.stringify({
          serviceType,
          recordId: record._id,
          confirmed: true,
          totalQuantity: record.totalQuantity || 1,
          groupedRecords: record.allRecords?.length || 1,
        }),
      },
      qrCodeData,
    };

    console.log({ whatsappImageData });

    // Generate image and send via WhatsApp using Vercel Blob
    console.log(
      `[WEBHOOK] Starting image generation and WhatsApp delivery for ${serviceType}:`,
      {
        user: whatsappImageData.userDetails.name,
        phone: whatsappImageData.userDetails.phone,
        amount: whatsappImageData.operationDetails.amount,
        reference: whatsappImageData.operationDetails.paymentReference,
      },
    );

    imageResult =
      await WhatsAppImageService.generateAndSendImage(whatsappImageData);

    const result = {
      success: imageResult?.success || false,
      serviceType,
      phoneNumber: internationalPhone,
      imageGenerated: imageResult?.imageGenerated || false,
      whatsappSent: imageResult?.whatsappSent || false,
      fallbackUsed: imageResult?.fallbackUsed || false,
      error: imageResult?.error,
      messageId: imageResult?.messageId,
    };

    console.log(`[WEBHOOK] Image delivery result for ${serviceType}:`, result);

    if (!result.success) {
      console.error(`[WEBHOOK] Image delivery failed for ${serviceType}:`, {
        error: result.error,
        imageGenerated: result.imageGenerated,
        whatsappSent: result.whatsappSent,
        fallbackUsed: result.fallbackUsed,
      });
    } else {
      console.log(`[WEBHOOK] Image delivery successful for ${serviceType}:`, {
        messageId: result.messageId,
        imageGenerated: result.imageGenerated,
        whatsappSent: result.whatsappSent,
      });
    }

    return result;
  } catch (error: any) {
    console.error(
      `Error sending ${serviceType} notification with image:`,
      error,
    );

    // Record error for monitoring
    try {
      const { PDFMonitoringService } = await import(
        "@/lib/services/pdf-monitoring.service"
      );
      await PDFMonitoringService.recordError(
        "error",
        "WEBHOOK_IMAGE_DELIVERY",
        "IMAGE_DELIVERY_EXCEPTION",
        `Image delivery failed in webhook for ${serviceType}: ${error.message}`,
        {
          serviceType,
          paymentReference: record?.paymentReference,
          userPhone: internationalPhone,
          error: error.message,
          stack: error.stack,
        },
        true, // Requires immediate action
      );
    } catch (monitoringError) {
      console.error("Failed to record webhook image error:", monitoringError);
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
/**
 * Send individual dinner receipt to each guest
 */
async function sendIndividualDinnerReceipt(reservation: any, mainPaymentReference: string): Promise<void> {
  try {
    const user = reservation.userId;
    if (!user || !user.phoneNumber) {
      console.log(`⚠️ Skipping receipt for reservation ${reservation._id} - no user phone`);
      return;
    }

    // Generate QR code data for this specific reservation
    let qrCodeData = reservation.qrCodes?.[0]?.qrCode;
    if (!qrCodeData) {
      const baseUrl = process.env.GOSA_PUBLIC_URL || 'https://gosa.events';
      qrCodeData = `${baseUrl}/scan?id=${reservation._id}`;
    }

    // Format phone number using the same utility as DinnerUtils
    let formattedPhone = reservation.paymentReference?.split("_")[1] || user.phoneNumber;
    console.log(`📞 Original phone number: "${formattedPhone}"`);

    try {
      // Use the same phone formatting logic as in DinnerUtils
      const { DinnerUtils } = await import("@/lib/utils/dinner.utils");
      formattedPhone = DinnerUtils.formatPhoneNumber(formattedPhone);
      console.log(`📞 Formatted phone number: "${formattedPhone}"`);
    } catch (formatError: any) {
      console.error(`❌ Phone formatting failed: ${formatError.message}`);
      // Fallback formatting
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      formattedPhone = formattedPhone.replace(/[^\+\d]/g, '');
      console.log(`📞 Fallback formatted phone: "${formattedPhone}"`);
    }

    // Validate against the expected regex (should handle Nigerian numbers like +2347033680280)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isValidFormat = phoneRegex.test(formattedPhone);

    console.log(`📞 Phone validation: "${formattedPhone}" matches regex: ${isValidFormat}`);

    if (!isValidFormat) {
      console.error(`❌ Phone number validation failed: "${formattedPhone}" does not match regex ${phoneRegex}`);
      console.error(`📞 Phone details: length=${formattedPhone.length}, starts with +: ${formattedPhone.startsWith('+')}, first digit after +: ${formattedPhone.charAt(1)}`);

      // Try to provide more specific error information
      if (formattedPhone.length > 15) {
        throw new Error(`Phone number too long: ${formattedPhone} (${formattedPhone.length} characters, max 15)`);
      }
      if (formattedPhone.startsWith('+0')) {
        throw new Error(`Phone number cannot start with +0: ${formattedPhone}`);
      }
      if (!/^\+/.test(formattedPhone)) {
        throw new Error(`Phone number must start with +: ${formattedPhone}`);
      }

      throw new Error(`Invalid phone number format: ${formattedPhone}`);
    }

    // Prepare WhatsApp image data for individual guest
    const whatsappImageData = {
      userDetails: {
        name: user.fullName,
        email: user.email,
        phone: formattedPhone,
        registrationId: reservation._id.toString(),
      },
      operationDetails: {
        type: 'dinner' as const,
        amount: reservation.totalAmount,
        paymentReference: reservation.paymentReference,
        date: reservation.createdAt || new Date(),
        status: 'confirmed' as const,
        description: 'Dinner Reservation',
        additionalInfo: `Guest: ${reservation.guestDetails[0]?.name || user.fullName}${reservation.guestDetails[0]?.dietaryRequirements ? ` | Dietary: ${reservation.guestDetails[0].dietaryRequirements}` : ''} | Main Reference: ${mainPaymentReference}`,
      },
      qrCodeData,
    };

    // Send individual receipt
    const { WhatsAppImageService } = await import("@/lib/services/whatsapp-image.service");
    const imageResult = await WhatsAppImageService.generateAndSendImage(whatsappImageData);

    console.log(`📱 Individual dinner receipt sent to ${user.fullName} (${user.phoneNumber}):`, imageResult.success ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Error sending individual dinner receipt:', error);
    throw error;
  }
}

function formatGroupResponse(text: string): string {
  const cleanText = sanitizeMessage(text).trim();
  return `🌟 *GOSA BILKWAS* 🌟
━━━━━━━━━━━━━━━━━━

${cleanText}

━━━━━━━━━━━━━━━━━━
📅 *GOSA CONVENTION 2026*
• *Theme:* _BUILDING BRIDGES, CONNECTING THE PAST WITH THE PRESENT._
• *Date:* 31st October, 2026
• *Venue:* Crispan
• *Website:* events.gosanigeria.ng

📢 *Ad:* Advertise your business here! Contact us at *08098341778*`;
}

function sanitizeMessage(text: string): string {
  let cleanText = text.replace(/\*\*/g, "*");
  cleanText = cleanText.replace(/([0-9\-]+)@(s\.whatsapp\.net|g\.us|lid)/g, (match, phone) => {
    return `+${phone}`;
  });
  cleanText = cleanText.replace(/[0-9a-fA-F]{24}/g, "");
  return cleanText;
}