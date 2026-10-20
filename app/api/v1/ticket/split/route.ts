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

interface SplitRequestPayload {
  ticketId: string;
  serviceCategory?: "convention" | "dinner";
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

    const body: SplitRequestPayload = await req.json();
    const { ticketId, serviceCategory, newOwner } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, message: "Ticket ID is required" },
        { status: 400 }
      );
    }

    if (!newOwner?.fullName || !newOwner?.phoneNumber) {
      return NextResponse.json(
        { success: false, message: "New owner's Full Name and Phone Number are required" },
        { status: 400 }
      );
    }

    const { displayPhone, whatsappJid } = formatNigerianPhoneNumber(newOwner.phoneNumber);
    const cleanName = newOwner.fullName.trim();
    const cleanEmail = (newOwner.email || `${displayPhone}@gosanigeria.ng`).trim().toLowerCase();

    const isValidObjectId = Types.ObjectId.isValid(ticketId);

    // 1. Locate the record to split
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

    // Fallback: If ticketId was a Transaction ID or generic payment reference
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

    // 2. Handle Convention Registration splitting
    if (targetConvention) {
      const currentQty = targetConvention.quantity || 1;
      if (currentQty < 2) {
        return NextResponse.json(
          {
            success: false,
            message: "This convention ticket only has 1 pass and cannot be divided further.",
          },
          { status: 400 }
        );
      }

      if (targetConvention.checkedIn) {
        return NextResponse.json(
          {
            success: false,
            message: "This ticket has already been checked in at the event and cannot be divided.",
          },
          { status: 400 }
        );
      }

      const totalAmount = targetConvention.amount || 0;
      const unitAmount = Math.round(totalAmount / currentQty);
      const newParentQty = currentQty - 1;
      const newParentAmount = Math.max(0, totalAmount - unitAmount);

      // Create or locate the new owner's User profile
      const newOwnerUser = await UserUtils.findOrCreateUser({
        fullName: cleanName,
        phoneNumber: displayPhone,
        email: cleanEmail,
        year: newOwner.year,
        house: newOwner.house,
      });

      // Update parent record's persons list by removing 1 person
      const currentPersons = Array.isArray(targetConvention.persons) ? [...targetConvention.persons] : [];
      let removedPersonIndex = -1;

      // Prefer removing a person whose phone matches the parent user, or pop the last entry
      if (currentPersons.length > 0) {
        removedPersonIndex = currentPersons.findIndex(
          (p: any) => p.phone === displayPhone || p.name?.toLowerCase() === cleanName.toLowerCase()
        );
        if (removedPersonIndex === -1) {
          removedPersonIndex = currentPersons.length - 1;
        }
        currentPersons.splice(removedPersonIndex, 1);
      }

      // Update parent record
      await ConventionRegistration.findByIdAndUpdate(targetConvention._id, {
        $set: {
          quantity: newParentQty,
          amount: newParentAmount,
          persons: currentPersons,
        },
      });

      // Create new detached ticket record
      const splitRef = `${targetConvention.paymentReference}_split_${Date.now()}`;
      const newTicketRecord = await ConventionRegistration.create({
        userId: newOwnerUser._id,
        paymentReference: splitRef,
        amount: unitAmount,
        quantity: 1,
        confirm: true,
        status: "confirmed",
        collected: false,
        checkIn: false,
        checkedIn: false,
        checkInHistory: [],
        persons: [
          {
            name: cleanName,
            phone: displayPhone,
            email: cleanEmail,
          },
        ],
      });

      const baseUrl = process.env.NEXTAUTH_URL || "https://events.gosanigeria.ng";
      const newPassUrl = `${baseUrl}/ticket?id=${newTicketRecord._id.toString()}`;

      // Dispatch automated WhatsApp notification to new owner
      try {
        const parentUser = await User.findById(targetConvention.userId);
        const buyerName = parentUser?.fullName || "A fellow GOSA alumnus";

        const textMessage = `🎉 *GOSA 2026 Convention Pass Transferred to You*
For Light and Truth

Hello ${cleanName},

${buyerName} has assigned a *GOSA 2026 Annual National Convention Registration Ticket* to you! 🎟️

👤 *Attendee Name:* ${cleanName}
📱 *Phone:* ${displayPhone}
🎟️ *Pass Link:* ${newPassUrl}

📍 *Venue:* Crispan Luxury Hotel, Jos, Plateau State
📅 *Dates:* Oct 31 – Nov 2, 2026

Please tap the link above to view and download your official E-Ticket with your QR code for verification at the event accreditation desk.

We look forward to welcoming you to the 2026 Convention!`;

        await Wasender.httpSenderMessage({
          to: whatsappJid,
          text: textMessage,
        });
        console.log(`[TICKET-SPLIT] WhatsApp notification sent to ${whatsappJid}`);
      } catch (waErr) {
        console.warn("[TICKET-SPLIT] Failed to send automated WhatsApp message:", waErr);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully detached 1 ticket and assigned to ${cleanName}`,
        data: {
          newTicketId: newTicketRecord._id.toString(),
          newTicketPassUrl: newPassUrl,
          newOwner: {
            fullName: cleanName,
            phoneNumber: displayPhone,
            email: cleanEmail,
          },
          serviceName: "Convention Registration Ticket",
          updatedParentId: targetConvention._id.toString(),
          remainingQuantity: newParentQty,
        },
      });
    }

    // 3. Handle Dinner Reservation splitting
    if (targetDinner) {
      const currentGuests = targetDinner.numberOfGuests || 1;
      if (currentGuests < 2) {
        return NextResponse.json(
          {
            success: false,
            message: "This dinner reservation only has 1 guest pass and cannot be divided further.",
          },
          { status: 400 }
        );
      }

      if (targetDinner.checkedIn) {
        return NextResponse.json(
          {
            success: false,
            message: "This dinner pass has already been checked in and cannot be divided.",
          },
          { status: 400 }
        );
      }

      const totalAmount = targetDinner.totalAmount || 0;
      const unitAmount = Math.round(totalAmount / currentGuests);
      const newParentGuests = currentGuests - 1;
      const newParentAmount = Math.max(0, totalAmount - unitAmount);

      const newOwnerUser = await UserUtils.findOrCreateUser({
        fullName: cleanName,
        phoneNumber: displayPhone,
        email: cleanEmail,
        year: newOwner.year,
        house: newOwner.house,
      });

      const currentGuestDetails = Array.isArray(targetDinner.guestDetails) ? [...targetDinner.guestDetails] : [];
      if (currentGuestDetails.length > 0) {
        currentGuestDetails.pop();
      }

      await DinnerReservation.findByIdAndUpdate(targetDinner._id, {
        $set: {
          numberOfGuests: newParentGuests,
          totalAmount: newParentAmount,
          guestDetails: currentGuestDetails,
        },
      });

      const splitRef = `${targetDinner.paymentReference}_split_${Date.now()}`;
      const newDinnerRecord = await DinnerReservation.create({
        userId: newOwnerUser._id,
        paymentReference: splitRef,
        totalAmount: unitAmount,
        numberOfGuests: 1,
        confirmed: true,
        status: "confirmed",
        checkedIn: false,
        checkInHistory: [],
        guestDetails: [
          {
            name: cleanName,
            phone: displayPhone,
            email: cleanEmail,
          },
        ],
      });

      const baseUrl = process.env.NEXTAUTH_URL || "https://events.gosanigeria.ng";
      const newPassUrl = `${baseUrl}/ticket?id=${newDinnerRecord._id.toString()}`;

      try {
        const parentUser = await User.findById(targetDinner.userId);
        const buyerName = parentUser?.fullName || "A fellow GOSA alumnus";

        const textMessage = `🍷 *GOSA 2026 Dinner Ticket Pass Transferred to You*
For Light and Truth

Hello ${cleanName},

${buyerName} has assigned a *GOSA 2026 Convention Dinner Pass* to you! 🍽️

👤 *Guest Name:* ${cleanName}
📱 *Phone:* ${displayPhone}
🎫 *Dinner Pass:* ${newPassUrl}

📍 *Venue:* Crispan Luxury Hotel, Jos, Plateau State
📅 *Dates:* Oct 31 – Nov 2, 2026

Please tap your pass link to view your verified dinner reservation.`;

        await Wasender.httpSenderMessage({
          to: whatsappJid,
          text: textMessage,
        });
      } catch (waErr) {
        console.warn("[TICKET-SPLIT] Dinner WhatsApp dispatch notice:", waErr);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully detached 1 dinner pass and assigned to ${cleanName}`,
        data: {
          newTicketId: newDinnerRecord._id.toString(),
          newTicketPassUrl: newPassUrl,
          newOwner: {
            fullName: cleanName,
            phoneNumber: displayPhone,
            email: cleanEmail,
          },
          serviceName: "Dinner Ticket Pass",
          updatedParentId: targetDinner._id.toString(),
          remainingQuantity: newParentGuests,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "No dividable ticket or reservation could be matched for this ID." },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error splitting ticket:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
