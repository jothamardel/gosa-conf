import jsPDF from 'jspdf';
import type { TicketReportSummary } from '@/lib/services/ticket-report.service';

function formatNgn(amount: number): string {
  return `NGN ${Math.round(amount || 0).toLocaleString('en-US')}`;
}

export function downloadTicketReportPdf(summary: TicketReportSummary): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // Header Banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, y, contentWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GOSA 2026 Convention - Ticket & Revenue Report', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const generatedLabel = `Generated: ${new Date(summary.generatedAt).toLocaleString('en-US')}`;
  doc.text(generatedLabel, margin + 5, y + 16);
  y += 28;

  // Applied Filters Box
  doc.setTextColor(55, 65, 81);
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('APPLIED FILTERS', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateLabel = summary.filters.allTime
    ? 'All-Time'
    : `${summary.filters.startDate || '2026-01-01'} to ${summary.filters.endDate || 'Present'}`;
  const filterLine1 = `Categories: ${summary.filters.types.join(', ')}`;
  const filterLine2 = `Sale Status: ${summary.filters.saleStatus} | Channel: ${summary.filters.channel} | Check-In: ${summary.filters.checkInStatus} | Range: ${dateLabel}`;
  doc.text(filterLine1.slice(0, 105), margin + 4, y + 10);
  doc.text(filterLine2.slice(0, 105), margin + 4, y + 14);
  y += 22;

  // KPI Summary Grid (2 rows x 3 cols)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Executive Summary', margin, y);
  y += 4;

  const kpis = [
    { label: 'Total Created', value: summary.totals.totalCreatedCount.toLocaleString() },
    { label: 'Total Sold (Confirmed)', value: summary.totals.totalSoldCount.toLocaleString() },
    { label: 'Pending / Cancelled', value: `${summary.totals.totalPendingCount} / ${summary.totals.totalCancelledCount}` },
    { label: 'Sold Revenue', value: formatNgn(summary.totals.totalSoldRevenue) },
    { label: 'Check-In / Verified', value: `${summary.totals.totalCheckedInCount} (${summary.totals.checkInRate}%)` },
    { label: 'Walk-In vs Online', value: `${summary.totals.walkinCount} / ${summary.totals.onlineCount}` },
  ];

  const cardW = (contentWidth - 8) / 3;
  const cardH = 16;
  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const cx = margin + col * (cardW + 4);
    const cy = y + row * (cardH + 3);
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, cy, cardW, cardH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(kpi.label, cx + 3, cy + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text(kpi.value, cx + 3, cy + 12.5);
  });
  y += cardH * 2 + 12;

  // Category Breakdown Table
  ensureSpace(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Breakdown by Category', margin, y);
  y += 4;

  const cols = [
    { header: 'Category', x: margin + 2, w: 38 },
    { header: 'Created', x: margin + 42, w: 16 },
    { header: 'Sold', x: margin + 58, w: 16 },
    { header: 'Pending', x: margin + 74, w: 16 },
    { header: 'Checked In', x: margin + 90, w: 22 },
    { header: 'Walk-In', x: margin + 112, w: 16 },
    { header: 'Sold Revenue', x: margin + 130, w: 50 },
  ];

  doc.setFillColor(31, 41, 55);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  cols.forEach((c) => doc.text(c.header, c.x, y + 4.8));
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  summary.byCategory.forEach((cat, idx) => {
    ensureSpace(8);
    if (idx % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }
    doc.setTextColor(17, 24, 39);
    doc.text(cat.label, cols[0].x, y + 4.5);
    doc.text(String(cat.createdCount), cols[1].x, y + 4.5);
    doc.text(String(cat.soldCount), cols[2].x, y + 4.5);
    doc.text(String(cat.pendingCount), cols[3].x, y + 4.5);
    doc.text(`${cat.checkedInCount} (${cat.checkInRate}%)`, cols[4].x, y + 4.5);
    doc.text(String(cat.walkinCount), cols[5].x, y + 4.5);
    doc.text(formatNgn(cat.soldRevenue), cols[6].x, y + 4.5);
    y += 6.5;
  });

  // Totals row
  ensureSpace(9);
  doc.setFillColor(236, 253, 245);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL', cols[0].x, y + 4.8);
  doc.text(String(summary.totals.totalCreatedCount), cols[1].x, y + 4.8);
  doc.text(String(summary.totals.totalSoldCount), cols[2].x, y + 4.8);
  doc.text(String(summary.totals.totalPendingCount), cols[3].x, y + 4.8);
  doc.text(`${summary.totals.totalCheckedInCount} (${summary.totals.checkInRate}%)`, cols[4].x, y + 4.8);
  doc.text(String(summary.totals.walkinCount), cols[5].x, y + 4.8);
  doc.text(formatNgn(summary.totals.totalSoldRevenue), cols[6].x, y + 4.8);
  y += 12;

  // Channel Split
  ensureSpace(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Sales Channel Split', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text(
    `Online: ${summary.totals.onlineCount.toLocaleString()} records (${formatNgn(summary.totals.onlineRevenue)})`,
    margin,
    y
  );
  y += 5;
  doc.text(
    `Walk-In Desk: ${summary.totals.walkinCount.toLocaleString()} records (${formatNgn(summary.totals.walkinRevenue)})`,
    margin,
    y
  );
  y += 10;

  // Recent Daily Trend (up to last 14 days in dataset)
  if (summary.dailyTrend.length > 0) {
    ensureSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Daily Activity (Most Recent Days)', margin, y);
    y += 4;

    const recentDays = summary.dailyTrend.slice(-14).reverse();
    doc.setFillColor(31, 41, 55);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Date', margin + 3, y + 4.5);
    doc.text('Created', margin + 50, y + 4.5);
    doc.text('Sold', margin + 85, y + 4.5);
    doc.text('Sold Revenue', margin + 120, y + 4.5);
    y += 6.5;

    doc.setFont('helvetica', 'normal');
    recentDays.forEach((d, idx) => {
      ensureSpace(7);
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setTextColor(17, 24, 39);
      doc.text(d.date, margin + 3, y + 4.2);
      doc.text(String(d.createdCount), margin + 50, y + 4.2);
      doc.text(String(d.soldCount), margin + 85, y + 4.2);
      doc.text(formatNgn(d.soldRevenue), margin + 120, y + 4.2);
      y += 6;
    });
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`gosa-ticket-report-${dateStamp}.pdf`);
}

