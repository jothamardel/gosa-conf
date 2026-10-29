/**
 * Broadcast Spintax & Personalization Utility
 *
 * Implements randomized Spintax variation resolution ({opt1|opt2|opt3}) and
 * dynamic recipient variable insertion to ensure every single broadcast message
 * has a distinct cryptographic hash and human phrasing, eliminating Meta/Facebook
 * automated bulk spam triggers.
 */

export interface RecipientPlaceholderData {
  fullName: string;
  phoneNumber?: string;
  year?: string;
  portalUrl?: string;
}

/**
 * Resolves nested and sequential spintax tags: {word1|word2|word3}
 * Replaces each group with a uniformly random choice.
 */
export function resolveSpintax(text: string): string {
  if (!text) return '';

  const spintaxRegex = /\{([^{}]+)\}/g;
  let current = text;

  // Loop to handle nested spintax if present
  while (spintaxRegex.test(current)) {
    current = current.replace(spintaxRegex, (_match, group) => {
      const options = group.split('|');
      const randomIndex = Math.floor(Math.random() * options.length);
      return options[randomIndex] || '';
    });
  }

  return current;
}

/**
 * Personalizes a broadcast message template for a specific recipient.
 * Replaces placeholders, resolves spintax, and formats for WhatsApp delivery.
 */
export function personalizeMessage(
  template: string,
  data: RecipientPlaceholderData,
): string {
  if (!template) return '';

  const rawName = data.fullName || 'Esteemed GOSA Member';
  const firstName = rawName.trim().split(/\s+/)[0] || 'Alumnus';
  const portalUrl = data.portalUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://events.gosanigeria.ng/';

  let message = template
    .replace(/https?:\/\/(www\.)?gosa\.events\/?/gi, 'https://events.gosanigeria.ng/')
    .replace(/\{name\}/gi, rawName)
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{firstName\}/gi, firstName)
    .replace(/\{phone\}/gi, data.phoneNumber || '')
    .replace(/\{year\}/gi, data.year || 'Alumnus')
    .replace(/\{portal_link\}/gi, portalUrl)
    .replace(/\{ticket_link\}/gi, portalUrl);

  // Apply Spintax transformation
  message = resolveSpintax(message);

  return message.trim();
}

/**
 * Generates sample variations for live UI preview so the admin can see how
 * individual members will receive uniquely phrased messages.
 */
export function generateSpintaxVariations(
  template: string,
  sampleRecipient: RecipientPlaceholderData = {
    fullName: 'Dr. Ibrahim Danladi',
    phoneNumber: '+2348031234567',
    year: '1998',
  },
  count: number = 3,
): string[] {
  const variations: string[] = [];
  for (let i = 0; i < count; i++) {
    variations.push(personalizeMessage(template, sampleRecipient));
  }
  return variations;
}

/**
 * Default High-Conversion Campaign Templates
 */
export const BROADCAST_TEMPLATES = {
  FAST_TRACK_PASS: {
    id: 'fast-track-pass',
    title: '🚀 Fast-Track Pass (Beat the Check-In Queue)',
    template: `{Dear|Hello|Greetings} {first_name}! 🎓

{Get ready for|We are eagerly preparing for} the *GOSA 2026 Convention*!

To {avoid long queues|bypass registration delays|enjoy 1-second check-in} on arrival, kindly secure your official event pass online before event day:

🔗 *Fast-Track Online Portal:*
{portal_link}

💡 *Prefer to buy right here on WhatsApp?*
Reply *1* to buy your *Convention Pass (₦1,000)*
Reply *2* to get the *Full Experience (Convention + Gala Dinner)*

_Upon purchase, your 8-digit check-in code is generated instantly for seamless desk entry!_

— GOSA 2026 Planning Committee`,
  },

  DINNER_UPSELL: {
    id: 'dinner-upsell',
    title: '🍽️ Gala Dinner & Brochure Upgrade',
    template: `{Dear|Hello|Hi} {first_name},

{Thank you for registering for|We noticed you secured your pass for} the *GOSA 2026 Convention*! 🎉

{Don't miss the flagship evening celebration|Complete your convention experience} by reserving your seat at the *Annual Gala Dinner*:

🍽️ *Gala Dinner Pass*: ₦2,500
📖 *Anniversary Brochure*: ₦2,000

🔗 *Upgrade Your Pass Online:*
{portal_link}

💡 *Or reply right here:*
Reply *DINNER* to reserve your dinner ticket in 30 seconds!

— GOSA 2026 Executive Committee`,
  },

  URGENT_EVENT_REMINDER: {
    id: 'urgent-reminder',
    title: '⏰ Event Approaching: Final Ticket Call',
    template: `{Greetings|Hello|Dear} {first_name}!

{The countdown is on!|The grand convention is almost here!|Only a few days left until} *GOSA 2026*.

To ensure {smooth crowd flow|zero waiting time at check-in}, manual registrations at the venue desk will be limited. Please secure your ticket in advance:

🔗 *Direct Checkout:* {portal_link}

Or reply *PASS* to buy directly with our WhatsApp assistant!

See you at the convention! 🎊`,
  },
};
