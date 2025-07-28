import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    message: "API is runnning...",
    success: true,
  });
}
