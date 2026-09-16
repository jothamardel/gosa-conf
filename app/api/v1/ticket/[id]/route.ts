import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConventionRegistration } from '@/lib/schema/convention.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { ProductPurchase } from '@/lib/schema/product-purchase.schema';
import { Donation } from '@/lib/schema/donation.schema';
import { Transaction } from '@/lib/schema/transaction.schema';
import { User } from '@/lib/schema/user.schema';
import { Types } from 'mongoose';

// Register Mongoose models
User;
ConventionRegistration;
DinnerReservation;
ConventionBrochure;
ProductPurchase;
Donation;
Transaction;

export interface PaidServiceItem {
  id: string;
  name: string;
  category: 'convention' | 'dinner' | 'brochure' | 'uniform' | 'emblem' | 'magazine' | 'donation' | 'product';
  quantity: number;
  amount: number;
  badgeText: string;
  icon: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const ticketId = params.id;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    console.log('Resolving full service ticket details for ID:', ticketId);

    const isValidObjectId = Types.ObjectId.isValid(ticketId);

    let primaryRecord: any = null;
    let userIdObj: any = null;
    let paymentRef = ticketId;

    // 1. Search Transaction first
    const txQuery = isValidObjectId
      ? { $or: [{ _id: ticketId }, { paymentReference: ticketId }] }
      : { paymentReference: ticketId };
    const tx = await Transaction.findOne(txQuery);

    if (tx) {
      primaryRecord = tx;
      userIdObj = tx.userId;
      paymentRef = tx.paymentReference;
    }

    // 2. Search ConventionRegistrations
    if (!primaryRecord && isValidObjectId) {
      const conv = await ConventionRegistration.findById(ticketId);
      if (conv) {
        primaryRecord = conv;
        userIdObj = conv.userId;
        paymentRef = conv.paymentReference;
      }
    }

    // 3. Search DinnerReservations
    if (!primaryRecord && isValidObjectId) {
      const din = await DinnerReservation.findById(ticketId);
      if (din) {
        primaryRecord = din;
        userIdObj = din.userId;
        paymentRef = din.paymentReference;
      }
    }

    // 4. Search ConventionBrochures
    if (!primaryRecord && isValidObjectId) {
      const bro = await ConventionBrochure.findById(ticketId);
      if (bro) {
        primaryRecord = bro;
        userIdObj = bro.userId;
        paymentRef = bro.paymentReference;
      }
    }

    // 5. Search ProductPurchases
    if (!primaryRecord && isValidObjectId) {
      const prod = await ProductPurchase.findById(ticketId);
      if (prod) {
        primaryRecord = prod;
        userIdObj = prod.userId;
        paymentRef = prod.paymentReference;
      }
    }

    // 6. Search Donations
    if (!primaryRecord && isValidObjectId) {
      const don = await Donation.findById(ticketId);
      if (don) {
        primaryRecord = don;
        userIdObj = don.userId;
        paymentRef = don.paymentReference;
      }
    }

    if (!primaryRecord) {
      return NextResponse.json({ error: 'Ticket or transaction not found' }, { status: 404 });
    }

    // Fetch user details
    const user = userIdObj ? await User.findById(userIdObj) : null;

    // Extract base reference prefix (e.g. buy_tickets_1789579732323_07033680280 -> buy_tickets_1789579732323_07033680280)
    const baseReference = paymentRef.split('_').slice(0, 3).join('_');
    const refRegex = new RegExp(`^${baseReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

    // Query all sub-records linked to this payment reference across all 5 service collections
    const [conventionRegs, dinnerRes, brochureOrders, productPurchases, donationRecords] = await Promise.all([
      ConventionRegistration.find({ paymentReference: { $regex: refRegex } }),
      DinnerReservation.find({ paymentReference: { $regex: refRegex } }),
      ConventionBrochure.find({ paymentReference: { $regex: refRegex } }),
      ProductPurchase.find({ paymentReference: { $regex: refRegex } }),
      Donation.find({ paymentReference: { $regex: refRegex } }),
    ]);

    const serviceItems: PaidServiceItem[] = [];

    // Convention Tickets
    for (const item of conventionRegs) {
      serviceItems.push({
        id: item._id.toString(),
        name: 'Convention Registration Ticket',
        category: 'convention',
        quantity: item.quantity || 1,
        amount: item.amount || 1000,
        badgeText: 'Confirmed Ticket 🎟️',
        icon: 'Ticket',
      });
    }

    // Dinner Tickets
    for (const item of dinnerRes) {
      serviceItems.push({
        id: item._id.toString(),
        name: 'Dinner Ticket Pass',
        category: 'dinner',
        quantity: item.numberOfGuests || 1,
        amount: item.totalAmount || 2500,
        badgeText: 'Dinner Reserved 🍷',
        icon: 'Utensils',
      });
    }

    // Brochures
    for (const item of brochureOrders) {
      serviceItems.push({
        id: item._id.toString(),
        name: 'Convention Brochure',
        category: 'brochure',
        quantity: item.quantity || 1,
        amount: item.totalAmount || 2000,
        badgeText: item.collected ? 'Collected 📦' : 'Collect at Venue 📦',
        icon: 'BookOpen',
      });
    }

    // Product Purchases (Uniforms, Emblems, Magazines)
    for (const item of productPurchases) {
      const isUniform = item.productType === 'uniform';
      serviceItems.push({
        id: item._id.toString(),
        name: isUniform ? 'GOSA Uniform' : `GOSA Merchandise (${item.productType})`,
        category: isUniform ? 'uniform' : 'product',
        quantity: item.quantity || 1,
        amount: item.totalAmount || (isUniform ? 15000 : 2000),
        badgeText: isUniform ? 'Uniform Order 👕' : 'Merchandise 🛒',
        icon: isUniform ? 'Shirt' : 'ShoppingBag',
      });
    }

    // Donations
    for (const item of donationRecords) {
      serviceItems.push({
        id: item._id.toString(),
        name: 'GOSA Development Donation',
        category: 'donation',
        quantity: 1,
        amount: item.amount || 0,
        badgeText: 'Donation Contributed 💚',
        icon: 'HeartHandshake',
      });
    }

    // Fallback: If metadata has items that didn't populate sub-records
    if (serviceItems.length === 0 && primaryRecord.metadata?.items?.length > 0) {
      for (const item of primaryRecord.metadata.items) {
        let label = 'Convention Service';
        let badge = 'Confirmed Service 🎟️';
        if (item.type === 'convention') { label = 'Convention Registration Ticket'; badge = 'Confirmed Ticket 🎟️'; }
        else if (item.type === 'dinner') { label = 'Dinner Ticket Pass'; badge = 'Dinner Reserved 🍷'; }
        else if (item.type === 'brochure') { label = 'Convention Brochure'; badge = 'Brochure Pass 📦'; }
        else if (item.type === 'uniform') { label = 'GOSA Uniform'; badge = 'Uniform Order 👕'; }
        else if (item.type === 'donation') { label = 'GOSA Donation'; badge = 'Donation Contributed 💚'; }

        serviceItems.push({
          id: primaryRecord._id.toString(),
          name: label,
          category: item.type,
          quantity: item.quantity || 1,
          amount: item.amount || 0,
          badgeText: badge,
          icon: 'CheckCircle',
        });
      }
    }

    // If still empty (single standalone record)
    if (serviceItems.length === 0) {
      serviceItems.push({
        id: primaryRecord._id.toString(),
        name: primaryRecord.productType ? `GOSA Product (${primaryRecord.productType})` : 'GOSA Convention Pass',
        category: 'convention',
        quantity: primaryRecord.quantity || primaryRecord.numberOfGuests || 1,
        amount: primaryRecord.amount || primaryRecord.totalAmount || 0,
        badgeText: 'Confirmed Service ✅',
        icon: 'Ticket',
      });
    }

    // Calculate total amount
    const totalCalculatedAmount = serviceItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const finalAmount = primaryRecord.amount || primaryRecord.totalAmount || totalCalculatedAmount;

    // Determine primary header title
    let primaryTitle = 'GOSA 2026 DELEGATE PASS';
    if (serviceItems.length === 1) {
      const cat = serviceItems[0].category;
      if (cat === 'convention') primaryTitle = 'CONVENTION REGISTRATION PASS';
      else if (cat === 'dinner') primaryTitle = 'DINNER TICKET PASS';
      else if (cat === 'brochure') primaryTitle = 'CONVENTION BROCHURE PASS';
      else if (cat === 'uniform') primaryTitle = 'GOSA UNIFORM PASS';
      else if (cat === 'donation') primaryTitle = 'GOSA DONATION RECEIPT';
    } else if (serviceItems.length > 1) {
      primaryTitle = 'COMBINED GOSA CONVENTION PASS';
    }

    const attendeeName =
      user?.fullName ||
      primaryRecord.guestDetails?.[0]?.name ||
      primaryRecord.recipientDetails?.[0]?.name ||
      primaryRecord.donorName ||
      'GOSA Valued Member';

    return NextResponse.json({
      success: true,
      ticket: {
        _id: primaryRecord._id?.toString() || ticketId,
        primaryTitle,
        paymentReference: paymentRef,
        amount: finalAmount,
        status: primaryRecord.status === 'pending' ? 'Pending' : 'Confirmed',
        confirmed: true,
        user: {
          fullName: attendeeName,
          email: user?.email || primaryRecord.donorEmail || '',
          phone: user?.phoneNumber || primaryRecord.donorPhone || '',
          house: user?.house || 'Gindiri Alumnus',
          year: user?.year || '2026',
        },
        createdAt: primaryRecord.createdAt || new Date(),
        serviceItems,
      },
    });
  } catch (error: any) {
    console.error('Error resolving full service ticket details:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve ticket details' },
      { status: 500 }
    );
  }
}
