import { Payment } from "@/lib/paystack-api";
import { IUser } from "@/lib/schema";
import { RegistrationType } from "@/lib/types";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_DISABLE_WEB_PAYMENTS === "true") {
      return NextResponse.json({
        success: false,
        message: "Direct website payments are currently paused. Please complete your registration via our official WhatsApp bot GOSA Bilkwas at 08102481754.",
        whatsappUrl: "https://wa.me/2348102481754?text=Hello%20GOSA%20Bilkwas%2C%20I%20want%20to%20register%20and%20purchase%20a%20convention%20ticket",
      }, { status: 403 });
    }

    const body: RegistrationType = await req.json();

    if (!body?.email || !body?.fullName || !body?.phoneNumber || !body?.amount || !body?.quantity) {
      return NextResponse.json({
        success: false,
        message: "Please provide email, fullName, phoneNumber, quantity and amount",
      });
    }
    console.log(body);
    const newUser = await UserUtils.findOrCreateUser(body);

    // Calculate base registration subtotal and grand total with Paystack charges
    const baseRegistrationFee = 1000;
    const quantity = Math.max(1, body.quantity || 1);
    const baseSubtotal = baseRegistrationFee * quantity;
    const { calculatePaystackTotal } = await import("@/lib/utils/price-formatter");
    const totalPayable = calculatePaystackTotal(baseSubtotal);

    const paymentUrl = await Payment.httpInitializePayment({
      ...body,
      amount: totalPayable,
    });

    const newConventionRecord = await ConventionUtils.createRegistration({
      amount: baseSubtotal,
      paymentReference: `${paymentUrl?.data?.reference}_${body?.phoneNumber}`,
      quantity: body?.quantity,
      userId: new mongoose.Types.ObjectId(newUser?._id as string),
      confirm: false,
      collected: false,
      persons: body?.persons || [],
    });

    if (body?.persons?.length > 0) {
      for (const person of body?.persons) {
        await ConventionUtils.createRegistration({
          amount: body?.amount / body?.quantity,
          // @ts-ignore
          paymentReference: `${paymentUrl?.data?.reference}_${person?.phoneNumber}`,
          quantity: 1,
          userId: new mongoose.Types.ObjectId(newUser?._id as string),
          confirm: false,
          collected: false,
          persons: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment link generated",
      data: newUser,
      paymentLink: paymentUrl,
      convention: newConventionRecord,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: "Something went wrong",
      error: err?.response,
      stack: err?.stack,
    });
  }
}

export async function GET(req: NextRequest) {
  const data = await UserUtils.getAllUser(req);
  return NextResponse.json({
    data: data?.users,
    pagination: { ...data?.pagination },
    success: true,
    message: "Fetched all users.",
  });
}
