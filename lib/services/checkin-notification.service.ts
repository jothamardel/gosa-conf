import { Wasender } from '@/lib/wasender-api';

export interface CheckInNotificationPayload {
  fullName: string;
  phoneNumber: string;
  checkInCode: string;
  ticketTypes: string[];
}

/**
 * Sends a background asynchronous WhatsApp message to the attendee confirming their check-in and check-in code.
 * Safe to fire-and-forget: errors are logged and will not affect desk throughput or check-in state.
 */
export async function sendAsyncCheckInNotification(payload: CheckInNotificationPayload): Promise<void> {
  try {
    if (!payload.phoneNumber) return;

    let clean = payload.phoneNumber.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
      clean = '234' + clean.slice(1);
    } else if (clean.length === 10 && /^[789]/.test(clean)) {
      clean = '234' + clean;
    } else if (clean.startsWith('234')) {
      // Already starts with 234
    } else {
      // Non-standard format, skip sending without throwing
      return;
    }

    const formattedTo = `+${clean}`;
    const ticketsLabel = payload.ticketTypes.length > 0 ? payload.ticketTypes.join(' & ') : 'Convention Pass';

    const text = `🎉 *Welcome to GOSA 2026 Convention, ${payload.fullName}!*

✅ *Check-In Verified*
🎫 *Items:* ${ticketsLabel}
🏷️ *Your Official Check-In Code:* *${payload.checkInCode}*

_Please keep this code (*${payload.checkInCode}*) handy for badge collection, dinner admission, and brochure pickup._

Have a wonderful convention!
— GOSA 2026 Executive Committee`;

    await Wasender.httpSenderMessage({
      to: formattedTo,
      text,
    });
  } catch (err: any) {
    console.warn('[CheckIn Notification] Async dispatch warning:', err?.message || err);
  }
}
