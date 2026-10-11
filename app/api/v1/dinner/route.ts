import { NextRequest, NextResponse } from "next/server";
import { DinnerUtils } from "@/lib/utils/dinner.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { Payment } from "@/lib/paystack-api";
import { IGuestDetail } from "@/lib/schema";

interface DinnerReservationRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  numberOfGuests: number;
  guestDetails: IGuestDetail[];
  specialRequests?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_DISABLE_WEB_PAYMENTS === "true") {
      return NextResponse.json({
        success: false,
        message: "Direct website payments are currently paused. Please complete your dinner reservation via our official WhatsApp bot GOSA Bilkwas at 08102481754.",
        whatsappUrl: "https://wa.me/2348102481754?text=Hello%20GOSA%20Bilkwas%2C%20I%20want%20to%20reserve%20a%20dinner%20ticket",
      }, { status: 403 });
    }

    const body: DinnerReservationRequest = await req.json();
    console.log('Enhanced dinner reservation request:', body);

    // Enhanced validation for all guests
    const validation = DinnerUtils.validateEnhancedReservationData(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      }, { status: 400 });
    }

    // Calculate total amount and per-guest amount
    const totalAmount = DinnerUtils.calculateTotalAmount(body.numberOfGuests);
    const amountPerGuest = totalAmount / body.numberOfGuests;
    console.log(`💰 Total: ₦${totalAmount}, Per Guest: ₦${amountPerGuest}`);

    // Format primary contact phone number
    const formattedPrimaryPhone = DinnerUtils.formatPhoneNumber(body.phoneNumber);

    // Create primary contact user
    const primaryUser = await UserUtils.findOrCreateUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: formattedPrimaryPhone,
    });

    // Initialize payment with Paystack
    const paymentData = {
      email: body.email,
      amount: totalAmount,
      callback_url: `${process.env.NEXTAUTH_URL}/api/webhook/paystack`,
      metadata: {
        type: 'dinner',
        numberOfGuests: body.numberOfGuests,
        primaryUserId: (primaryUser as any)._id.toString(),
      },
    };

    const paymentResponse = await Payment.httpInitializePayment(paymentData);

    if (!paymentResponse?.data?.reference) {
      return NextResponse.json({
        success: false,
        message: "Failed to initialize payment",
      }, { status: 500 });
    }

    // CLEAN APPROACH: Create only individual reservations (1 guest = 1 document)
    const allReservations = [];

    for (let i = 0; i < body.guestDetails.length; i++) {
      const guest = body.guestDetails[i];
      console.log(`🎫 Creating reservation ${i + 1}/${body.numberOfGuests} for: ${guest.name}`);

      // Format guest phone number
      const formattedGuestPhone = DinnerUtils.formatPhoneNumber(guest.phone);

      // Create user record for each guest
      const guestUser = await UserUtils.findOrCreateUser({
        fullName: guest.name,
        email: guest.email,
        phoneNumber: formattedGuestPhone,
      });

      // Clean payment reference: PaystackRef_PhoneNumber (no index needed)
      const guestPaymentReference = `${paymentResponse.data.reference}_${formattedGuestPhone.replace('+', '')}`;

      console.log(`📋 Guest ${i + 1} details:`, {
        name: guest.name,
        phone: formattedGuestPhone,
        paymentReference: guestPaymentReference,
        amount: amountPerGuest
      });

      // Create individual reservation (1 guest = 1 document)
      const guestReservation = await DinnerUtils.createReservation({
        userId: (guestUser as any)._id,
        paymentReference: guestPaymentReference,
        numberOfGuests: 1,  // Always 1 for individual reservations
        guestDetails: [guest],  // Only this guest's details
        specialRequests: body.specialRequests,
        totalAmount: amountPerGuest,  // Individual amount (₦3,200)
        isPrimaryContact: i === 0,  // First guest is primary contact
        guestIndex: i,  // Track position in group
      });

      console.log(`✅ Created reservation for ${guest.name}:`, {
        id: guestReservation._id,
        paymentReference: guestReservation.paymentReference,
        amount: guestReservation.totalAmount
      });

      allReservations.push(guestReservation);
    }

    console.log(`✅ Created ${allReservations.length} individual reservations (1 guest = 1 document)`);
    console.log(`🔍 Verification: Expected ${body.numberOfGuests} reservations, Created ${allReservations.length} reservations`);

    // Log all created reservations for debugging
    allReservations.forEach((res, index) => {
      console.log(`📄 Created reservation ${index + 1}:`, {
        id: res._id,
        paymentReference: res.paymentReference,
        guestName: res.guestDetails[0]?.name,
        amount: res.totalAmount
      });
    });

    if (allReservations.length !== body.numberOfGuests) {
      console.error(`🚨 MISMATCH: Expected ${body.numberOfGuests} reservations but created ${allReservations.length}!`);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${body.numberOfGuests} individual dinner reservations`,
      data: {
        paymentLink: paymentResponse.data.authorization_url,
        reservations: allReservations,
        totalAmount,
        amountPerGuest,
        paystackReference: paymentResponse.data.reference,
        numberOfGuests: body.numberOfGuests,
        createdCount: allReservations.length,
      },
    });

  } catch (error: any) {
    console.error("Enhanced dinner reservation error:", error);
    return NextResponse.json({
      success: false,
      message: "Something went wrong",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const confirmed = searchParams.get("confirmed");

    const options: any = { page, limit };
    if (confirmed !== null) {
      options.confirmed = confirmed === "true";
    }

    const result = await DinnerUtils.getAllReservations(options);

    return NextResponse.json({
      success: true,
      message: "Dinner reservations fetched successfully",
      data: result.reservations,
      pagination: result.pagination,
    });

  } catch (error: any) {
    console.error("Error fetching dinner reservations:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch dinner reservations",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}