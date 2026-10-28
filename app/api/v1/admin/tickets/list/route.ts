import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  User,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'convention';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
    const status = searchParams.get('status') || 'all';
    const search = (searchParams.get('search') || '').trim();

    // Base 2026 convention date filter
    const andConditions: any[] = [
      { createdAt: { $gte: CONVENTION_2026_START_DATE } }
    ];

    if (status === 'checkedIn') {
      if (tab === 'brochure') {
        andConditions.push({ $or: [{ collected: true }, { checkedIn: true }] });
      } else {
        andConditions.push({ checkedIn: true });
      }
    } else if (status === 'notCheckedIn') {
      if (tab === 'brochure') {
        andConditions.push({ collected: { $ne: true }, checkedIn: { $ne: true } });
      } else {
        andConditions.push({ checkedIn: { $ne: true } });
      }
    }

    // Filter by search string if provided
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      // Check if search matches users first
      const matchedUsers = await User.find({
        $or: [
          { fullName: searchRegex },
          { phoneNumber: searchRegex },
          { email: searchRegex },
          { checkInCode: searchRegex },
        ]
      }).select('_id').lean();

      const matchedUserIds = matchedUsers.map(u => u._id);

      const searchConditions: any[] = [
        { paymentReference: searchRegex },
        { checkInCode: searchRegex },
      ];

      if (matchedUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchedUserIds } });
      }

      andConditions.push({ $or: searchConditions });
    }

    const queryFilter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    let Model: any;
    if (tab === 'dinner') {
      Model = DinnerReservation;
    } else if (tab === 'brochure') {
      Model = ConventionBrochure;
    } else {
      Model = ConventionRegistration;
    }

    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      Model.countDocuments(queryFilter),
      Model.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email phoneNumber house year checkInCode')
        .lean(),
    ]);

    const items = records.map((record: any) => {
      const user = record.userId || {};
      const checkInCode = record.checkInCode || user.checkInCode || null;

      return {
        _id: record._id.toString(),
        type: tab,
        paymentReference: record.paymentReference,
        checkInCode,
        amount: record.amount || record.totalAmount || 0,
        quantity: record.quantity || record.numberOfGuests || 1,
        brochureType: record.brochureType || null,
        guestDetails: record.guestDetails || [],
        status: record.status || (record.confirm || record.confirmed ? 'confirmed' : 'pending'),
        checkedIn: Boolean(record.checkedIn),
        checkedInAt: record.checkedInAt || null,
        collected: Boolean(record.collected),
        collectedAt: record.collectedAt || null,
        user: {
          _id: user._id?.toString() || null,
          fullName: user.fullName || 'Unknown Attendee',
          email: user.email || '—',
          phoneNumber: user.phoneNumber || '—',
          house: user.house || '—',
          year: user.year || '—',
          checkInCode: user.checkInCode || null,
        },
        createdAt: record.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });

  } catch (error: any) {
    console.error('Error fetching ticket list:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tickets list' },
      { status: 500 }
    );
  }
}
