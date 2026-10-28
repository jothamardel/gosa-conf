import {
  User,
  ConventionRegistration,
  DinnerReservation,
  ConventionBrochure,
  Transaction,
} from '@/lib/schema';
import { getOrCreateUserCheckInCode } from '@/lib/utils/checkin-code';
import { CONVENTION_2026_START_DATE } from '@/lib/constants/pricing';

export class CheckInPassService {
  /**
   * Generates or retrieves the 8-character code and full 2026 convention pass for WhatsApp delivery.
   */
  static async getCheckInPass(
    senderJid: string,
    senderPhone?: string | null,
    pushName?: string,
  ): Promise<string> {
    try {
      const isLid = senderJid.endsWith('@lid');
      const cleanPhone = isLid ? null : senderJid.split('@')[0];
      const formattedPhone = cleanPhone
        ? cleanPhone.startsWith('+')
          ? cleanPhone
          : `+${cleanPhone}`
        : senderPhone || null;

      // 1. Look up user
      let user = await User.findOne({ whatsappJid: senderJid });
      if (!user && formattedPhone) {
        user = await User.findOne({ phoneNumber: formattedPhone });
        if (user && !user.whatsappJid) {
          user.whatsappJid = senderJid;
          await user.save().catch(() => {});
        }
      }

      if (!user && formattedPhone) {
        const rawDigits = formattedPhone.replace('+', '');
        const localFormat = rawDigits.startsWith('234') ? `0${rawDigits.slice(3)}` : rawDigits;
        const e164Format = rawDigits.startsWith('234') ? `+${rawDigits}` : `+234${rawDigits.replace(/^0/, '')}`;

        user = await User.findOne({
          $or: [
            { phoneNumber: e164Format },
            { phoneNumber: localFormat },
            { phoneNumber: rawDigits },
          ],
        });
      }

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://events.gosanigeria.ng').replace(/\/$/, '');
      const greetingName = user?.fullName?.split(' ')[0] || pushName?.split(' ')[0] || 'Member';

      // 2. Unregistered or No User Found
      if (!user) {
        return (
          `⚠️ *GOSA 2026 Convention Check-In*\n\n` +
          `Hello ${greetingName}! We could not find a confirmed *2026 Convention Ticket* or paid registration linked to your WhatsApp account.\n\n` +
          `🎟️ *To Register & Purchase Tickets*:\n` +
          `👉 ${baseUrl}/register\n\n` +
          `🏢 *Already at the Venue?*\n` +
          `Please proceed directly to the *Registration & Walk-In Desk* where desk officials will register you on-site, accept payment (Cash/POS/Transfer), and verify your check-in immediately!\n\n` +
          `Need help or want to buy tickets right now? Just tell me what you'd like to purchase! 😊`
        );
      }

      const userIdObj = user._id;
      const userIdStr = user._id.toString();
      const userMatch = { $in: [userIdObj, userIdStr] };
      const dateFilter2026 = { createdAt: { $gte: CONVENTION_2026_START_DATE } };

      // 3. Query 2026 Records
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
            { initiatorLid: senderJid },
            { source: senderJid },
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
          (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'convention')),
      );

      const hasDinnerTx = completedTx.some(
        (tx) =>
          tx.type === 'ticket_dinner' ||
          (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'dinner')),
      );

      const hasBrochureTx = completedTx.some(
        (tx) =>
          tx.type === 'brochure' ||
          (tx.type === 'cart' && (tx.metadata as any)?.items?.some((i: any) => i.type === 'brochure')),
      );

      const hasConvention = conventionRegs.length > 0 || hasConventionTx;
      const hasDinner = dinnerReservations.length > 0 || hasDinnerTx;
      const hasBrochure = brochures.length > 0 || hasBrochureTx;

      const hasAny2026Ticket = hasConvention || hasDinner || hasBrochure;

      // User has no confirmed 2026 tickets
      if (!hasAny2026Ticket) {
        return (
          `⚠️ *GOSA 2026 Convention Check-In*\n\n` +
          `Hello ${greetingName}! We could not find a confirmed *2026 Convention Ticket* or paid registration linked to your account.\n\n` +
          `🎟️ *To Register & Purchase Tickets*:\n` +
          `👉 ${baseUrl}/register\n\n` +
          `🏢 *Already at the Venue?*\n` +
          `Please proceed to our *Registration & Walk-In Desk* where desk officials will register you on-site, accept payment (Cash/POS/Transfer), and check you in immediately!\n\n` +
          `Need help or want to buy tickets right now? Just tell me what you'd like to purchase! 😊`
        );
      }

      // 4. User has valid 2026 ticket: Get or generate persistent 8-character checkInCode
      const checkInCode = await getOrCreateUserCheckInCode(user._id);

      // Quantities and status
      const conventionQty =
        conventionRegs.reduce((sum, r) => sum + (r.quantity || 1), 0) || (hasConventionTx ? 1 : 0);
      const dinnerGuests =
        dinnerReservations.reduce((sum, r) => sum + (r.numberOfGuests || 1), 0) || (hasDinnerTx ? 1 : 0);
      const brochureQty =
        brochures.reduce((sum, b) => sum + (b.quantity || 1), 0) || (hasBrochureTx ? 1 : 0);

      const isCheckedIn =
        conventionRegs.some((c: any) => c.checkedIn || c.checkIn) ||
        dinnerReservations.some((d: any) => d.checkedIn || d.checkIn);

      const primaryRef =
        conventionRegs[0]?.paymentReference ||
        dinnerReservations[0]?.paymentReference ||
        brochures[0]?.paymentReference ||
        completedTx[0]?.paymentReference ||
        'VERIFIED-2026';

      // Full official pass format (Option A3)
      let passText = `🎟️ *GOSA 2026 OFFICIAL CHECK-IN PASS*\n`;
      passText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      passText += `👤 *Attendee*: *${user.fullName}*\n`;
      passText += `🏷️ *Check-In Code*: *${checkInCode}*\n`;
      passText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      passText += `📋 *Your 2026 Registration Summary*:\n`;
      passText += `• *Convention Pass*: ${hasConvention ? `✅ Confirmed (${conventionQty} Pass)` : '❌ None'}\n`;
      passText += `• *Dinner Reservation*: ${hasDinner ? `✅ Confirmed (${dinnerGuests} Guest(s))` : '❌ None'}\n`;
      passText += `• *Brochure*: ${brochureQty > 0 ? `✅ Confirmed (${brochureQty} Copy)` : '❌ None'}\n`;
      passText += `• *Payment Ref*: \`${primaryRef}\`\n`;

      if (isCheckedIn) {
        passText += `\n🟢 *Status*: *Already Checked In* at the venue. Your code (*${checkInCode}*) remains valid throughout the convention.\n`;
      }

      passText += `\n📍 *Arrival Instructions*:\n`;
      passText += `Please present this 8-digit code (*${checkInCode}*) to the Check-In Desk officials upon arrival at the venue for instant sub-second verification and badge collection.\n\n`;
      passText += `Welcome to GOSA Convention 2026! 🎓✨`;

      return passText;
    } catch (err: any) {
      console.error('Error generating check-in pass:', err);
      return 'I encountered an issue generating your check-in pass. Please proceed directly to the registration desk where an official will assist you! 😊';
    }
  }
}
