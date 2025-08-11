import { NextRequest, NextResponse } from "next/server";
import { GoodwillUtils } from "@/lib/utils/goodwill.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { Payment } from "@/lib/paystack-api";

interface GoodwillMessageRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  message: string;
  donationAmount: number;
  attributionName?: string;
  anonymous: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: GoodwillMessageRequest = await req.json();

    // Validate required fields
    if (!body?.email || !body?.fullName || !body?.phoneNumber ||
      !body?.message || !body?.donationAmount || body?.anonymous === undefined) {
      return NextResponse.json({
        success: false,
        message: "Please provide all required fields: email, fullName, phoneNumber, message, donationAmount, and anonymous",
      }, { status: 400 });
    }

    // Validate message
    const messageValidation = GoodwillUtils.validateMessage(body.message);
    if (!messageValidation.valid) {
      return NextResponse.json({
        success: false,
        message: "Message validation failed",
        errors: messageValidation.errors,
      }, { status: 400 });
    }

    // Validate donation amount
    const amountValidation = GoodwillUtils.validateDonationAmount(body.donationAmount);
    if (!amountValidation.valid) {
      return NextResponse.json({
        success: false,
        message: "Donation amount validation failed",
        errors: amountValidation.errors,
      }, { status: 400 });
    }

    // Find or create user
    const user = await UserUtils.findOrCreateUser({
      fullName: body.fullName,
      email: body.email,
      phoneNumber: body.phoneNumber,
    });

    // Initialize payment with Paystack
    const paymentData = {
      email: body.email,
      amount: body.donationAmount,
      callback_url: `${process.env.NEXTAUTH_URL}/api/webhook/paystack`,
      metadata: {
        type: 'goodwill',
        userId: user._id.toString(),
        anonymous: body.anonymous,
        messageLength: body.message.length,
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

    // Create goodwill message record
    const message = await GoodwillUtils.createMessage({
      userId: user._id,
      paymentReference,
      message: body.message,
      donationAmount: body.donationAmount,
      attributionName: body.attributionName,
      anonymous: body.anonymous,
    });

    return NextResponse.json({
      success: true,
      message: "Goodwill message created and payment initialized",
      data: {
        user,
        goodwillMessage: message,
        paymentLink: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        donationAmount: body.donationAmount,
        requiresApproval: true,
      },
    });

  } catch (error: any) {
    console.error("Error creating goodwill message:", error);
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
    const approved = searchParams.get("approved");
    const anonymous = searchParams.get("anonymous");
    const pending = searchParams.get("pending");

    let result;

    if (pending === "true") {
      // Get pending messages for admin approval
      result = await GoodwillUtils.getPendingMessages({ page, limit });
    } else if (approved === "true") {
      // Get approved messages for public display
      const options: any = { page, limit };
      if (anonymous !== null) {
        options.anonymous = anonymous === "true";
      }
      result = await GoodwillUtils.getApprovedMessages(options);
    } else {
      // Get all messages with filters
      const options: any = { page, limit };
      if (confirmed !== null) {
        options.confirmed = confirmed === "true";
      }
      if (approved !== null) {
        options.approved = approved === "true";
      }
      if (anonymous !== null) {
        options.anonymous = anonymous === "true";
      }
      result = await GoodwillUtils.getAllMessages(options);
    }

    return NextResponse.json({
      success: true,
      message: "Goodwill messages fetched successfully",
      data: result.messages,
      pagination: result.pagination,
    });

  } catch (error: any) {
    console.error("Error fetching goodwill messages:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch goodwill messages",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

// PUT endpoint for message validation and statistics
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, message, donationAmount } = body;

    if (action === "validate") {
      if (!message || donationAmount === undefined) {
        return NextResponse.json({
          success: false,
          message: "Please provide message and donationAmount for validation",
        }, { status: 400 });
      }

      const messageValidation = GoodwillUtils.validateMessage(message);
      const amountValidation = GoodwillUtils.validateDonationAmount(donationAmount);

      return NextResponse.json({
        success: true,
        message: "Validation completed",
        data: {
          messageValidation,
          amountValidation,
          isValid: messageValidation.valid && amountValidation.valid,
          characterCount: message.length,
          remainingCharacters: 500 - message.length,
        },
      });
    }

    if (action === "statistics") {
      const stats = await GoodwillUtils.getMessageStatistics();
      return NextResponse.json({
        success: true,
        message: "Statistics fetched successfully",
        data: stats,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action. Supported actions: 'validate', 'statistics'",
    }, { status: 400 });

  } catch (error: any) {
    console.error("Error processing goodwill request:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process request",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}