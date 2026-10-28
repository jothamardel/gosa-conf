import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  User,
} from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get('q') || searchParams.get('query') || '').trim();

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json({
        success: true,
        members: [],
        executionMs: Date.now() - startTime,
      });
    }

    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    const cleanDigits = rawQuery.replace(/\D/g, '');

    // Step 1: Parallel search on User collection + direct paymentReference/checkInCode search
    const userSearchConditions: any[] = [
      { fullName: searchRegex },
      { email: searchRegex },
      { checkInCode: searchRegex },
    ];

    if (cleanDigits.length >= 4) {
      userSearchConditions.push({ phoneNumber: new RegExp(cleanDigits) });
    } else {
      userSearchConditions.push({ phoneNumber: searchRegex });
    }

    const [matchedUsers, directConvention, directDinner, directBrochure] = await Promise.all([
      // Top 8 matching users (keeps response < 50ms)
      User.find({ $or: userSearchConditions })
        .limit(8)
        .lean(),

      // Direct ticket matches by paymentReference or checkInCode
      ConventionRegistration.find({
        $or: [{ paymentReference: searchRegex }, { checkInCode: searchRegex }]
      }).limit(5).select('userId').lean(),

      DinnerReservation.find({
        $or: [{ paymentReference: searchRegex }, { checkInCode: searchRegex }]
      }).limit(5).select('userId').lean(),

      ConventionBrochure.find({
        $or: [{ paymentReference: searchRegex }, { checkInCode: searchRegex }]
      }).limit(5).select('userId').lean(),
    ]);

    // Aggregate unique user IDs
    const userMap = new Map<string, any>();
    matchedUsers.forEach((u: any) => userMap.set(u._id.toString(), u));

    // Find any users matched via tickets directly
    const extraUserIds: string[] = [];
    [...directConvention, ...directDinner, ...directBrochure].forEach((t: any) => {
      if (t.userId) {
        const idStr = t.userId.toString();
        if (!userMap.has(idStr)) {
          extraUserIds.push(idStr);
        }
      }
    });

    if (extraUserIds.length > 0) {
      const extraUsers = await User.find({ _id: { $in: extraUserIds } }).lean();
      extraUsers.forEach((u: any) => userMap.set(u._id.toString(), u));
    }

    const allUsers = Array.from(userMap.values());

    if (allUsers.length === 0) {
      return NextResponse.json({
        success: true,
        members: [],
        query: rawQuery,
        executionMs: Date.now() - startTime,
      });
    }

    const targetUserIds = allUsers.map(u => u._id);

    // Step 2: Fetch all tickets for matched users in parallel
    const [allConventions, allDinners, allBrochures] = await Promise.all([
      ConventionRegistration.find({ userId: { $in: targetUserIds } }).sort({ createdAt: -1 }).lean(),
      DinnerReservation.find({ userId: { $in: targetUserIds } }).sort({ createdAt: -1 }).lean(),
      ConventionBrochure.find({ userId: { $in: targetUserIds } }).sort({ createdAt: -1 }).lean(),
    ]);

    // Group tickets by userId
    const conventionByUser = new Map<string, any[]>();
    const dinnerByUser = new Map<string, any[]>();
    const brochureByUser = new Map<string, any[]>();

    allConventions.forEach((c: any) => {
      const uid = c.userId.toString();
      if (!conventionByUser.has(uid)) conventionByUser.set(uid, []);
      conventionByUser.get(uid)!.push({
        _id: c._id.toString(),
        type: 'convention',
        paymentReference: c.paymentReference,
        checkInCode: c.checkInCode || null,
        amount: c.amount || 0,
        quantity: c.quantity || 1,
        status: c.status || (c.confirm ? 'confirmed' : 'pending'),
        checkedIn: Boolean(c.checkedIn),
        checkedInAt: c.checkedInAt || null,
        createdAt: c.createdAt,
      });
    });

    allDinners.forEach((d: any) => {
      const uid = d.userId.toString();
      if (!dinnerByUser.has(uid)) dinnerByUser.set(uid, []);
      dinnerByUser.get(uid)!.push({
        _id: d._id.toString(),
        type: 'dinner',
        paymentReference: d.paymentReference,
        checkInCode: d.checkInCode || null,
        amount: d.totalAmount || 0,
        quantity: d.numberOfGuests || 1,
        guestDetails: d.guestDetails || [],
        status: d.status || (d.confirmed ? 'confirmed' : 'pending'),
        checkedIn: Boolean(d.checkedIn),
        checkedInAt: d.checkedInAt || null,
        createdAt: d.createdAt,
      });
    });

    allBrochures.forEach((b: any) => {
      const uid = b.userId.toString();
      if (!brochureByUser.has(uid)) brochureByUser.set(uid, []);
      brochureByUser.get(uid)!.push({
        _id: b._id.toString(),
        type: 'brochure',
        paymentReference: b.paymentReference,
        checkInCode: b.checkInCode || null,
        amount: b.totalAmount || 0,
        quantity: b.quantity || 1,
        brochureType: b.brochureType || 'physical',
        status: b.status || (b.confirmed ? 'confirmed' : 'pending'),
        collected: Boolean(b.collected || b.checkedIn),
        collectedAt: b.collectedAt || b.checkedInAt || null,
        createdAt: b.createdAt,
      });
    });

    // Assemble unified member objects
    const members = allUsers.map((user: any) => {
      const uid = user._id.toString();
      const conventions = conventionByUser.get(uid) || [];
      const dinners = dinnerByUser.get(uid) || [];
      const brochures = brochureByUser.get(uid) || [];

      const totalItems = conventions.length + dinners.length + brochures.length;
      const allCheckedIn =
        totalItems > 0 &&
        conventions.every((c: any) => c.checkedIn) &&
        dinners.every((d: any) => d.checkedIn) &&
        brochures.every((b: any) => b.collected);

      const hasUncheckedItems =
        conventions.some((c: any) => !c.checkedIn) ||
        dinners.some((d: any) => !d.checkedIn) ||
        brochures.some((b: any) => !b.collected);

      return {
        _id: uid,
        fullName: user.fullName || 'Unknown Attendee',
        email: user.email || '—',
        phoneNumber: user.phoneNumber || '—',
        house: user.house || '—',
        year: user.year || '—',
        checkInCode: user.checkInCode || null,
        totalItems,
        allCheckedIn,
        hasUncheckedItems,
        tickets: {
          conventions,
          dinners,
          brochures,
        },
      };
    });

    return NextResponse.json({
      success: true,
      members,
      query: rawQuery,
      executionMs: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error('Error in fast search:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Search query failed' },
      { status: 500 }
    );
  }
}
