import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  buildTicketReportSummary,
  fetchNormalizedTicketRecords,
  parseReportFiltersFromSearchParams,
} from '@/lib/services/ticket-report.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const filters = parseReportFiltersFromSearchParams(searchParams);

    const { records, resolvedFilters } = await fetchNormalizedTicketRecords(filters);
    const summary = buildTicketReportSummary(records, resolvedFilters);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        totalRecords: records.length,
        recordsPreview: records.slice(0, 100),
      },
    });
  } catch (error: any) {
    console.error('Error generating ticket report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate ticket report',
      },
      { status: 500 }
    );
  }
}

