import { NextRequest, NextResponse } from "next/server";
import { BrochureUtils } from "@/lib/utils/brochure.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { Payment } from "@/lib/paystack-api";
import { IBrochureRecipient } from "@/lib/schema";

interface BrochureOrderRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  quantity: number;
  brochureType: 'digital' | 'physical';
  recipientDetails: IBrochureRecipient[];
}

export async function POST(req: NextRequest) {
  try {
    const body: BrochureOrderRequest = await req.json();

    // Validate required fields
    if (!body?.email || !body?.fullName || !body?.phoneNumber ||
      !body?.quantity || !body?.brochureType || !body?.recipientDetails) {
      return NextResponse.json({
        success: false,
        message: "Please provide all required fields: email, fullName, phoneNumber, quantity, brochureType, and recipientDetails",
      }, { status: 400 });
    }

    // Validate brochure type
    if (!['digital', 'physical'].includes(body.brochureType)) {
      return NextResponse.json({
        success: false,
        message: "Invalid brochure type. Must be 'digital' or 'physical'",
      }, { status: 400 });
    }

    // Validate quantity
    if (body.quantity < 1 || body.quantity > 50) {
      return NextResponse.json({
        success: false,
        message: "Quantity must be between 1 and 50",
      }, { status: 400 });
    }

    // Validate recipient details
    const recipientValidation = BrochureUtils.validateRecipientDetails(body.recipientDetails);
    if (!recipientValidation.valid) {
      return NextResponse.json({
        success: false,
        message: recipientValidation.message || "Recipient details validation failed",
      }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = BrochureUtils.calculateTotalAmount(body.quantity, body.brochureType);

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
        type: 'brochure',
        userId: user._id.toString(),
        brochureType: body.brochureType,
        quantity: body.quantity,
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

    // Create brochure order record
    const order = await BrochureUtils.createOrder({
      userId: (user as any)._id,
      paymentReference,
      quantity: body.quantity,
      brochureType: body.brochureType,
      recipientDetails: body.recipientDetails,
      totalAmount,
    });

    // Get brochure pricing info
    const pricingInfo = BrochureUtils.getPricingInfo();

    return NextResponse.json({
      success: true,
      message: "Brochure order created and payment initialized",
      data: {
        user,
        order,
        paymentLink: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        totalAmount,
        brochureType: body.brochureType,
        quantity: body.quantity,
        pricePerUnit: pricingInfo[body.brochureType],
      },
    });

  } catch (error: any) {
    console.error("Error creating brochure order:", error);
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
    const brochureType = searchParams.get("brochureType") as 'digital' | 'physical' | null;
    const collected = searchParams.get("collected");

    const options: any = { page, limit };
    if (confirmed !== null) {
      options.confirmed = confirmed === "true";
    }
    if (brochureType && ['digital', 'physical'].includes(brochureType)) {
      options.brochureType = brochureType;
    }
    if (collected !== null) {
      options.collected = collected === "true";
    }

    const result = await BrochureUtils.getAllOrders(options);

    return NextResponse.json({
      success: true,
      message: "Brochure orders fetched successfully",
      data: result.orders,
      pagination: result.pagination,
    });

  } catch (error: any) {
    console.error("Error fetching brochure orders:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch brochure orders",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}

// PUT endpoint for calculating pricing
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { brochureType, quantity } = body;

    if (!brochureType || !quantity) {
      return NextResponse.json({
        success: false,
        message: "Please provide brochureType and quantity",
      }, { status: 400 });
    }

    if (!['digital', 'physical'].includes(brochureType)) {
      return NextResponse.json({
        success: false,
        message: "Invalid brochure type",
      }, { status: 400 });
    }

    if (quantity < 1 || quantity > 50) {
      return NextResponse.json({
        success: false,
        message: "Quantity must be between 1 and 50",
      }, { status: 400 });
    }

    const pricingInfo = BrochureUtils.getPricingInfo();
    const pricePerUnit = pricingInfo[brochureType as 'digital' | 'physical'];
    const totalAmount = BrochureUtils.calculateTotalAmount(quantity, brochureType);

    return NextResponse.json({
      success: true,
      message: "Pricing calculated successfully",
      data: {
        brochureType,
        quantity,
        pricePerUnit,
        totalAmount,
        pricingInfo,
      },
    });

  } catch (error: any) {
    console.error("Error calculating brochure pricing:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to calculate pricing",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}