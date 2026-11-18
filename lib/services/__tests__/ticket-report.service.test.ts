import {
  buildTicketReportSummary,
  parseReportFiltersFromSearchParams,
  NormalizedTicketRecord,
  ALL_TICKET_CATEGORIES,
} from '../ticket-report.service';

describe('ticket-report.service', () => {
  it('parses search params into TicketReportFilters', () => {
    const params = new URLSearchParams(
      'types=convention,dinner&saleStatus=sold&channel=walkin&checkInStatus=checkedIn&allTime=true&startDate=2026-01-01&endDate=2026-12-31'
    );
    const parsed = parseReportFiltersFromSearchParams(params);
    expect(parsed.types).toEqual(['convention', 'dinner']);
    expect(parsed.saleStatus).toBe('sold');
    expect(parsed.channel).toBe('walkin');
    expect(parsed.checkInStatus).toBe('checkedIn');
    expect(parsed.allTime).toBe(true);
    expect(parsed.startDate).toBe('2026-01-01');
    expect(parsed.endDate).toBe('2026-12-31');
  });

  it('aggregates sold vs created, channel split, check-in rate, and daily trends accurately', () => {
    const records: NormalizedTicketRecord[] = [
      {
        id: '1',
        category: 'convention',
        categoryLabel: 'Convention Ticket',
        paymentReference: 'PAY_1',
        channel: 'Online',
        saleState: 'Sold (Confirmed)',
        status: 'confirmed',
        confirmed: true,
        amount: 1000,
        quantity: 1,
        checkInCode: 'GOSA-1',
        checkedIn: true,
        checkedInAt: '2026-08-01T10:00:00.000Z',
        collected: false,
        attendeeName: 'Alice',
        attendeeEmail: 'alice@example.com',
        attendeePhone: '08011111111',
        house: 'Red',
        year: '2010',
        details: 'Qty: 1',
        createdAt: '2026-08-01T09:00:00.000Z',
      },
      {
        id: '2',
        category: 'dinner',
        categoryLabel: 'Dinner Ticket',
        paymentReference: 'WALKIN_2',
        channel: 'Walk-In',
        saleState: 'Sold (Confirmed)',
        status: 'confirmed',
        confirmed: true,
        amount: 2500,
        quantity: 1,
        checkInCode: 'GOSA-2',
        checkedIn: false,
        checkedInAt: null,
        collected: false,
        attendeeName: 'Bob',
        attendeeEmail: 'bob@example.com',
        attendeePhone: '08022222222',
        house: 'Blue',
        year: '2012',
        details: 'Guests: 1',
        createdAt: '2026-08-01T11:00:00.000Z',
      },
      {
        id: '3',
        category: 'brochure',
        categoryLabel: 'Convention Brochure',
        paymentReference: 'PAY_3',
        channel: 'Online',
        saleState: 'Created (Pending)',
        status: 'pending',
        confirmed: false,
        amount: 2000,
        quantity: 1,
        checkInCode: '',
        checkedIn: false,
        checkedInAt: null,
        collected: false,
        attendeeName: 'Charlie',
        attendeeEmail: 'charlie@example.com',
        attendeePhone: '08033333333',
        house: 'Red',
        year: '2010',
        details: 'Type: digital | Qty: 1',
        createdAt: '2026-08-02T12:00:00.000Z',
      },
    ];

    const summary = buildTicketReportSummary(records, {
      types: [...ALL_TICKET_CATEGORIES],
      saleStatus: 'all',
      channel: 'all',
      checkInStatus: 'all',
      startDate: '2026-01-01',
      endDate: null,
      allTime: false,
    });

    expect(summary.totals.totalCreatedCount).toBe(3);
    expect(summary.totals.totalSoldCount).toBe(2);
    expect(summary.totals.totalPendingCount).toBe(1);
    expect(summary.totals.totalCancelledCount).toBe(0);
    expect(summary.totals.totalSoldRevenue).toBe(3500);
    expect(summary.totals.totalCreatedValue).toBe(5500);
    expect(summary.totals.totalCheckedInCount).toBe(1);
    expect(summary.totals.checkInRate).toBe(50);
    expect(summary.totals.walkinCount).toBe(1);
    expect(summary.totals.walkinRevenue).toBe(2500);
    expect(summary.totals.onlineCount).toBe(2);
    expect(summary.totals.onlineRevenue).toBe(1000);

    expect(summary.dailyTrend).toEqual([
      { date: '2026-08-01', createdCount: 2, soldCount: 2, soldRevenue: 3500 },
      { date: '2026-08-02', createdCount: 1, soldCount: 0, soldRevenue: 0 },
    ]);
  });
});

