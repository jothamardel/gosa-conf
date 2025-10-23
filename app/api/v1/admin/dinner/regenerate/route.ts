import { NextRequest, NextResponse } from "next/server";
import { DinnerUtils } from "@/lib/utils/dinner.utils";
import { UserUtils } from "@/lib/utils/user.utils";
// Import User model to ensure schema is registered in serverless environment
import { User } from "@/lib/schema/user.schema";

interface RegenerateTicketsRequest {
  reservationId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RegenerateTicketsRequest = await req.json();
    console.log('🎫 Regenerate tickets request:', body);

    if (!body.reservationId) {
      return NextResponse.json({
        success: false,
        message: "Reservation ID is required",
      }, { status: 400 });
    }

    // Regenerate and send tickets for all guests in the reservation
    const result = await DinnerUtils.regenerateAndSendTickets(body.reservationId);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.totalGuests} guests`,
      data: {
        totalGuests: result.totalGuests,
        newReservations: result.newReservations,
        existingReservations: result.existingReservations,
        ticketsSent: result.ticketsSent,
        errors: result.errors,
      },
    });

  } catch (error: any) {
    console.error("Error regenerating dinner tickets:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to regenerate tickets",
      error: error?.message || "Internal server error",
    }, { status: 500 });
  }
}