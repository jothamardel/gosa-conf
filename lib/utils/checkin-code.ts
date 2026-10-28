import crypto from 'crypto';
import { User } from '@/lib/schema/user.schema';

// Safe uppercase alphanumeric charset avoiding visually ambiguous characters (0/O, 1/I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate an 8-character check-in code formatted as XXXX-XXXX (e.g., RT34-UU6T)
 */
export function generateCheckInCode(): string {
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';

  for (let i = 0; i < 4; i++) {
    part1 += CHARSET[bytes[i] % CHARSET.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += CHARSET[bytes[i] % CHARSET.length];
  }

  return `${part1}-${part2}`;
}

/**
 * Ensures a member has a persistent check-in code.
 * If user already has one, returns it.
 * Otherwise, generates a unique code, stores it on the user document, and returns it.
 */
export async function getOrCreateUserCheckInCode(userId: string | any): Promise<string> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found to assign check-in code');
  }

  if (user.checkInCode) {
    return user.checkInCode;
  }

  // Generate unique code with collision retry
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    code = generateCheckInCode();
    const existing = await User.findOne({ checkInCode: code }).select('_id').lean();
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback: append timestamp-derived suffix
    code = `${generateCheckInCode().slice(0, 4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  user.checkInCode = code;
  await user.save();

  return code;
}
