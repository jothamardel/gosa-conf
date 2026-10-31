import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import {
  User,
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Transaction,
} from '@/lib/schema';
import { getOrCreateUserCheckInCode } from '@/lib/utils/checkin-code';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    const rawIdentifier = (body.identifier || body.phone || body.email || body.reference || '').trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Please enter your phone number, email, or payment reference' },
        { status: 400 }
      );
    }

    let user: any = null;
    let matchedReference: string | null = null;
    const cleanDigits = rawIdentifier.replace(/\D/g, '');

    // 1. Try matching by Phone Number
    if (cleanDigits.length >= 7) {
      let localFormat = cleanDigits;
      let e164Format = `+${cleanDigits}`;

      if (cleanDigits.startsWith('234') && cleanDigits.length >= 13) {
        localFormat = `0${cleanDigits.slice(3)}`;
        e164Format = `+${cleanDigits}`;
      } else if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
        localFormat = cleanDigits;
        e164Format = `+234${cleanDigits.slice(1)}`;
      } else if (cleanDigits.length === 10) {
        localFormat = `0${cleanDigits}`;
        e164Format = `+234${cleanDigits}`;
      }

      user = await User.findOne({
        $or: [
          { phoneNumber: e164Format },
          { phoneNumber: localFormat },
          { phoneNumber: cleanDigits },
          { phoneNumber: new RegExp(cleanDigits.slice(-10) + '$') },
        ],
      });
    }

    // 2. Try matching by Email if not found
    if (!user && rawIdentifier.includes('@')) {
      user = await User.findOne({
        email: rawIdentifier.toLowerCase().trim(),
      });
    }

    // 3. Try matching by Check-In Code directly
    if (!user && /^[2-9A-HJ-NP-Z]{4}-?[2-9A-HJ-NP-Z]{4}$/i.test(rawIdentifier)) {
      const formattedCode = rawIdentifier.includes('-')
        ? rawIdentifier.toUpperCase()
        : `${rawIdentifier.slice(0, 4)}-${rawIdentifier.slice(4)}`.toUpperCase();

      user = await User.findOne({
        checkInCode: formattedCode,
      });
    }

    // 4. Try matching by Payment Reference or Ticket ObjectId
    if (!user) {
      const isValidObjectId = Types.ObjectId.isValid(rawIdentifier);

      const [tx, conv, din, broch] = await Promise.all([
        Transaction.findOne(
          isValidObjectId
            ? { $or: [{ _id: rawIdentifier }, { paymentReference: rawIdentifier }] }
            : { paymentReference: rawIdentifier }
        ),
        ConventionRegistration.findOne(
          isValidObjectId
            ? { $or: [{ _id: rawIdentifier }, { paymentReference: rawIdentifier }] }
            : { paymentReference: rawIdentifier }
        ),
        DinnerReservation.findOne(
          isValidObjectId
            ? { $or: [{ _id: rawIdentifier }, { paymentReference: rawIdentifier }] }
            : { paymentReference: rawIdentifier }
        ),
        ConventionBrochure.findOne(
          isValidObjectId
            ? { $or: [{ _id: rawIdentifier }, { paymentReference: rawIdentifier }] }
            : { paymentReference: rawIdentifier }
        ),
      ]);

      const foundRecord = tx || conv || din || broch;
      if (foundRecord) {
        matchedReference = foundRecord.paymentReference;
        if (foundRecord.userId) {
          user = await User.findById(foundRecord.userId);
        }
      }
    }

    // If still no user found
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            'We could not find any attendee record matching that phone number, email, or reference. If you purchased at the venue, please present your receipt to desk officials.',
        },
        { status: 404 }
      );
    }

    const userIdObj = user._id;
    const userIdStr = user._id.toString();
    const userMatch = { $in: [userIdObj, userIdStr] };
    const dateFilter2026 = { createdAt: { $gte: CONVENTION_2026_START_DATE } };

    // Query 2026 ticket records
    const [conventionRegs, dinnerReservations, brochures, completedTx] = await Promise.all([
      ConventionRegistration.find({
        userId: userMatch as any,
        status: { $ne: 'cancelled' },
        ...dateFilter2026,
      }).lean(),
      DinnerReservation.find({
        userId: userMatch as any,
        status: { $ne: 'cancelled' },
        ...dateFilter2026,
      }).lean(),
      ConventionBrochure.find({
        userId: userMatch as any,
        status: { $ne: 'cancelled' },
        ...dateFilter2026,
      }).lean(),
      Transaction.find({
        $or: [
          { userId: userIdObj },
          { userId: userIdStr },
          ...(user.email ? [{ 'metadata.email': user.email.toLowerCase() }] : []),
          ...(user.phoneNumber ? [{ 'metadata.phoneNumber': user.phoneNumber }] : []),
        ],
        status: 'completed',
        ...dateFilter2026,
      }).lean(),
    ]);

    const hasConventionTx = completedTx.some(
      (tx) =>
        tx.type === 'ticket_convention' ||
        (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'convention'))
    );

    const hasDinnerTx = completedTx.some(
      (tx) =>
        tx.type === 'ticket_dinner' ||
        (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'dinner'))
    );

    const hasBrochureTx = completedTx.some(
      (tx) =>
        tx.type === 'product_brochure' ||
        (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'brochure'))
    );

    const conventionCount =
      conventionRegs.reduce((sum, r) => sum + (r.quantity || 1), 0) || (hasConventionTx ? 1 : 0);
    const dinnerCount =
      dinnerReservations.reduce((sum, r) => sum + (r.numberOfGuests || 1), 0) || (hasDinnerTx ? 1 : 0);
    const brochureCount =
      brochures.reduce((sum, b) => sum + (b.quantity || 1), 0) || (hasBrochureTx ? 1 : 0);

    const hasAnyTicket = conventionCount > 0 || dinnerCount > 0 || brochureCount > 0;

    if (!hasAnyTicket) {
      return NextResponse.json(
        {
          success: false,
          error: `Hello ${user.fullName}, we found your profile, but no confirmed 2026 tickets are linked yet. Please visit /register or head to the on-site Registration Desk.`,
        },
        { status: 404 }
      );
    }

    // Retrieve or generate persistent 8-character check-in code
    const checkInCode = await getOrCreateUserCheckInCode(user._id);

    const isCheckedIn =
      conventionRegs.some((c: any) => c.checkedIn || c.checkIn) ||
      dinnerReservations.some((d: any) => d.checkedIn || d.checkIn);

    const primaryTicketId =
      matchedReference ||
      conventionRegs[0]?.paymentReference ||
      dinnerReservations[0]?.paymentReference ||
      brochures[0]?.paymentReference ||
      completedTx[0]?.paymentReference ||
      user._id.toString();

    const itemsSummary = [];
    if (conventionCount > 0) itemsSummary.push({ name: 'Convention Pass', quantity: conventionCount, icon: 'ticket' });
    if (dinnerCount > 0) itemsSummary.push({ name: 'Dinner Ticket', quantity: dinnerCount, icon: 'utensils' });
    if (brochureCount > 0) itemsSummary.push({ name: 'Convention Brochure', quantity: brochureCount, icon: 'book' });

    return NextResponse.json({
      success: true,
      checkInCode,
      user: {
        _id: user._id.toString(),
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email || '',
        house: user.house || 'Gindiri Alumnus',
        year: user.year || '2026',
      },
      isCheckedIn,
      itemsSummary,
      primaryTicketId,
      ticketUrl: `/ticket?id=${encodeURIComponent(primaryTicketId)}`,
    });
  } catch (error: any) {
    console.error('Error retrieving check-in code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve check-in code' },
      { status: 500 }
    );
  }
}
