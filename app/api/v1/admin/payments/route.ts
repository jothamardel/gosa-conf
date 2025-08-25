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
    const service = searchParams.get("service") || "";
    const status = searchParams.get("status") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Get all payments data
    const allPayments = await AdminUtils.getAllPayments();

    // Apply filters
    let filteredPayments = allPayments;

    if (service && service !== "all") {
      filteredPayments = filteredPayments.filter((payment) =>
        payment.service.toLowerCase().includes(service.toLowerCase()),
      );
    }

    if (status && status !== "all") {
      filteredPayments = filteredPayments.filter(
        (payment) => payment.status === status,
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredPayments = filteredPayments.filter(
        (payment) => payment.createdAt >= fromDate,
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filteredPayments = filteredPayments.filter(
        (payment) => payment.createdAt <= toDate,
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    const totalPayments = filteredPayments.length;
    const totalPages = Math.ceil(totalPayments / limit);

    // Calculate summary statistics for filtered data
    const totalAmount = filteredPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const confirmedPayments = filteredPayments.filter(
      (p) => p.status === "confirmed",
    ).length;
    const pendingPayments = filteredPayments.filter(
      (p) => p.status === "pending",
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        payments: paginatedPayments,
        pagination: {
          currentPage: page,
          totalPages,
          totalPayments,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
        summary: {
          totalAmount,
          confirmedPayments,
          pendingPayments,
          averageAmount: totalPayments > 0 ? totalAmount / totalPayments : 0,
        },
        filters: {
          service,
          status,
          dateFrom,
          dateTo,
        },
      },
    });
  } catch (error: any) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve payment data",
      },
      { status: 500 },
    );
  }
}
