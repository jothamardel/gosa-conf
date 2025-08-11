import { NextRequest, NextResponse } from "next/server";
import { AccommodationUtils } from "@/lib/utils/accommodation.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { Payment } from "@/lib/paystack-api";
import { IAccommodationGuest } from "@/lib/schema";

interface AccommodationBookingRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  accommodationType: 'standard' | 'premium' | 'luxury';
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  guestDetails: IAccommodationGuest[];
  specialRequests?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AccommodationBookingRequest = await req.json();

    // Validate required fields
    if (!body?.email || !body?.fullName || !body?.phoneNumber ||
      !body?.accommodationType || !body?.checkInDate || !body?.checkOutDate ||
      !body?.numberOfGuests || !body?.guestDetails) {
      return NextResponse.json({
        success: false,
        message: "Please provide all required fields: email, fullName, phoneNumber, accommodationType, checkInDate, checkOutDate, numberOfGuests, and guestDetails",
      }, { status: 400 });
    }

    // Validate accommodation type
    if (!['standard', 'premium', 'luxury'].includes(body.accommodationType)) {
      return NextResponse.json({
        success: false,
        message: "Invalid accommodation type. Must be 'standard', 'premium', or 'luxury'",
      }, { status: 400 });
    }

    // Parse and validate dates
    const checkInDate = new Date(body.checkInDate);
    const checkOutDate = new Date(body.checkOutDate);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({
        success: false,
        message: "Invalid date format. Please provide valid ISO date strings",
      }, { status: 400 });
    }

    // Validate dates
    const dateValidation = AccommodationUtils.validateDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      return NextResponse.json({
        success: false,
        message: dateValidation.message || "Date validation failed",
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
    const guestValidation = AccommodationUtils.validateGuestDetails(body.guestDetails);
    if (!guestValidation.valid) {
      return NextResponse.json({
        success: false,
        message: "Guest details validation failed",
        errors: guestValidation.errors,
      }, { status: 400 });
    }

    // Check availability
    const availability = await AccommodationUtils.checkAvailability(
      body.accommodationType,
      checkInDate,
      checkOutDate
    );

    if (!availability.available) {
      return NextResponse.json({
        success: false,
        message: `No ${body.accommodationType} rooms available for the selected dates`,
      }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = AccommodationUtils.calculateTotalAmount(
      body.accommodationType,
      checkInDate,
      checkOutDate,
      body.numberOfGuests
    );

    // Find or create user
    const user = await UserUtils.findOrCreateUser({
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
        type: 'accommodation',
        userId: (user as any)._id.toString(),
        accommodationType: body.accommodationType,
        numberOfGuests: body.numberOfGuests,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
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

    // Create accommodation booking record
    const booking = await AccommodationUtils.createBooking({
      userId: (user as any)._id,
      paymentReference,
      accommodationType: body.accommodationType,
      checkInDate,
      checkOutDate,
      numberOfGuests: body.numberOfGuests,
      guestDetails: body.guestDetails,
      specialRequests: body.specialRequests,
      totalAmount,
    });

    return NextResponse.json({
      success: true,
      message: "Accommodation booking created and payment initialized",
      data: {
        user,
        booking,
        paymentLink: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        totalAmount,
        nights: AccommodationUtils.calculateNights(checkInDate, checkOutDate),
        accommodationDetails: AccommodationUtils.getAccommodationTypeDetails(body.accommodationType),
      },
    });

  } catch (error: any) {
    console.error("Error creating accommodation booking:", error);
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
    const accommodationType = searchParams.get("accommodationType") as 'standard' | 'premium' | 'luxury' | null;

    const options: any = { page, limit };
    if (confirmed !== null) {
      options.confirmed = confirmed === "true";
    }
    if (accommodationType && ['standard', 'premium', 'luxury'].includes(accommodationType)) {
      options.accommodationType = accommodationType;
    }

    const result = await AccommodationUtils.getAllBookings(options);

    return NextResponse.json({
      success: true,
      message: "Accommodation bookings fetched successfully",
      data: result.bookings,
      pagination: result.pagination,
    });

  } catch (error: any) {
    console.error("Error fetching accommodation bookings:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch accommodation bookings",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

// GET endpoint for checking availability
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { accommodationType, checkInDate, checkOutDate } = body;

    if (!accommodationType || !checkInDate || !checkOutDate) {
      return NextResponse.json({
        success: false,
        message: "Please provide accommodationType, checkInDate, and checkOutDate",
      }, { status: 400 });
    }

    if (!['standard', 'premium', 'luxury'].includes(accommodationType)) {
      return NextResponse.json({
        success: false,
        message: "Invalid accommodation type",
      }, { status: 400 });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({
        success: false,
        message: "Invalid date format",
      }, { status: 400 });
    }

    const availability = await AccommodationUtils.checkAvailability(
      accommodationType,
      checkIn,
      checkOut
    );

    const accommodationDetails = AccommodationUtils.getAccommodationTypeDetails(accommodationType);
    const nights = AccommodationUtils.calculateNights(checkIn, checkOut);
    const totalAmount = AccommodationUtils.calculateTotalAmount(accommodationType, checkIn, checkOut, 1);

    return NextResponse.json({
      success: true,
      message: "Availability checked successfully",
      data: {
        availability,
        accommodationDetails,
        nights,
        pricePerNight: accommodationDetails.price,
        totalAmount,
      },
    });

  } catch (error: any) {
    console.error("Error checking accommodation availability:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to check availability",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}