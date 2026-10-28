import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const dateFilter2026 = { createdAt: { $gte: CONVENTION_2026_START_DATE } };

    const [
      conventionTotal,
      conventionCheckedIn,
      conventionRevenueAgg,
      dinnerTotal,
      dinnerCheckedIn,
      dinnerRevenueAgg,
      brochureTotal,
      brochureCollected,
      brochureRevenueAgg,
      walkinConvention,
      walkinDinner,
      walkinBrochure,
    ] = await Promise.all([
      // Convention 2026
      ConventionRegistration.countDocuments({
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }]
      }),
      ConventionRegistration.countDocuments({
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }],
        checkedIn: true,
      }),
      ConventionRegistration.aggregate([
        {
          $match: {
            ...dateFilter2026,
            $or: [{ status: 'confirmed' }, { confirm: true }],
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Dinner 2026
      DinnerReservation.countDocuments({
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirmed: true }]
      }),
      DinnerReservation.countDocuments({
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirmed: true }],
        checkedIn: true,
      }),
      DinnerReservation.aggregate([
        {
          $match: {
            ...dateFilter2026,
            $or: [{ status: 'confirmed' }, { confirmed: true }],
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Brochure 2026
      ConventionBrochure.countDocuments({
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirmed: true }]
      }),
      ConventionBrochure.countDocuments({
        ...dateFilter2026,
        $and: [
          { $or: [{ status: 'confirmed' }, { confirmed: true }] },
          { $or: [{ collected: true }, { checkedIn: true }] },
        ]
      }),
      ConventionBrochure.aggregate([
        {
          $match: {
            ...dateFilter2026,
            $or: [{ status: 'confirmed' }, { confirmed: true }],
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Walkin counts for 2026 (reference starts with WALKIN_)
      ConventionRegistration.countDocuments({ ...dateFilter2026, paymentReference: /^WALKIN_/i }),
      DinnerReservation.countDocuments({ ...dateFilter2026, paymentReference: /^WALKIN_/i }),
      ConventionBrochure.countDocuments({ ...dateFilter2026, paymentReference: /^WALKIN_/i }),
    ]);

    const conventionRev = conventionRevenueAgg[0]?.total || 0;
    const dinnerRev = dinnerRevenueAgg[0]?.total || 0;
    const brochureRev = brochureRevenueAgg[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        convention: {
          total: conventionTotal,
          checkedIn: conventionCheckedIn,
          pending: Math.max(0, conventionTotal - conventionCheckedIn),
          checkInRate: conventionTotal > 0 ? Math.round((conventionCheckedIn / conventionTotal) * 100) : 0,
          revenue: conventionRev,
        },
        dinner: {
          total: dinnerTotal,
          checkedIn: dinnerCheckedIn,
          pending: Math.max(0, dinnerTotal - dinnerCheckedIn),
          checkInRate: dinnerTotal > 0 ? Math.round((dinnerCheckedIn / dinnerTotal) * 100) : 0,
          revenue: dinnerRev,
        },
        brochure: {
          total: brochureTotal,
          collected: brochureCollected,
          pending: Math.max(0, brochureTotal - brochureCollected),
          collectionRate: brochureTotal > 0 ? Math.round((brochureCollected / brochureTotal) * 100) : 0,
          revenue: brochureRev,
        },
        walkins: {
          total: walkinConvention + walkinDinner + walkinBrochure,
          convention: walkinConvention,
          dinner: walkinDinner,
          brochure: walkinBrochure,
        },
        totalRevenue: conventionRev + dinnerRev + brochureRev,
      }
    });

  } catch (error: any) {
    console.error('Error fetching ticket overview analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
