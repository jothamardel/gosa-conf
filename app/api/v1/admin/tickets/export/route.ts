import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectToDatabase } from '@/lib/mongodb';
import {
  buildTicketReportSummary,
  fetchNormalizedTicketRecords,
  NormalizedTicketRecord,
  parseReportFiltersFromSearchParams,
} from '@/lib/services/ticket-report.service';

export const dynamic = 'force-dynamic';

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toExportRow(r: NormalizedTicketRecord) {
  return {
    'Record ID': r.id,
    'Category': r.categoryLabel,
    'Sale State': r.saleState,
    'Payment Verification': r.paymentVerification,
    'Status': r.status,
    'Channel': r.channel,
    'Payment Reference': r.paymentReference,
    'Pass / Receipt Code': r.checkInCode,
    'Amount (NGN)': r.amount,
    'Quantity': r.quantity,
    'Attendee / Donor Name': r.attendeeName,
    'Email': r.attendeeEmail,
    'Phone': r.attendeePhone,
    'House': r.house,
    'Year / Set': r.year,
    'Checked In / Collected / Approved': r.checkedIn ? 'Yes' : 'No',
    'Checked In At': r.checkedInAt || '',
    'Details': r.details,
    'Created At': r.createdAt,
  };
}

function buildCsvContent(records: NormalizedTicketRecord[]): string {
  const headers = [
    'Record ID',
    'Category',
    'Sale State',
    'Payment Verification',
    'Status',
    'Channel',
    'Payment Reference',
    'Pass / Receipt Code',
    'Amount (NGN)',
    'Quantity',
    'Attendee / Donor Name',
    'Email',
    'Phone',
    'House',
    'Year / Set',
    'Checked In / Collected / Approved',
    'Checked In At',
    'Details',
    'Created At',
  ];

  const lines = [headers.map(escapeCsvField).join(',')];

  for (const r of records) {
    const row = toExportRow(r);
    lines.push(headers.map((h) => escapeCsvField(row[h as keyof typeof row])).join(','));
  }

  // Prepend UTF-8 BOM for Excel compatibility
  return '\uFEFF' + lines.join('\r\n');
}

function buildXlsxBuffer(
  records: NormalizedTicketRecord[],
  summary: ReturnType<typeof buildTicketReportSummary>
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    { Metric: 'Report Generated At', Value: summary.generatedAt },
    { Metric: 'Total Records Created', Value: summary.totals.totalCreatedCount },
    { Metric: 'Total Sold (Confirmed)', Value: summary.totals.totalSoldCount },
    { Metric: 'Total Pending (Unconfirmed)', Value: summary.totals.totalPendingCount },
    { Metric: 'Total Cancelled', Value: summary.totals.totalCancelledCount },
    { Metric: 'Total Sold Revenue (NGN)', Value: summary.totals.totalSoldRevenue },
    { Metric: 'Total Created Value (NGN)', Value: summary.totals.totalCreatedValue },
    { Metric: 'Total Checked In / Verified', Value: summary.totals.totalCheckedInCount },
    { Metric: 'Check-In Rate (%)', Value: summary.totals.checkInRate },
    { Metric: 'Walk-In Count', Value: summary.totals.walkinCount },
    { Metric: 'Walk-In Revenue (NGN)', Value: summary.totals.walkinRevenue },
    { Metric: 'Online Count', Value: summary.totals.onlineCount },
    { Metric: 'Online Revenue (NGN)', Value: summary.totals.onlineRevenue },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Category Breakdown
  const categoryRows = summary.byCategory.map((c) => ({
    'Category': c.label,
    'Created': c.createdCount,
    'Sold (Confirmed)': c.soldCount,
    'Pending': c.pendingCount,
    'Cancelled': c.cancelledCount,
    'Sold Revenue (NGN)': c.soldRevenue,
    'Created Value (NGN)': c.createdValue,
    'Checked In': c.checkedInCount,
    'Check-In Rate (%)': c.checkInRate,
    'Walk-In Count': c.walkinCount,
    'Walk-In Revenue (NGN)': c.walkinRevenue,
    'Online Count': c.onlineCount,
    'Online Revenue (NGN)': c.onlineRevenue,
  }));
  const categorySheet = XLSX.utils.json_to_sheet(categoryRows);
  categorySheet['!cols'] = [
    { wch: 22 },
    { wch: 10 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Breakdown');

  // Sheet 3: All Records
  const recordRows = records.map(toExportRow);
  const recordsSheet = XLSX.utils.json_to_sheet(
    recordRows.length > 0
      ? recordRows
      : [{ Info: 'No records matched the selected filters.' }]
  );
  recordsSheet['!cols'] = [
    { wch: 26 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 26 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 24 },
    { wch: 26 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 28 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, recordsSheet, 'All Records');

  // Sheet 4: Daily Trend
  const trendRows = summary.dailyTrend.map((d) => ({
    Date: d.date,
    'Created Count': d.createdCount,
    'Sold Count': d.soldCount,
    'Sold Revenue (NGN)': d.soldRevenue,
  }));
  const trendSheet = XLSX.utils.json_to_sheet(
    trendRows.length > 0 ? trendRows : [{ Info: 'No daily trend data.' }]
  );
  trendSheet['!cols'] = [{ wch: 14 }, { wch: 15 }, { wch: 13 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, trendSheet, 'Daily Trend');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const filters = parseReportFiltersFromSearchParams(searchParams);

    const { records, resolvedFilters } = await fetchNormalizedTicketRecords(filters);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `gosa-ticket-records-${dateStamp}`;

    if (format === 'xlsx') {
      const summary = buildTicketReportSummary(records, resolvedFilters);
      const buffer = buildXlsxBuffer(records, summary);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseFilename}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify({ success: true, count: records.length, records }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFilename}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default: CSV
    const csv = buildCsvContent(records);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseFilename}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error exporting ticket records:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export ticket records',
      },
      { status: 500 }
    );
  }
}

