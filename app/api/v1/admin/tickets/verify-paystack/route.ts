import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { connectToDatabase } from '@/lib/mongodb';
import {
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Accommodation,
  GoodwillMessage,
  Donation,
  Transaction,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';
import { getBasePaymentReference } from '@/lib/services/ticket-report.service';

export const dynamic = 'force-dynamic';

interface VerifyResult {
  paystackStatus: 'success' | 'failed' | 'abandoned' | 'not_found' | 'error';
  verifiedRef?: string;
  amountKobo?: number;
  message?: string;
}

async function verifyReferenceWithPaystack(
  paymentReference: string,
  secretKey: string
): Promise<VerifyResult> {
  const candidates = new Set<string>();
  const baseRef = getBasePaymentReference(paymentReference);
  if (baseRef) candidates.add(baseRef);
  candidates.add(paymentReference);

  if (/^T\d+_/i.test(paymentReference)) {
    candidates.add(paymentReference.split('_')[0]);
  }

  let lastStatus: VerifyResult = { paystackStatus: 'not_found' };

  for (const ref of candidates) {
    try {
      const res = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = res.data?.data;
      if (data?.status === 'success') {
        return {
          paystackStatus: 'success',
          verifiedRef: ref,
          amountKobo: data.amount,
        };
      }
      if (data?.status === 'failed') {
        lastStatus = { paystackStatus: 'failed', verifiedRef: ref };
      } else if (data?.status) {
        lastStatus = { paystackStatus: 'abandoned', verifiedRef: ref, message: data.status };
      }
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 404 || httpStatus === 400) {
        continue;
      }
      return {
        paystackStatus: 'error',
        message: err?.response?.data?.message || err.message,
      };
    }
  }

  return lastStatus;
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYSTACK_SECRET_KEY is not configured on the server.',
        },
        { status: 500 }
      );
    }

    await connectToDatabase();

    const dateFilter = { createdAt: { $gte: CONVENTION_2026_START_DATE } };
    const completedTxs = await Transaction.find({ status: 'completed' })
      .select('paymentReference')
      .lean();
    const completedSet = new Set(completedTxs.map((t: any) => t.paymentReference));

    const collections: Array<{
      name: string;
      model: any;
      confirmField: 'confirm' | 'confirmed';
      hasStatus: boolean;
    }> = [
      { name: 'convention', model: ConventionRegistration, confirmField: 'confirm', hasStatus: true },
      { name: 'dinner', model: DinnerReservation, confirmField: 'confirmed', hasStatus: true },
      { name: 'brochure', model: ConventionBrochure, confirmField: 'confirmed', hasStatus: true },
      { name: 'accommodation', model: Accommodation, confirmField: 'confirmed', hasStatus: true },
      { name: 'goodwill', model: GoodwillMessage, confirmField: 'confirmed', hasStatus: false },
      { name: 'donation', model: Donation, confirmField: 'confirmed', hasStatus: false },
    ];

    interface CandidateDoc {
      collectionName: string;
      model: any;
      confirmField: 'confirm' | 'confirmed';
      hasStatus: boolean;
      id: string;
      paymentReference: string;
      baseRef: string;
      currentlyConfirmed: boolean;
    }

    const candidates: CandidateDoc[] = [];

    for (const col of collections) {
      const docs = await col.model
        .find({
          ...dateFilter,
          paymentReference: { $not: /^(WALKIN_|UPG_)/i },
        })
        .select(`_id paymentReference ${col.confirmField} ${col.hasStatus ? 'status' : ''}`)
        .lean();

      for (const doc of docs as any[]) {
        const ref = doc.paymentReference || '';
        const baseRef = getBasePaymentReference(ref);
        if (!ref) continue;

        const hasCompletedTx = completedSet.has(ref) || completedSet.has(baseRef);
        const statusLower = (doc.status || '').toLowerCase();
        const isConfirmed =
          statusLower === 'confirmed' ||
          statusLower === 'upgraded' ||
          Boolean(doc[col.confirmField]);

        // Verify any record that is either pending OR confirmed without a completed Transaction
        if (!hasCompletedTx && statusLower !== 'cancelled') {
          candidates.push({
            collectionName: col.name,
            model: col.model,
            confirmField: col.confirmField,
            hasStatus: col.hasStatus,
            id: String(doc._id),
            paymentReference: ref,
            baseRef,
            currentlyConfirmed: isConfirmed,
          });
        }
      }
    }

    // Deduplicate Paystack API calls by baseRef/ref
    const uniqueRefs = Array.from(
      new Set(candidates.map((c) => c.baseRef || c.paymentReference))
    );
    const verifyCache = new Map<string, VerifyResult>();

    // Batch concurrency of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueRefs.length; i += BATCH_SIZE) {
      const batch = uniqueRefs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (ref) => {
          const sample = candidates.find((c) => (c.baseRef || c.paymentReference) === ref);
          const result = await verifyReferenceWithPaystack(
            sample?.paymentReference || ref,
            secretKey
          );
          return { ref, result };
        })
      );
      for (const { ref, result } of results) {
        verifyCache.set(ref, result);
      }
    }

    let confirmedWithPaystack = 0;
    let revertedUnpaid = 0;
    let stillPending = 0;
    let apiErrors = 0;

    for (const c of candidates) {
      const key = c.baseRef || c.paymentReference;
      const res = verifyCache.get(key);
      if (!res) continue;

      if (res.paystackStatus === 'success') {
        const updateSet: Record<string, any> = { [c.confirmField]: true };
        if (c.hasStatus) updateSet.status = 'confirmed';
        await c.model.updateOne({ _id: c.id }, { $set: updateSet });

        await Transaction.updateMany(
          { paymentReference: { $in: [c.paymentReference, c.baseRef, res.verifiedRef].filter(Boolean) } },
          { $set: { status: 'completed' } }
        );
        confirmedWithPaystack += 1;
      } else if (res.paystackStatus === 'error') {
        apiErrors += 1;
      } else {
        // abandoned, failed, or not_found on Paystack
        if (c.currentlyConfirmed && /^(cart|buy_tickets)_/i.test(c.paymentReference)) {
          // Revert force-confirmed unpaid cart/WhatsApp record
          const revertSet: Record<string, any> = { [c.confirmField]: false };
          if (c.hasStatus) revertSet.status = 'pending';
          await c.model.updateOne({ _id: c.id }, { $set: revertSet });
          revertedUnpaid += 1;
        } else {
          stillPending += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checkedCandidates: candidates.length,
        uniquePaystackCalls: uniqueRefs.length,
        confirmedWithPaystack,
        revertedUnpaid,
        stillPending,
        apiErrors,
      },
    });
  } catch (error: any) {
    console.error('Paystack batch verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to verify payments with Paystack',
      },
      { status: 500 }
    );
  }
}

