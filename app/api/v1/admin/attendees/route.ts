import { NextRequest, NextResponse } from "next/server";
import { AdminUtils } from "@/lib/utils/admin.utils";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const service = searchParams.get("service") || "";

    // Get all attendees data
    const allAttendees = await AdminUtils.getAllAttendees();

    // Apply filters
    let filteredAttendees = allAttendees;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendees = filteredAttendees.filter(
        (attendee) =>
          attendee.name.toLowerCase().includes(searchLower) ||
          attendee.email.toLowerCase().includes(searchLower) ||
          attendee.phone.includes(search),
      );
    }

    if (service && service !== "all") {
      filteredAttendees = filteredAttendees.filter(
        (attendee) =>
          attendee.services[service as keyof typeof attendee.services],
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAttendees = filteredAttendees.slice(startIndex, endIndex);

    const totalAttendees = filteredAttendees.length;
    const totalPages = Math.ceil(totalAttendees / limit);

    return NextResponse.json({
      success: true,
      data: {
        attendees: paginatedAttendees,
        pagination: {
          currentPage: page,
          totalPages,
          totalAttendees,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
        filters: {
          search,
          service,
        },
      },
    });
  } catch (error: any) {
    console.error("Get attendees error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve attendee data",
      },
      { status: 500 },
    );
  }
}
