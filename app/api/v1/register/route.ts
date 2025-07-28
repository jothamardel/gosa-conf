import { Payment } from "@/lib/paystack-api";
import { IUser } from "@/lib/schema";
import { RegistrationType } from "@/lib/types";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { UserUtils } from "@/lib/utils/user.utils";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const body: RegistrationType = await req.json();

    if (!body?.email || !body?.amount || !body?.quantity) {
      return NextResponse.json({
        success: false,
        message: "Please provide email, quantity and amount",
      });
    }
    console.log(body);
    const newUser = await UserUtils.findOrCreateUser(body);
    const paymentUrl = await Payment.httpInitializePayment(body);
    const newConventionRecord = await ConventionUtils.createRegistration({
      amount: body?.amount,
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
