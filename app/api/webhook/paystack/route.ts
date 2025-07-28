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
  );
  console.log(response);

  return NextResponse.json({
    message: "Successful",
    success: true,
  });
}
