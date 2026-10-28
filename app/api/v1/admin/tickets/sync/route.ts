import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';
import { getCheckInActiveStatus } from '@/lib/utils/checkin-settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    const limit = Math.min(2000, parseInt(searchParams.get('limit') || '1500', 10));

    const checkinActive = await getCheckInActiveStatus();

    let dateFilter: any = { createdAt: { $gte: CONVENTION_2026_START_DATE } };
    if (sinceParam) {
      const sinceDate = new Date(parseInt(sinceParam, 10));
      if (!isNaN(sinceDate.getTime())) {
        dateFilter = {
          $and: [
            { createdAt: { $gte: CONVENTION_2026_START_DATE } },
            { updatedAt: { $gte: sinceDate } },
          ],
        };
      }
    }

    // Parallel fetch 2026 tickets with populated user details
    const [convTickets, dinTickets, brochTickets] = await Promise.all([
      ConventionRegistration.find(dateFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('userId', 'fullName email phoneNumber house year checkInCode')
        .lean(),
      DinnerReservation.find(dateFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('userId', 'fullName email phoneNumber house year checkInCode')
        .lean(),
      ConventionBrochure.find(dateFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('userId', 'fullName email phoneNumber house year checkInCode')
        .lean(),
    ]);

    // Aggregate into distinct member objects keyed by userId
    const memberMap = new Map<string, any>();

    const getOrCreateMember = (rawUser: any, fallbackId: string) => {
      const uId = rawUser?._id ? rawUser._id.toString() : fallbackId;
      if (!memberMap.has(uId)) {
        memberMap.set(uId, {
          _id: uId,
          fullName: rawUser?.fullName || 'GOSA Member',
          email: rawUser?.email || '',
          phoneNumber: rawUser?.phoneNumber || '',
          house: rawUser?.house || null,
          year: rawUser?.year || null,
          checkInCode: rawUser?.checkInCode || null,
          tickets: {
            conventions: [],
            dinners: [],
            brochures: [],
          },
          allCheckedIn: false,
          hasUncheckedItems: false,
          updatedAt: new Date().toISOString(),
        });
      }
      return memberMap.get(uId);
    };

    // Attach conventions
    convTickets.forEach((c: any) => {
      const m = getOrCreateMember(c.userId, c.userId?._id?.toString() || c._id.toString());
      if (c.checkInCode && !m.checkInCode) m.checkInCode = c.checkInCode;
      m.tickets.conventions.push({
        _id: c._id.toString(),
        type: 'convention',
        paymentReference: c.paymentReference,
        checkInCode: c.checkInCode,
        amount: c.amount || 1000,
        quantity: c.quantity || 1,
        status: c.status || 'confirmed',
        checkedIn: Boolean(c.checkedIn || c.checkIn),
        checkedInAt: c.checkedInAt || null,
        createdAt: c.createdAt,
      });
      if (c.updatedAt && new Date(c.updatedAt) > new Date(m.updatedAt)) {
        m.updatedAt = c.updatedAt;
      }
    });

    // Attach dinners
    dinTickets.forEach((d: any) => {
      const m = getOrCreateMember(d.userId, d.userId?._id?.toString() || d._id.toString());
      if (d.checkInCode && !m.checkInCode) m.checkInCode = d.checkInCode;
      m.tickets.dinners.push({
        _id: d._id.toString(),
        type: 'dinner',
        paymentReference: d.paymentReference,
        checkInCode: d.checkInCode,
        amount: d.totalAmount || 2500,
        quantity: d.numberOfGuests || 1,
        status: d.status || 'confirmed',
        checkedIn: Boolean(d.checkedIn || d.checkIn),
        checkedInAt: d.checkedInAt || null,
        createdAt: d.createdAt,
      });
      if (d.updatedAt && new Date(d.updatedAt) > new Date(m.updatedAt)) {
        m.updatedAt = d.updatedAt;
      }
    });

    // Attach brochures
    brochTickets.forEach((b: any) => {
      const m = getOrCreateMember(b.userId, b.userId?._id?.toString() || b._id.toString());
      if (b.checkInCode && !m.checkInCode) m.checkInCode = b.checkInCode;
      m.tickets.brochures.push({
        _id: b._id.toString(),
        type: 'brochure',
        paymentReference: b.paymentReference,
        checkInCode: b.checkInCode,
        amount: b.totalAmount || 2000,
        quantity: b.quantity || 1,
        brochureType: b.brochureType || 'physical',
        status: b.status || 'confirmed',
        checkedIn: Boolean(b.checkedIn || b.collected),
        collected: Boolean(b.collected),
        checkedInAt: b.checkedInAt || b.collectedAt || null,
        collectedAt: b.collectedAt || null,
        createdAt: b.createdAt,
      });
      if (b.updatedAt && new Date(b.updatedAt) > new Date(m.updatedAt)) {
        m.updatedAt = b.updatedAt;
      }
    });

    // Compute check-in flags for each member
    const members = Array.from(memberMap.values()).map((m) => {
      const allItems = [
        ...m.tickets.conventions,
        ...m.tickets.dinners,
        ...m.tickets.brochures,
      ];
      const allChecked = allItems.length > 0 && allItems.every((it: any) => it.checkedIn);
      const hasUnchecked = allItems.some((it: any) => !it.checkedIn);
      return {
        ...m,
        allCheckedIn: allChecked,
        hasUncheckedItems: hasUnchecked,
      };
    });

    return NextResponse.json({
      success: true,
      serverTimestamp: Date.now(),
      checkinActive,
      count: members.length,
      members,
      executionMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Error in tickets sync endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync ticket records' },
      { status: 500 }
    );
  }
}
