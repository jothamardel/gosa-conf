import { connectToDatabase } from '@/lib/mongodb';
import {
  User,
  ConventionRegistration,
  DinnerReservation,
  BroadcastAudienceFilter,
} from '@/lib/schema';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';

export interface AudienceMember {
  userId: string;
  fullName: string;
  phoneNumber: string;
  formattedPhone: string;
  email?: string;
  year?: string;
  house?: string;
}

export interface AudienceResolutionResult {
  filter: BroadcastAudienceFilter;
  total: number;
  recipients: AudienceMember[];
  sample: AudienceMember[];
  estimatedDurationMinutes: {
    min: number;
    max: number;
  };
}

/**
 * Normalizes a raw phone number into an international E.164-compatible format (+234...).
 * Rejects numbers that are clearly invalid.
 */
export function normalizeBroadcastPhone(rawPhone: string): string | null {
  if (!rawPhone) return null;

  let clean = rawPhone.replace(/\D/g, '');
  if (!clean) return null;

  if (clean.startsWith('0') && clean.length === 11) {
    clean = '234' + clean.slice(1);
  } else if (clean.length === 10 && /^[789]/.test(clean)) {
    clean = '234' + clean;
  } else if (clean.startsWith('234') && clean.length >= 13) {
    // Already in 234 format
  } else if (clean.length < 9) {
    // Too short to be a valid phone number
    return null;
  }

  return `+${clean}`;
}

/**
 * Resolves audience members based on selected filter and deduplicates by phone number.
 */
export async function resolveBroadcastAudience(
  filter: BroadcastAudienceFilter,
): Promise<AudienceResolutionResult> {
  await connectToDatabase();

  const dateFilter2026 = { createdAt: { $gte: CONVENTION_2026_START_DATE } };

  // 1. Fetch all registered users
  const allUsers = await User.find({})
    .select('_id fullName phoneNumber email year house')
    .lean();

  let targetUsers: any[] = [];

  if (filter === 'all-members') {
    targetUsers = allUsers;
  } else if (filter === 'no-tickets') {
    // Find phone numbers and user IDs of members with confirmed 2026 tickets
    const [conventionPhones, dinnerPhones] = await Promise.all([
      ConventionRegistration.distinct('phoneNumber', {
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }],
      }),
      DinnerReservation.distinct('phoneNumber', {
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }],
      }),
    ]);

    const paidPhonesSet = new Set<string>();
    [...conventionPhones, ...dinnerPhones].forEach((p) => {
      const normalized = normalizeBroadcastPhone(String(p));
      if (normalized) paidPhonesSet.add(normalized);
    });

    targetUsers = allUsers.filter((user) => {
      const normalized = normalizeBroadcastPhone(user.phoneNumber);
      return !normalized || !paidPhonesSet.has(normalized);
    });
  } else if (filter === 'missing-dinner') {
    // Users who have convention pass but missing dinner
    const [conventionPhones, dinnerPhones] = await Promise.all([
      ConventionRegistration.distinct('phoneNumber', {
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }],
      }),
      DinnerReservation.distinct('phoneNumber', {
        ...dateFilter2026,
        $or: [{ status: 'confirmed' }, { confirm: true }],
      }),
    ]);

    const conventionSet = new Set<string>();
    conventionPhones.forEach((p) => {
      const norm = normalizeBroadcastPhone(String(p));
      if (norm) conventionSet.add(norm);
    });

    const dinnerSet = new Set<string>();
    dinnerPhones.forEach((p) => {
      const norm = normalizeBroadcastPhone(String(p));
      if (norm) dinnerSet.add(norm);
    });

    targetUsers = allUsers.filter((user) => {
      const normalized = normalizeBroadcastPhone(user.phoneNumber);
      return normalized && conventionSet.has(normalized) && !dinnerSet.has(normalized);
    });
  } else {
    targetUsers = allUsers;
  }

  // Deduplicate and filter to valid phone numbers
  const seenPhones = new Set<string>();
  const recipients: AudienceMember[] = [];

  for (const u of targetUsers) {
    const formatted = normalizeBroadcastPhone(u.phoneNumber);
    if (!formatted || seenPhones.has(formatted)) {
      continue;
    }
    seenPhones.add(formatted);

    recipients.push({
      userId: String(u._id),
      fullName: u.fullName || 'Esteemed Member',
      phoneNumber: u.phoneNumber,
      formattedPhone: formatted,
      email: u.email,
      year: u.year,
      house: u.house,
    });
  }

  // Calculate safe duration estimates (8s - 18s per message)
  const minSeconds = recipients.length * 8;
  const maxSeconds = recipients.length * 18;

  return {
    filter,
    total: recipients.length,
    recipients,
    sample: recipients.slice(0, 5),
    estimatedDurationMinutes: {
      min: Math.ceil(minSeconds / 60),
      max: Math.ceil(maxSeconds / 60),
    },
  };
}
