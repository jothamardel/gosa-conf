import { generateQrCode } from "@/lib/utils";
import { ConventionUtils } from "@/lib/utils/convention.utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(body?.data?.reference);

    if (!body?.data?.reference) {
      return NextResponse.json({
        message: "Failed! No reference provided",
        success: false,
      });
    }

    // Confirm the payments
    await ConventionUtils.findAndConfirmMany(body?.data?.reference);

    // Get the confirmed data
    const response = await ConventionUtils.findMany(body?.data?.reference);
    console.log("Found records:", response);

    if (!response || response.length === 0) {
      return NextResponse.json({
        message: "No records found for the given reference",
        success: false,
      });
    }

    // Generate QR codes and send messages - now properly awaited
    const qrResults = await generateQrCode(response);

    console.log("QR code generation results:", qrResults);

    // Check if any operations failed
    const failedOperations = qrResults.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success),
    );

    if (failedOperations.length > 0) {
      console.error("Some operations failed:", failedOperations);
      return NextResponse.json({
        message: `Partially successful. ${qrResults.length - failedOperations.length} out of ${qrResults.length} operations completed successfully.`,
        success: true,
        details: qrResults,
      });
    }

    return NextResponse.json({
      message: "All QR codes generated and messages sent successfully",
      success: true,
      processed: qrResults.length,
      details: qrResults,
    });
  } catch (error) {
    console.error("Route handler error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
