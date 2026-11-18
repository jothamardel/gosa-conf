import {
  buildTicketReportSummary,
  parseReportFiltersFromSearchParams,
  getBasePaymentReference,
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
        paymentVerification: 'Paystack Verified',
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
        paymentVerification: 'Desk / Walk-In',
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
        paymentVerification: 'Pending Tx',
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
      {
        id: '4',
        category: 'convention',
        categoryLabel: 'Convention Ticket',
        paymentReference: 'cart_1793361682906_08038306365_0',
        channel: 'Online',
        saleState: 'Unverified (Force-Confirmed)',
        paymentVerification: 'Unverified (No Paystack Tx)',
        status: 'confirmed',
        confirmed: false,
        amount: 2026000,
        quantity: 2026,
        checkInCode: 'AZYE-HB9F',
        checkedIn: true,
        checkedInAt: '2026-10-31T17:03:22.206Z',
        collected: false,
        attendeeName: 'Nanret Longkat',
        attendeeEmail: 'dnanret98@gmail.com',
        attendeePhone: '08038306365',
        house: 'nightangle',
        year: '2008',
        details: 'Qty: 2026',
        createdAt: '2026-10-30T12:01:23.875Z',
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

    expect(summary.totals.totalCreatedCount).toBe(4);
    expect(summary.totals.totalSoldCount).toBe(2);
    expect(summary.totals.totalPendingCount).toBe(1);
    expect(summary.totals.totalUnverifiedCount).toBe(1);
    expect(summary.totals.totalUnverifiedValue).toBe(2026000);
    expect(summary.totals.totalCancelledCount).toBe(0);
    expect(summary.totals.totalSoldRevenue).toBe(3500);
    expect(summary.totals.totalCreatedValue).toBe(2031500);
    expect(summary.totals.totalCheckedInCount).toBe(2);
    expect(summary.totals.checkInRate).toBe(100);
    expect(summary.totals.walkinCount).toBe(1);
    expect(summary.totals.walkinRevenue).toBe(2500);
    expect(summary.totals.onlineCount).toBe(3);
    expect(summary.totals.onlineRevenue).toBe(1000);

    expect(summary.dailyTrend).toEqual([
      { date: '2026-08-01', createdCount: 2, soldCount: 2, soldRevenue: 3500 },
      { date: '2026-08-02', createdCount: 1, soldCount: 0, soldRevenue: 0 },
      { date: '2026-10-30', createdCount: 1, soldCount: 0, soldRevenue: 0 },
    ]);
  });

  it('extracts base payment references for cart, dinner, and split records', () => {
    expect(getBasePaymentReference('cart_1793361682906_08038306365_0')).toBe(
      'cart_1793361682906_08038306365'
    );
    expect(getBasePaymentReference('cart_1793464601928_08137064079_dinner_0')).toBe(
      'cart_1793464601928_08137064079'
    );
    expect(
      getBasePaymentReference('buy_tickets_1793351859061_2347033949014_0_split_1793352777719')
    ).toBe('buy_tickets_1793351859061_2347033949014');
  });
});

