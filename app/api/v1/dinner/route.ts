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
    const body: DinnerReservationRequest = await req.json();

    // Validate required fields
    if (!body?.email || !body?.fullName || !body?.phoneNumber || !body?.numberOfGuests || !body?.guestDetails) {
      return NextResponse.json({
        success: false,
        message: "Please provide email, fullName, phoneNumber, numberOfGuests, and guestDetails",
      }, { status: 400 });
    }

    // Validate number of guests
    if (body.numberOfGuests < 1 || body.numberOfGuests > 10) {
      return NextResponse.json({
        success: false,
        message: "Number of guests must be between 1 and 10",
      }, { status: 400 });
    }

    // Validate guest details count matches numberOfGuests
    if (body.guestDetails.length !== body.numberOfGuests) {
      return NextResponse.json({
        success: false,
        message: "Number of guest details must match numberOfGuests",
      }, { status: 400 });
    }

    // Validate guest details
    const guestValidation = DinnerUtils.validateGuestDetails(body.guestDetails);
    if (!guestValidation.valid) {
      return NextResponse.json({
        success: false,
        message: "Guest details validation failed",
        errors: guestValidation.errors,
      }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = DinnerUtils.calculateTotalAmount(body.numberOfGuests);

    // Find or create user
    const user: any = await UserUtils.findOrCreateUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
    });

    // Initialize payment with Paystack
    const paymentData = {
      email: body.email,
      amount: totalAmount,
      callback_url: `${process.env.NEXTAUTH_URL}/api/webhook/paystack`,
      metadata: {
        type: 'dinner',
        userId: user._id.toString(),
        numberOfGuests: body.numberOfGuests,
      },
    };

    const paymentResponse = await Payment.httpInitializePayment(paymentData);

    if (!paymentResponse?.data?.reference) {
      return NextResponse.json({
        success: false,
        message: "Failed to initialize payment",
      }, { status: 500 });
    }

    // Create payment reference with pattern: PaystackReference_phoneNumber
    const paymentReference = `${paymentResponse.data.reference}_${body.phoneNumber}`;

    // Create dinner reservation record
    const reservation = await DinnerUtils.createReservation({
      userId: user._id,
      paymentReference,
      numberOfGuests: body.numberOfGuests,
      guestDetails: body.guestDetails,
      specialRequests: body.specialRequests,
      totalAmount,
    });

    return NextResponse.json({
      success: true,
      message: "Dinner reservation created and payment initialized",
      data: {
        user,
        reservation,
        paymentLink: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        totalAmount,
      },
    });

  } catch (error: any) {
    console.error("Error creating dinner reservation:", error);
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