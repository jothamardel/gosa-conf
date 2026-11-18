import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Accommodation,
  GoodwillMessage,
  Donation,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';

export type TicketCategory =
  | 'convention'
  | 'dinner'
  | 'brochure'
  | 'accommodation'
  | 'goodwill'
  | 'donation';

export type SaleStatusFilter = 'all' | 'sold' | 'created';
export type ChannelFilter = 'all' | 'online' | 'walkin';
export type CheckInFilter = 'all' | 'checkedIn' | 'pending';

export interface TicketReportFilters {
  types?: TicketCategory[];
  saleStatus?: SaleStatusFilter;
  channel?: ChannelFilter;
  checkInStatus?: CheckInFilter;
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
}

export interface NormalizedTicketRecord {
  id: string;
  category: TicketCategory;
  categoryLabel: string;
  paymentReference: string;
  channel: 'Walk-In' | 'Online';
  saleState: 'Sold (Confirmed)' | 'Created (Pending)' | 'Cancelled';
  status: string;
  confirmed: boolean;
  amount: number;
  quantity: number;
  checkInCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  collected: boolean;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  house: string;
  year: string;
  details: string;
  createdAt: string;
}

export interface CategorySummary {
  category: TicketCategory;
  label: string;
  createdCount: number;
  soldCount: number;
  pendingCount: number;
  cancelledCount: number;
  soldRevenue: number;
  createdValue: number;
  checkedInCount: number;
  checkInRate: number;
  walkinCount: number;
  walkinRevenue: number;
  onlineCount: number;
  onlineRevenue: number;
}

export interface DailyTrendPoint {
  date: string;
  createdCount: number;
  soldCount: number;
  soldRevenue: number;
}

export interface GroupBreakdownPoint {
  name: string;
  count: number;
  revenue: number;
}

export interface TicketReportSummary {
  generatedAt: string;
  filters: {
    types: TicketCategory[];
    saleStatus: SaleStatusFilter;
    channel: ChannelFilter;
    checkInStatus: CheckInFilter;
    startDate: string | null;
    endDate: string | null;
    allTime: boolean;
  };
  totals: {
    totalCreatedCount: number;
    totalSoldCount: number;
    totalPendingCount: number;
    totalCancelledCount: number;
    totalSoldRevenue: number;
    totalCreatedValue: number;
    totalCheckedInCount: number;
    checkInRate: number;
    walkinCount: number;
    walkinRevenue: number;
    onlineCount: number;
    onlineRevenue: number;
  };
  byCategory: CategorySummary[];
  dailyTrend: DailyTrendPoint[];
  byHouse: GroupBreakdownPoint[];
  byYear: GroupBreakdownPoint[];
}

export const ALL_TICKET_CATEGORIES: TicketCategory[] = [
  'convention',
  'dinner',
  'brochure',
  'accommodation',
  'goodwill',
  'donation',
];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  convention: 'Convention Ticket',
  dinner: 'Dinner Ticket',
  brochure: 'Convention Brochure',
  accommodation: 'Accommodation',
  goodwill: 'Goodwill Message',
  donation: 'Donation',
};

function buildDateQuery(filters: TicketReportFilters): Record<string, any> {
  if (filters.allTime && !filters.startDate && !filters.endDate) {
    return {};
  }

  const createdAt: Record<string, Date> = {};
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    if (!isNaN(start.getTime())) {
      createdAt.$gte = start;
    }
  } else if (!filters.allTime) {
    createdAt.$gte = CONVENTION_2026_START_DATE;
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    if (!isNaN(end.getTime())) {
      // Include the entire end date day
      end.setUTCHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
  }

  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

function getChannel(paymentReference?: string): 'Walk-In' | 'Online' {
  return paymentReference && /^WALKIN_/i.test(paymentReference) ? 'Walk-In' : 'Online';
}

function getSaleState(
  confirmedFlag: boolean,
  status?: string
): 'Sold (Confirmed)' | 'Created (Pending)' | 'Cancelled' {
  const normalizedStatus = (status || '').toLowerCase();
  if (normalizedStatus === 'cancelled') {
    return 'Cancelled';
  }
  if (confirmedFlag || normalizedStatus === 'confirmed' || normalizedStatus === 'upgraded') {
    return 'Sold (Confirmed)';
  }
  return 'Created (Pending)';
}

function extractUserFields(user: any) {
  if (!user || typeof user !== 'object') {
    return {
      fullName: 'Unknown',
      email: '',
      phoneNumber: '',
      house: '',
      year: '',
      checkInCode: '',
    };
  }
  return {
    fullName: user.fullName || 'Unknown',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    house: user.house || '',
    year: user.year || '',
    checkInCode: user.checkInCode || '',
  };
}

export async function fetchNormalizedTicketRecords(
  filters: TicketReportFilters = {}
): Promise<{
  records: NormalizedTicketRecord[];
  resolvedFilters: TicketReportSummary['filters'];
}> {
  const selectedTypes: TicketCategory[] =
    filters.types && filters.types.length > 0
      ? filters.types.filter((t): t is TicketCategory => ALL_TICKET_CATEGORIES.includes(t))
      : [...ALL_TICKET_CATEGORIES];

  const saleStatus: SaleStatusFilter = filters.saleStatus || 'all';
  const channelFilter: ChannelFilter = filters.channel || 'all';
  const checkInStatus: CheckInFilter = filters.checkInStatus || 'all';
  const allTime = Boolean(filters.allTime);

  const dateQuery = buildDateQuery({ ...filters, allTime });

  const [
    conventions,
    dinners,
    brochures,
    accommodations,
    goodwills,
    donations,
  ] = await Promise.all([
    selectedTypes.includes('convention')
      ? ConventionRegistration.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    selectedTypes.includes('dinner')
      ? DinnerReservation.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    selectedTypes.includes('brochure')
      ? ConventionBrochure.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    selectedTypes.includes('accommodation')
      ? Accommodation.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    selectedTypes.includes('goodwill')
      ? GoodwillMessage.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    selectedTypes.includes('donation')
      ? Donation.find(dateQuery)
          .populate('userId', 'fullName email phoneNumber house year checkInCode')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const normalized: NormalizedTicketRecord[] = [];

  for (const c of conventions as any[]) {
    const user = extractUserFields(c.userId);
    const saleState = getSaleState(Boolean(c.confirm), c.status);
    normalized.push({
      id: String(c._id),
      category: 'convention',
      categoryLabel: CATEGORY_LABELS.convention,
      paymentReference: c.paymentReference || '',
      channel: getChannel(c.paymentReference),
      saleState,
      status: c.status || (c.confirm ? 'confirmed' : 'pending'),
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(c.amount || 0),
      quantity: Number(c.quantity || 1),
      checkInCode: c.checkInCode || user.checkInCode || '',
      checkedIn: Boolean(c.checkedIn || c.checkIn),
      checkedInAt: c.checkedInAt ? new Date(c.checkedInAt).toISOString() : null,
      collected: Boolean(c.collected),
      attendeeName: user.fullName,
      attendeeEmail: user.email,
      attendeePhone: user.phoneNumber,
      house: user.house,
      year: user.year,
      details: c.upgradedTo?.ticketType
        ? `Upgraded to ${c.upgradedTo.ticketType}`
        : `Qty: ${c.quantity || 1}`,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  for (const d of dinners as any[]) {
    const user = extractUserFields(d.userId);
    const saleState = getSaleState(Boolean(d.confirmed), d.status);
    const primaryGuest = Array.isArray(d.guestDetails) && d.guestDetails.length > 0 ? d.guestDetails[0] : null;
    normalized.push({
      id: String(d._id),
      category: 'dinner',
      categoryLabel: CATEGORY_LABELS.dinner,
      paymentReference: d.paymentReference || '',
      channel: getChannel(d.paymentReference),
      saleState,
      status: d.status || (d.confirmed ? 'confirmed' : 'pending'),
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(d.totalAmount || 0),
      quantity: Number(d.numberOfGuests || 1),
      checkInCode: d.checkInCode || user.checkInCode || '',
      checkedIn: Boolean(d.checkedIn),
      checkedInAt: d.checkedInAt ? new Date(d.checkedInAt).toISOString() : null,
      collected: false,
      attendeeName: primaryGuest?.name || user.fullName,
      attendeeEmail: primaryGuest?.email || user.email,
      attendeePhone: primaryGuest?.phone || user.phoneNumber,
      house: user.house,
      year: user.year,
      details: `Guests: ${d.numberOfGuests || 1}${d.specialRequests ? ` | ${d.specialRequests}` : ''}`,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  for (const b of brochures as any[]) {
    const user = extractUserFields(b.userId);
    const saleState = getSaleState(Boolean(b.confirmed), b.status);
    const isCollectedOrCheckedIn = Boolean(b.collected || b.checkedIn);
    normalized.push({
      id: String(b._id),
      category: 'brochure',
      categoryLabel: CATEGORY_LABELS.brochure,
      paymentReference: b.paymentReference || '',
      channel: getChannel(b.paymentReference),
      saleState,
      status: b.status || (b.confirmed ? 'confirmed' : 'pending'),
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(b.totalAmount || 0),
      quantity: Number(b.quantity || 1),
      checkInCode: b.checkInCode || user.checkInCode || '',
      checkedIn: isCollectedOrCheckedIn,
      checkedInAt: b.checkedInAt ? new Date(b.checkedInAt).toISOString() : null,
      collected: Boolean(b.collected),
      attendeeName: user.fullName,
      attendeeEmail: user.email,
      attendeePhone: user.phoneNumber,
      house: user.house,
      year: user.year,
      details: `Type: ${b.brochureType || 'digital'} | Qty: ${b.quantity || 1}`,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  for (const a of accommodations as any[]) {
    const user = extractUserFields(a.userId);
    const saleState = getSaleState(Boolean(a.confirmed), a.status);
    normalized.push({
      id: String(a._id),
      category: 'accommodation',
      categoryLabel: CATEGORY_LABELS.accommodation,
      paymentReference: a.paymentReference || '',
      channel: getChannel(a.paymentReference),
      saleState,
      status: a.status || (a.confirmed ? 'confirmed' : 'pending'),
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(a.totalAmount || 0),
      quantity: Number(a.numberOfGuests || 1),
      checkInCode: a.confirmationCode || user.checkInCode || '',
      checkedIn: Boolean(a.checkedIn),
      checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toISOString() : null,
      collected: false,
      attendeeName: user.fullName,
      attendeeEmail: user.email,
      attendeePhone: user.phoneNumber,
      house: user.house,
      year: user.year,
      details: `${a.accommodationType || 'standard'} | Guests: ${a.numberOfGuests || 1}`,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  for (const g of goodwills as any[]) {
    const user = extractUserFields(g.userId);
    const saleState = getSaleState(Boolean(g.confirmed), g.confirmed ? 'confirmed' : 'pending');
    normalized.push({
      id: String(g._id),
      category: 'goodwill',
      categoryLabel: CATEGORY_LABELS.goodwill,
      paymentReference: g.paymentReference || '',
      channel: getChannel(g.paymentReference),
      saleState,
      status: g.confirmed ? 'confirmed' : 'pending',
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(g.donationAmount || 0),
      quantity: 1,
      checkInCode: user.checkInCode || '',
      checkedIn: Boolean(g.approved),
      checkedInAt: g.approvedAt ? new Date(g.approvedAt).toISOString() : null,
      collected: false,
      attendeeName: g.anonymous ? 'Anonymous' : g.attributionName || user.fullName,
      attendeeEmail: user.email,
      attendeePhone: user.phoneNumber,
      house: user.house,
      year: user.year,
      details: g.approved ? 'Approved message' : 'Awaiting approval',
      createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  for (const dn of donations as any[]) {
    const user = extractUserFields(dn.userId);
    const saleState = getSaleState(Boolean(dn.confirmed), dn.confirmed ? 'confirmed' : 'pending');
    normalized.push({
      id: String(dn._id),
      category: 'donation',
      categoryLabel: CATEGORY_LABELS.donation,
      paymentReference: dn.paymentReference || '',
      channel: getChannel(dn.paymentReference),
      saleState,
      status: dn.confirmed ? 'confirmed' : 'pending',
      confirmed: saleState === 'Sold (Confirmed)',
      amount: Number(dn.amount || 0),
      quantity: 1,
      checkInCode: dn.receiptNumber || '',
      checkedIn: Boolean(dn.confirmed),
      checkedInAt: null,
      collected: false,
      attendeeName: dn.anonymous ? 'Anonymous' : dn.onBehalfOf || dn.donorName || user.fullName,
      attendeeEmail: dn.donorEmail || user.email,
      attendeePhone: dn.donorPhone || user.phoneNumber,
      house: user.house,
      year: user.year,
      details: dn.receiptNumber ? `Receipt: ${dn.receiptNumber}` : 'Donation',
      createdAt: dn.createdAt ? new Date(dn.createdAt).toISOString() : new Date().toISOString(),
    });
  }

  // Apply post-normalization filters
  const filtered = normalized.filter((rec) => {
    if (saleStatus === 'sold' && rec.saleState !== 'Sold (Confirmed)') {
      return false;
    }
    if (saleStatus === 'created' && rec.saleState === 'Sold (Confirmed)') {
      return false;
    }
    if (channelFilter === 'walkin' && rec.channel !== 'Walk-In') {
      return false;
    }
    if (channelFilter === 'online' && rec.channel !== 'Online') {
      return false;
    }
    if (checkInStatus === 'checkedIn' && !rec.checkedIn) {
      return false;
    }
    if (checkInStatus === 'pending' && rec.checkedIn) {
      return false;
    }
    return true;
  });

  // Sort newest first across all categories
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    records: filtered,
    resolvedFilters: {
      types: selectedTypes,
      saleStatus,
      channel: channelFilter,
      checkInStatus,
      startDate: filters.startDate || (!allTime ? CONVENTION_2026_START_DATE.toISOString().slice(0, 10) : null),
      endDate: filters.endDate || null,
      allTime,
    },
  };
}

export function buildTicketReportSummary(
  records: NormalizedTicketRecord[],
  resolvedFilters: TicketReportSummary['filters']
): TicketReportSummary {
  const categoryMap = new Map<TicketCategory, CategorySummary>();
  for (const cat of resolvedFilters.types) {
    categoryMap.set(cat, {
      category: cat,
      label: CATEGORY_LABELS[cat],
      createdCount: 0,
      soldCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      soldRevenue: 0,
      createdValue: 0,
      checkedInCount: 0,
      checkInRate: 0,
      walkinCount: 0,
      walkinRevenue: 0,
      onlineCount: 0,
      onlineRevenue: 0,
    });
  }

  const dailyMap = new Map<string, DailyTrendPoint>();
  const houseMap = new Map<string, GroupBreakdownPoint>();
  const yearMap = new Map<string, GroupBreakdownPoint>();

  let totalCreatedCount = 0;
  let totalSoldCount = 0;
  let totalPendingCount = 0;
  let totalCancelledCount = 0;
  let totalSoldRevenue = 0;
  let totalCreatedValue = 0;
  let totalCheckedInCount = 0;
  let walkinCount = 0;
  let walkinRevenue = 0;
  let onlineCount = 0;
  let onlineRevenue = 0;

  for (const r of records) {
    totalCreatedCount += 1;
    totalCreatedValue += r.amount;

    const isSold = r.saleState === 'Sold (Confirmed)';
    const isCancelled = r.saleState === 'Cancelled';
    const isPending = r.saleState === 'Created (Pending)';

    if (isSold) {
      totalSoldCount += 1;
      totalSoldRevenue += r.amount;
    } else if (isCancelled) {
      totalCancelledCount += 1;
    } else if (isPending) {
      totalPendingCount += 1;
    }

    if (r.checkedIn) {
      totalCheckedInCount += 1;
    }

    if (r.channel === 'Walk-In') {
      walkinCount += 1;
      if (isSold) walkinRevenue += r.amount;
    } else {
      onlineCount += 1;
      if (isSold) onlineRevenue += r.amount;
    }

    const catSummary = categoryMap.get(r.category);
    if (catSummary) {
      catSummary.createdCount += 1;
      catSummary.createdValue += r.amount;
      if (isSold) {
        catSummary.soldCount += 1;
        catSummary.soldRevenue += r.amount;
      } else if (isCancelled) {
        catSummary.cancelledCount += 1;
      } else {
        catSummary.pendingCount += 1;
      }
      if (r.checkedIn) {
        catSummary.checkedInCount += 1;
      }
      if (r.channel === 'Walk-In') {
        catSummary.walkinCount += 1;
        if (isSold) catSummary.walkinRevenue += r.amount;
      } else {
        catSummary.onlineCount += 1;
        if (isSold) catSummary.onlineRevenue += r.amount;
      }
    }

    // Daily trend
    const dayKey = r.createdAt.slice(0, 10);
    const dayEntry = dailyMap.get(dayKey) || {
      date: dayKey,
      createdCount: 0,
      soldCount: 0,
      soldRevenue: 0,
    };
    dayEntry.createdCount += 1;
    if (isSold) {
      dayEntry.soldCount += 1;
      dayEntry.soldRevenue += r.amount;
    }
    dailyMap.set(dayKey, dayEntry);

    // House breakdown
    const houseKey = r.house?.trim() || 'Unspecified';
    const houseEntry = houseMap.get(houseKey) || { name: houseKey, count: 0, revenue: 0 };
    houseEntry.count += 1;
    if (isSold) houseEntry.revenue += r.amount;
    houseMap.set(houseKey, houseEntry);

    // Year breakdown
    const yearKey = r.year?.trim() || 'Unspecified';
    const yearEntry = yearMap.get(yearKey) || { name: yearKey, count: 0, revenue: 0 };
    yearEntry.count += 1;
    if (isSold) yearEntry.revenue += r.amount;
    yearMap.set(yearKey, yearEntry);
  }

  const byCategory = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    checkInRate: c.soldCount > 0 ? Math.round((c.checkedInCount / c.soldCount) * 100) : 0,
  }));

  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const byHouse = Array.from(houseMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const byYear = Array.from(yearMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    generatedAt: new Date().toISOString(),
    filters: resolvedFilters,
    totals: {
      totalCreatedCount,
      totalSoldCount,
      totalPendingCount,
      totalCancelledCount,
      totalSoldRevenue,
      totalCreatedValue,
      totalCheckedInCount,
      checkInRate: totalSoldCount > 0 ? Math.round((totalCheckedInCount / totalSoldCount) * 100) : 0,
      walkinCount,
      walkinRevenue,
      onlineCount,
      onlineRevenue,
    },
    byCategory,
    dailyTrend,
    byHouse,
    byYear,
  };
}

export function parseReportFiltersFromSearchParams(searchParams: URLSearchParams): TicketReportFilters {
  const typesParam = searchParams.get('types');
  const types = typesParam
    ? (typesParam
        .split(',')
        .map((t) => t.trim())
        .filter((t): t is TicketCategory => ALL_TICKET_CATEGORIES.includes(t as TicketCategory)))
    : undefined;

  const saleStatusParam = searchParams.get('saleStatus');
  const saleStatus: SaleStatusFilter =
    saleStatusParam === 'sold' || saleStatusParam === 'created' ? saleStatusParam : 'all';

  const channelParam = searchParams.get('channel');
  const channel: ChannelFilter =
    channelParam === 'online' || channelParam === 'walkin' ? channelParam : 'all';

  const checkInParam = searchParams.get('checkInStatus');
  const checkInStatus: CheckInFilter =
    checkInParam === 'checkedIn' || checkInParam === 'pending' ? checkInParam : 'all';

  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const allTime = searchParams.get('allTime') === 'true';

  return {
    types,
    saleStatus,
    channel,
    checkInStatus,
    startDate,
    endDate,
    allTime,
  };
}

