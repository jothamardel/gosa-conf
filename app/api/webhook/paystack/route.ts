import { generateQrCode } from "@/lib/utils";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log(body?.data?.reference);

  if (!body?.data?.reference) {
    return NextResponse.json({
      message: "Failed!",
      success: false,
    });
  }
  await ConventionUtils.findAndConfirmMany(body?.data?.reference);
  const response = await ConventionUtils.findMany(body?.data?.reference);

  await generateQrCode(
    // @ts-ignore
    response,
    //   {
    //   fullName: response?.userId?.fullName,
    //   phoneNumber: response?.userId?.phoneNumber,
    //   reference: response?.paymentReference || (body?.data?.reference as string),
    //   quantity: response?.quantity,
    //   persons: response?.persons,
    // }
  );
  console.log(response);

  // receive webhook
  // get reference
  // check the reference in DB
  // confirm payment
  // generate QRCODE
  // send to whatsapp number
  return NextResponse.json({
    message: "Successful",
    success: true,
  });
}
