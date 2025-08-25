import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "Attendee";
    const title = searchParams.get("title") || "";
    const org = searchParams.get("org") || "";

    // Create a simple SVG badge
    const svg = `
      <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="400" height="500" fill="#16A34A"/>

        <!-- Header -->
        <rect x="0" y="0" width="400" height="80" fill="#15803D"/>
        <text x="200" y="30" text-anchor="middle" fill="white" font-size="18" font-weight="bold">GOSA CONVENTION</text>
        <text x="200" y="55" text-anchor="middle" fill="white" font-size="14">2024</text>

        <!-- Profile Photo Placeholder -->
        <circle cx="200" cy="150" r="50" fill="white" opacity="0.9"/>
        <text x="200" y="155" text-anchor="middle" fill="#16A34A" font-size="20">📷</text>

        <!-- Name -->
        <text x="200" y="240" text-anchor="middle" fill="white" font-size="24" font-weight="bold">${name}</text>

        ${title ? `<text x="200" y="270" text-anchor="middle" fill="white" font-size="16" opacity="0.9">${title}</text>` : ""}

        ${org ? `<text x="200" y="${title ? "295" : "270"}" text-anchor="middle" fill="white" font-size="14" opacity="0.8">${org}</text>` : ""}

        <!-- Footer -->
        <rect x="0" y="420" width="400" height="80" fill="#15803D"/>
        <text x="200" y="450" text-anchor="middle" fill="white" font-size="12">Welcome to GOSA Convention</text>
        <text x="200" y="470" text-anchor="middle" fill="white" font-size="10">www.gosa.org</text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Badge placeholder error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate badge placeholder",
      },
      { status: 500 },
    );
  }
}
