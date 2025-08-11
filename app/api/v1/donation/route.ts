import { NextRequest, NextResponse } from "next/server";
import { DonationUtils } from "@/lib/utils/donation.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { Payment } from "@/lib/paystack-api";

interface DonationRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  anonymous: boolean;
  onBehalfOf?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DonationRequest = await req.json();

    // Validate required fields
    if (!body?.email || !body?.fullName || !body?.phoneNumber ||
      !body?.amount || body?.anonymous === undefined) {
      return NextResponse.json({
        success: false,
        message: "Please provide all required fields: email, fullName, phoneNumber, amount, and anonymous",
      }, { status: 400 });
    }

    // Validate donation amount
    const amountValidation = DonationUtils.validateDonationAmount(body.amount);
    if (!amountValidation.valid) {
      return NextResponse.json({
        success: false,
        message: amountValidation.message || "Donation amount validation failed",
      }, { status: 400 });
    }

    // Validate donor information
    const donorValidation = DonationUtils.validateDonorInfo({
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      anonymous: body.anonymous,
    });
    if (!donorValidation.valid) {
      return NextResponse.json({
        success: false,
        message: donorValidation.message || "Donor information validation failed",
      }, { status: 400 });
    }

    // Find or create user
    const user: any = await UserUtils.findOrCreateUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
    });

    // Initialize payment with Paystack
    const paymentData = {
      email: body.email,
      amount: body.amount,
      callback_url: `${process.env.NEXTAUTH_URL}/api/webhook/paystack`,
      metadata: {
        type: 'donation',
        userId: user._id.toString(),
        anonymous: body.anonymous,
        onBehalfOf: body.onBehalfOf || null,
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

    // Create donation record
    const donation = await DonationUtils.createDonation({
      userId: user._id,
      paymentReference,
      amount: body.amount,
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      donorPhone: body.donorPhone,
      anonymous: body.anonymous,
      onBehalfOf: body.onBehalfOf,
    });

    return NextResponse.json({
      success: true,
      message: "Donation created and payment initialized",
      data: {
        user,
        donation,
        paymentLink: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        amount: body.amount,
        receiptNumber: donation.receiptNumber,
      },
    });

  } catch (error: any) {
    console.error("Error creating donation:", error);
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
    const anonymous = searchParams.get("anonymous");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Handle search requests
    if (search) {
      const options: any = { page, limit };
      if (confirmed !== null) {
        options.confirmed = confirmed === "true";
      }

      const result = await DonationUtils.searchDonations(search, options);
      return NextResponse.json({
        success: true,
        message: "Donation search completed",
        data: result.donations,
        pagination: result.pagination,
      });
    }

    // Handle date range requests
    if (startDate && endDate) {
      const options: any = { page, limit };
      if (confirmed !== null) {
        options.confirmed = confirmed === "true";
      }

      const result = await DonationUtils.getDonationsByDateRange(
        new Date(startDate),
        new Date(endDate),
        options
      );

      return NextResponse.json({
        success: true,
        message: "Donations by date range fetched successfully",
        data: result.donations,
        pagination: result.pagination,
        summary: result.summary,
      });
    }

    // Handle regular listing with filters
    const options: any = { page, limit };
    if (confirmed !== null) {
      options.confirmed = confirmed === "true";
    }
    if (anonymous !== null) {
      options.anonymous = anonymous === "true";
    }
    if (minAmount) {
      options.minAmount = parseFloat(minAmount);
    }
    if (maxAmount) {
      options.maxAmount = parseFloat(maxAmount);
    }

    const result = await DonationUtils.getAllDonations(options);

    return NextResponse.json({
      success: true,
      message: "Donations fetched successfully",
      data: result.donations,
      pagination: result.pagination,
    });

  } catch (error: any) {
    console.error("Error fetching donations:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch donations",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

// PUT endpoint for validation, statistics, and reports
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "validate") {
      const { amount, donorInfo } = body;

      if (amount === undefined || !donorInfo) {
        return NextResponse.json({
          success: false,
          message: "Please provide amount and donorInfo for validation",
        }, { status: 400 });
      }

      const amountValidation = DonationUtils.validateDonationAmount(amount);
      const donorValidation = DonationUtils.validateDonorInfo(donorInfo);

      return NextResponse.json({
        success: true,
        message: "Validation completed",
        data: {
          amountValidation,
          donorValidation,
          isValid: amountValidation.valid && donorValidation.valid,
        },
      });
    }

    if (action === "statistics") {
      const stats = await DonationUtils.getDonationStatistics();
      return NextResponse.json({
        success: true,
        message: "Statistics fetched successfully",
        data: stats,
      });
    }

    if (action === "top-donors") {
      const { limit = 10 } = body;
      const topDonors = await DonationUtils.getTopDonors(limit);
      return NextResponse.json({
        success: true,
        message: "Top donors fetched successfully",
        data: topDonors,
      });
    }

    if (action === "report") {
      const { startDate, endDate, includeAnonymous = true } = body;

      const options: any = { includeAnonymous };
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);

      const report = await DonationUtils.generateDonationReport(options);
      return NextResponse.json({
        success: true,
        message: "Donation report generated successfully",
        data: report,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action. Supported actions: 'validate', 'statistics', 'top-donors', 'report'",
    }, { status: 400 });

  } catch (error: any) {
    console.error("Error processing donation request:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process request",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}