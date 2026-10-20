import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ConventionRegistration } from "@/lib/schema/convention.schema";
import { DinnerReservation } from "@/lib/schema/dinner.schema";
import { Transaction } from "@/lib/schema/transaction.schema";
import { User } from "@/lib/schema/user.schema";
import { UserUtils } from "@/lib/utils/user.utils";
import { Wasender } from "@/lib/wasender-api";
import { Types } from "mongoose";

// Ensure mongoose models are registered
User;
ConventionRegistration;
DinnerReservation;
Transaction;

export interface TransferRequestPayload {
  ticketId: string;
  serviceCategory?: "convention" | "dinner";
  transferType?: "gift" | "on_behalf" | "transfer";
  personalNote?: string;
  newOwner: {
    fullName: string;
    phoneNumber: string;
    email?: string;
    year?: string;
    house?: string;
  };
}

function formatNigerianPhoneNumber(rawPhone: string): { displayPhone: string; whatsappJid: string } {
  const clean = rawPhone.replace(/\D/g, "");
  let intl = clean;

  if (clean.startsWith("0") && clean.length === 11) {
    intl = "234" + clean.substring(1);
  } else if (clean.startsWith("234") && clean.length === 13) {
    intl = clean;
  } else if (clean.length === 10 && /^[789]/.test(clean)) {
    intl = "234" + clean;
  }

  const display = clean.startsWith("0") ? clean : "0" + intl.replace(/^234/, "");
  return {
    displayPhone: display,
    whatsappJid: `${intl}@s.whatsapp.net`,
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body: TransferRequestPayload = await req.json();
    const { ticketId, serviceCategory, transferType = "transfer", personalNote, newOwner } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, message: "Ticket ID is required" },
        { status: 400 }
      );
    }

    if (!newOwner?.fullName || !newOwner?.phoneNumber) {
      return NextResponse.json(
        { success: false, message: "Recipient's Full Name and Phone Number are required" },
        { status: 400 }
      );
    }

    const { displayPhone, whatsappJid } = formatNigerianPhoneNumber(newOwner.phoneNumber);
    const cleanName = newOwner.fullName.trim();
    const cleanEmail = (newOwner.email || `${displayPhone}@gosanigeria.ng`).trim().toLowerCase();
    const cleanNote = personalNote?.trim() || "";

    const isValidObjectId = Types.ObjectId.isValid(ticketId);

    // 1. Locate the ticket record
    let targetConvention: any = null;
    let targetDinner: any = null;

    if (serviceCategory === "dinner" || (!serviceCategory && isValidObjectId)) {
      if (isValidObjectId) {
        targetDinner = await DinnerReservation.findById(ticketId);
      }
      if (!targetDinner) {
        targetDinner = await DinnerReservation.findOne({ paymentReference: ticketId });
      }
    }

    if (!targetDinner && (serviceCategory === "convention" || !serviceCategory)) {
      if (isValidObjectId) {
        targetConvention = await ConventionRegistration.findById(ticketId);
      }
      if (!targetConvention) {
        targetConvention = await ConventionRegistration.findOne({ paymentReference: ticketId });
      }
    }

    // Fallback: If ticketId was a Transaction ID or payment reference
    if (!targetConvention && !targetDinner) {
      const txQuery = isValidObjectId
        ? { $or: [{ _id: ticketId }, { paymentReference: ticketId }] }
        : { paymentReference: ticketId };
      const tx = await Transaction.findOne(txQuery);

      if (tx) {
        const baseRef = tx.paymentReference.split("_").slice(0, 3).join("_");
        const refRegex = new RegExp(`^${baseRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

        if (serviceCategory === "dinner") {
          targetDinner = await DinnerReservation.findOne({ paymentReference: { $regex: refRegex } });
        } else {
          targetConvention = await ConventionRegistration.findOne({ paymentReference: { $regex: refRegex } });
          if (!targetConvention) {
            targetDinner = await DinnerReservation.findOne({ paymentReference: { $regex: refRegex } });
          }
        }
      }
    }

    const targetRecord = targetConvention || targetDinner;
    if (!targetRecord) {
      return NextResponse.json(
        { success: false, message: "No ticket could be located for this ID" },
        { status: 404 }
      );
    }

    // 2. Validate ticket eligibility
    if (targetRecord.checkedIn) {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket has already been checked in at the event venue and cannot be transferred.",
        },
        { status: 400 }
      );
    }

    const isConfirmed =
      targetRecord.confirm === true ||
      targetRecord.confirmed === true ||
      targetRecord.status === "confirmed";

    if (!isConfirmed) {
      return NextResponse.json(
        {
          success: false,
          message: "Only confirmed and paid tickets can be transferred.",
        },
        { status: 400 }
      );
    }

    // 3. Locate or create the new owner's User profile
    const newOwnerUser = await UserUtils.findOrCreateUser({
      fullName: cleanName,
      phoneNumber: displayPhone,
      email: cleanEmail,
      year: newOwner.year,
      house: newOwner.house,
    });

    // 4. Retrieve current/original owner information
    const previousOwnerUser = await User.findById(targetRecord.userId);
    const buyerName = previousOwnerUser?.fullName || "A fellow GOSA alumnus";
    const buyerPhone = previousOwnerUser?.phoneNumber || "";

    const baseUrl = process.env.NEXTAUTH_URL || "https://events.gosanigeria.ng";
    const passUrl = `${baseUrl}/ticket?id=${targetRecord._id.toString()}`;

    // 5. Update Ticket Record In-Place
    if (targetConvention) {
      const updatedPersons = [
        {
          name: cleanName,
          phone: displayPhone,
          email: cleanEmail,
        },
      ];

      await ConventionRegistration.findByIdAndUpdate(targetConvention._id, {
        $set: {
          userId: newOwnerUser._id,
          persons: updatedPersons,
          transferredFrom: previousOwnerUser?._id,
          transferredAt: new Date(),
          transferReason: transferType,
          personalNote: cleanNote || undefined,
        },
      });
    }

    if (targetDinner) {
      const updatedGuestDetails = [
        {
          name: cleanName,
          phone: displayPhone,
          email: cleanEmail,
        },
      ];

      await DinnerReservation.findByIdAndUpdate(targetDinner._id, {
        $set: {
          userId: newOwnerUser._id,
          guestDetails: updatedGuestDetails,
          transferredFrom: previousOwnerUser?._id,
          transferredAt: new Date(),
          transferReason: transferType,
          personalNote: cleanNote || undefined,
        },
      });
    }

    // 6. Send Automated WhatsApp Notification to Recipient
    try {
      let headline = "🎉 *GOSA 2026 Ticket Pass Transferred to You*";
      let greeting = `Hello ${cleanName},\n\n${buyerName} has transferred their *GOSA 2026 Convention Pass* to you! 🎟️`;

      if (transferType === "gift") {
        headline = "🎁 *You've Received a GOSA 2026 Convention Pass as a Gift!*";
        greeting = `Hello ${cleanName},\n\n${buyerName} has presented you with a *GOSA 2026 Annual National Convention Pass* as a gift! 🎁🎟️`;
      } else if (transferType === "on_behalf") {
        headline = "🤝 *Your GOSA 2026 Ticket Pass is Ready!*";
        greeting = `Hello ${cleanName},\n\n${buyerName} assisted in purchasing your *GOSA 2026 Convention Ticket Pass*, and it has now been officially assigned to your name! 🎟️`;
      }

      let textMessage = `${headline}
For Light and Truth

${greeting}

👤 *Attendee Name:* ${cleanName}
📱 *Phone:* ${displayPhone}
🎟️ *Access Pass:* ${passUrl}`;

      if (cleanNote) {
        textMessage += `\n\n💌 *Personal Note from ${buyerName}:*\n"${cleanNote}"`;
      }

      textMessage += `\n\n📍 *Venue:* Crispan Luxury Hotel, Jos, Plateau State
📅 *Dates:* Oct 31 – Nov 2, 2026

Please tap your pass link above to view your official E-Ticket and QR code for check-in at the accreditation desk.

We look forward to welcoming you to the 2026 Convention!`;

      await Wasender.httpSenderMessage({
        to: whatsappJid,
        text: textMessage,
      });
      console.log(`[TICKET-TRANSFER] WhatsApp dispatch sent to recipient ${whatsappJid}`);
    } catch (waErr) {
      console.warn("[TICKET-TRANSFER] Recipient WhatsApp dispatch failed:", waErr);
    }

    // 7. Send Automated WhatsApp Confirmation to Original Buyer
    if (buyerPhone) {
      try {
        const { whatsappJid: buyerJid } = formatNigerianPhoneNumber(buyerPhone);
        const buyerNotice = `✅ *Ticket Transfer Confirmation*
For Light and Truth

Hello ${buyerName},

You have successfully transferred your *GOSA 2026 Convention Pass* (Ref: ${targetRecord.paymentReference}) to:

👤 *Recipient:* ${cleanName}
📱 *Phone:* ${displayPhone}
🏷️ *Reason:* ${
          transferType === "gift"
            ? "Gift 🎁"
            : transferType === "on_behalf"
            ? "Purchased on Behalf 🤝"
            : "Transfer 🎟️"
        }

The recipient has been notified with their pass credentials. Thank you for your continued support!`;

        await Wasender.httpSenderMessage({
          to: buyerJid,
          text: buyerNotice,
        });
        console.log(`[TICKET-TRANSFER] WhatsApp confirmation sent to buyer ${buyerJid}`);
      } catch (buyerWaErr) {
        console.warn("[TICKET-TRANSFER] Buyer WhatsApp confirmation failed:", buyerWaErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ticket pass to ${cleanName}`,
      data: {
        ticketId: targetRecord._id.toString(),
        ticketPassUrl: passUrl,
        newOwner: {
          fullName: cleanName,
          phoneNumber: displayPhone,
          email: cleanEmail,
        },
        previousOwner: {
          fullName: buyerName,
          phoneNumber: buyerPhone,
        },
        transferType,
        personalNote: cleanNote || null,
      },
    });
  } catch (error: any) {
    console.error("Error transferring ticket:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error during transfer" },
      { status: 500 }
    );
  }
}
