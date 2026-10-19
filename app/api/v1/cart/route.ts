import { NextRequest, NextResponse } from "next/server";
import { Payment } from "@/lib/paystack-api";
import { UserUtils } from "@/lib/utils/user.utils";
import connectDB from "@/lib/mongodb";
import {
  Transaction,
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
} from "@/lib/schema";
import { QRCodeService } from "@/lib/services/qr-code.service";

export interface CartItemInput {
  type: 'convention' | 'dinner' | 'brochure' | 'donation';
  quantity?: number;
  amount?: number;
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_DISABLE_WEB_PAYMENTS === "true") {
      return NextResponse.json({
        success: false,
        message: "Direct website payments are currently paused. Please complete your registration via our official WhatsApp bot GOSA Bilkwas at 08102481754.",
        whatsappUrl: "https://wa.me/2348102481754",
      }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, phoneNumber, items, packageKey, packageName } = body;

    if (!fullName || !email || !phoneNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Please provide fullName, email, phoneNumber, and at least one item.",
      }, { status: 400 });
    }

    await connectDB();

    // Standardized prices matching official convention rates
    const PRICING: Record<string, number> = {
      convention: process.env.NEXT_APP_REGISTRATION_FEE ? +process.env.NEXT_APP_REGISTRATION_FEE : 1000,
      dinner: process.env.NEXT_APP_DINNER_FEE ? +process.env.NEXT_APP_DINNER_FEE : 2500,
      brochure: process.env.NEXT_APP_BROCHURE_PHYSICAL_FEE ? +process.env.NEXT_APP_BROCHURE_PHYSICAL_FEE : 2000,
      donation: 0,
    };

    let baseSubtotal = 0;
    const validatedItems: Array<{ type: string; quantity: number; amount: number; unitPrice: number }> = [];

    for (const item of items as CartItemInput[]) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = item.type === 'donation' ? (Number(item.amount) || 0) : (PRICING[item.type] ?? 0);
      const lineTotal = unitPrice * qty;
      baseSubtotal += lineTotal;

      validatedItems.push({
        type: item.type,
        quantity: qty,
        unitPrice,
        amount: lineTotal,
      });
    }

    if (baseSubtotal <= 0) {
      return NextResponse.json({
        success: false,
        message: "Invalid cart total amount.",
      }, { status: 400 });
    }

    // Paystack fee calculation: 1.5% + 100 (if >= 2500), otherwise 1.5%
    let grandTotal = baseSubtotal;
    if (baseSubtotal < 2500) {
      grandTotal = Math.ceil(baseSubtotal / 0.985);
    } else {
      grandTotal = Math.ceil((baseSubtotal + 100) / 0.985);
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');

    // Find or create user
    const user: any = await UserUtils.findOrCreateUser({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: cleanPhone,
    });

    const paymentReference = `cart_${Date.now()}_${cleanPhone.replace(/\D/g, '')}`;

    // Initialize Paystack payment
    const callbackUrl = `${process.env.NEXTAUTH_URL || 'https://events.gosanigeria.ng'}/ticket`;
    const paystackRes = await Payment.httpInitializePayment({
      email: user.email,
      amount: grandTotal,
      reference: paymentReference,
      callback_url: callbackUrl,
      metadata: {
        type: 'cart',
        userId: user._id.toString(),
        items: validatedItems,
        baseSubtotal,
        grandTotal,
        packageKey: packageKey || 'custom',
        packageName: packageName || 'Convention Package',
      },
    });

    if (!paystackRes?.status || !paystackRes?.data?.authorization_url) {
      return NextResponse.json({
        success: false,
        message: "Failed to initialize payment with Paystack.",
      }, { status: 500 });
    }

    // Create the cart Transaction
    await Transaction.create({
      userId: user._id,
      paymentReference,
      amount: grandTotal,
      type: 'cart',
      status: 'pending',
      source: 'web_portal_packages',
      metadata: {
        items: validatedItems,
        baseTotalAmount: baseSubtotal,
        packageName: packageName || packageKey,
      },
    });

    // Create pending records in respective collections with prefixed references
    for (let index = 0; index < validatedItems.length; index++) {
      const item = validatedItems[index];
      const itemRef = `${paymentReference}_${item.type}_${index}`;

      if (item.type === 'convention') {
        await ConventionRegistration.create({
          userId: user._id,
          paymentReference: itemRef,
          amount: item.amount,
          quantity: item.quantity,
          confirm: false,
          collected: false,
          persons: [],
        });
      } else if (item.type === 'dinner') {
        await DinnerReservation.create({
          userId: user._id,
          paymentReference: itemRef,
          numberOfGuests: item.quantity,
          guestDetails: Array(item.quantity).fill({
            name: user.fullName,
            email: user.email,
            phone: user.phoneNumber,
          }),
          amount: item.amount,
          confirmed: false,
          collected: false,
        });
      } else if (item.type === 'brochure') {
        const qrCode = QRCodeService.generateUniqueQRData(
          'brochure',
          itemRef,
          'physical'
        );
        await ConventionBrochure.create({
          userId: user._id,
          paymentReference: itemRef,
          quantity: item.quantity,
          brochureType: 'physical',
          totalAmount: item.amount,
          recipientDetails: Array(item.quantity).fill({
            name: user.fullName,
            email: user.email,
            phone: user.phoneNumber,
          }),
          qrCode,
          confirmed: false,
          collected: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Checkout initialized",
      paymentLink: paystackRes.data.authorization_url,
      reference: paymentReference,
      grandTotal,
      baseSubtotal,
    });
  } catch (err: any) {
    console.error("Cart package checkout error:", err);
    return NextResponse.json({
      success: false,
      message: err?.message || "Checkout failed. Please try again.",
      error: err,
    }, { status: 500 });
  }
}
