import { Wasender } from "@/lib/wasender-api";
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import connectDB from "@/lib/mongodb";
import { Agent } from "@/lib/agent";
import {
  User,
  ConventionRegistration,
  DinnerReservation,
  WhatsAppGroup,
  WhatsAppSession,
  ProductPurchase,
  Donation,
  ConventionBrochure,
  Transaction
} from "@/lib/schema";
import { Payment } from "@/lib/paystack-api";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

// Global cache variables for the bot's profile identity
let cachedBotJid: string | null = null;
let cachedBotLid: string | null = null;

function normalizeJidToPhone(jid: string): string {
  const rawNumber = jid.split('@')[0];
  if (rawNumber.startsWith('+')) return rawNumber;
  return '+' + rawNumber;
}

async function resolveJidToPn(jid: string): Promise<string> {
  if (jid && jid.endsWith('@lid')) {
    try {
      const resolvedPn = await Wasender.getPnFromLid(jid);
      if (resolvedPn) {
        return resolvedPn;
      }
    } catch (error) {
      console.error(`Error resolving LID ${jid} to phone JID:`, error);
    }
  }
  return jid;
}

async function getLidForJid(jid: string): Promise<string | null> {
  if (!jid) return null;
  if (jid.endsWith('@lid')) {
    return jid;
  }
  if (jid.endsWith('@s.whatsapp.net')) {
    try {
      const lid = await Wasender.getLidFromPn(jid);
      if (lid) return lid;
    } catch (err) {
      console.warn(`Failed to resolve LID for JID ${jid}:`, err);
    }
  }
  return null;
}

function calculatePaystackTotal(baseAmount: number): number {
  // Paystack fee rule:
  // - 1.5% + 100 applies to amounts above 2,000.
  // - Anything <= 2,000 only applies the 1.5% fee (no flat 100).
  // - Capped at 2,000 Naira.
  let fee = 0;
  if (baseAmount > 2000) {
    fee = (baseAmount * 0.015) + 100;
  } else {
    fee = baseAmount * 0.015;
  }
  const cappedFee = Math.min(fee, 2000);
  return Math.round(baseAmount + cappedFee);
}

function sanitizeMessage(text: string): string {
  // Convert double asterisks (markdown bold) to single asterisks (WhatsApp bold)
  let cleanText = text.replace(/\*\*/g, "*");
  // Automatically strip out any JID or LID suffixes like @s.whatsapp.net, @g.us, @lid
  // Example: 2347033680280@s.whatsapp.net -> +2347033680280
  cleanText = cleanText.replace(/([0-9\-]+)@(s\.whatsapp\.net|g\.us|lid)/g, (match, phone) => {
    return `+${phone}`;
  });
  // Strip out any trailing internal database IDs if present
  cleanText = cleanText.replace(/[0-9a-fA-F]{24}/g, "");
  return cleanText;
}

function formatGroupResponse(text: string): string {
  const cleanText = sanitizeMessage(text).trim();
  return `🌟 *GOSA BILKWAS* 🌟
━━━━━━━━━━━━━━━━━━

${cleanText}

━━━━━━━━━━━━━━━━━━
📅 *GOSA CONVENTION 2026*
• *Theme:* _BUILDING BRIDGES, CONNECTING THE PAST WITH THE PRESENT._
• *Date:* 31st October, 2026
• *Venue:* Crispan
• *Website:* events.gosanigeria.ng

📢 *Ad:* Advertise your business here! Contact us at *08098341778*`;
}

async function resolveMentionsToJids(
  targets: string[],
  groupJid: string,
  mentionedJids: string[]
): Promise<string[]> {
  const resolved: string[] = [];
  let nativeIndex = 0;

  for (const target of targets) {
    if (target.toLowerCase() === "all" || target.toLowerCase() === "@all") {
      const group = await WhatsAppGroup.findOne({ groupId: groupJid });
      if (group && group.participants && group.participants.length > 0) {
        return group.participants;
      }
      return ["all"];
    }

    // 1. Try native mentions first
    if (nativeIndex < mentionedJids.length) {
      resolved.push(mentionedJids[nativeIndex]);
      nativeIndex++;
      continue;
    }

    // 2. Try text match in database
    const cleanName = target.replace("@", "").trim();
    if (cleanName) {
      const matchedUser = await User.findOne({
        fullName: { $regex: cleanName, $options: "i" }
      });
      if (matchedUser) {
        resolved.push(`${matchedUser.phoneNumber.replace("+", "")}@s.whatsapp.net`);
        continue;
      }
    }
  }

  return resolved;
}

async function syncGroupParticipants(groupId: string) {
  try {
    const participants = await Wasender.getGroupParticipants(groupId);
    if (participants && participants.length > 0) {
      // Find existing group record first to see if name is already populated
      const existingRecord = await WhatsAppGroup.findOne({ groupId });
      let groupName = existingRecord?.name || "";

      // Try to fetch name from groups API
      try {
        const groups = await Wasender.getGroups();
        console.log("All groups: ", groups)
        const found = groups.find((g: any) => (g.id || g.jid) === groupId);
        if (found && found.name) {
          groupName = found.name;
        }
        console.log("Found: ", found)
      } catch (err) {
        console.warn(`Failed to resolve group name for ${groupId}:`, err);
      }

      // Fall back if empty
      if (!groupName) {
        groupName = "GOSA Group";
      }

      await WhatsAppGroup.findOneAndUpdate(
        { groupId },
        {
          name: groupName,
          participants,
          active: true,
          lastSyncedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`Synced ${participants.length} participants for group ${groupId} with name "${groupName}"`);
    }
  } catch (error) {
    console.error(`Error syncing group participants for ${groupId}:`, error);
  }
}

async function syncAllGroups(sessionId: string) {
  try {
    const groupsList = await Wasender.getGroups();
    if (groupsList && groupsList.length > 0) {
      const { WhatsAppGroup } = await import("@/lib/schema");
      for (const group of groupsList) {
        const targetJid = group.id || group.jid;
        if (targetJid) {
          // Fetch participants list for this group to sync it to DB
          let groupParticipants: string[] = [];
          try {
            groupParticipants = await Wasender.getGroupParticipants(targetJid);
          } catch (pErr) {
            console.error(`Failed to fetch participants for group ${targetJid}:`, pErr);
          }

          // Find existing record to preserve name if needed
          const existingRecord = await WhatsAppGroup.findOne({ groupId: targetJid });
          const finalName = group.name || existingRecord?.name || "GOSA Group";

          await WhatsAppGroup.findOneAndUpdate(
            { groupId: targetJid },
            {
              name: finalName,
              participants: groupParticipants,
              active: true,
              lastSyncedAt: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }
      console.log(`[GROUP-SYNC] Successfully synced ${groupsList.length} groups to DB!`);
    }
  } catch (error) {
    console.error("Failed to sync all groups:", error);
  }
}

async function runBroadcast(
  participants: string[],
  messageContent: string,
  targetGroupName: string,
  remoteJid: string
) {
  console.log(`[BROADCAST] Starting async broadcast to ${participants.length} participants of group...`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    
    // Add 10-second delay between consecutive messages
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    try {
      const res = await Wasender.httpSenderMessage({
        to: participant,
        text: sanitizeMessage(messageContent)
      });
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      console.error(`Broadcast failed to send to ${participant}:`, err);
      failCount++;
    }
  }

  // Once finished, notify the admin group JID
  try {
    const completionText = `I have finished broadcasting the message to the participants of group *${targetGroupName}*.\n\n• *Total*: ${participants.length}\n• *Delivered*: ${successCount}\n• *Failed*: ${failCount}`;
    const formattedText = formatGroupResponse(completionText);
    await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
  } catch (confirmErr) {
    console.error("Failed to send broadcast completion confirmation:", confirmErr);
  }
}

async function handlePaymentFlow(
  senderUser: any,
  action: {
    type: string;
    ticketType?: 'convention' | 'dinner';
    productType?: 'uniform' | 'emblem' | 'magazine' | 'brochure';
    quantity?: number;
    amount?: number;
    targetJids: string[];
    items?: Array<{
      type: 'convention' | 'dinner' | 'brochure' | 'uniform' | 'emblem' | 'magazine' | 'donation';
      quantity: number;
      amount?: number;
      targetJids?: string[];
    }>;
  },
  remoteJid: string,
  senderJid: string,
  rawSenderJid?: string,
  rawMentionedJids?: string[]
) {
  // Resolve LID of initiator and mentions
  const initiatorLid = rawSenderJid ? await getLidForJid(rawSenderJid) : null;
  const mentionLids: string[] = [];
  if (rawMentionedJids && rawMentionedJids.length > 0) {
    for (const jid of rawMentionedJids) {
      const lid = await getLidForJid(jid);
      if (lid) mentionLids.push(lid);
    }
  }

  if (action.type === 'checkout_cart') {
    let cartBaseTotalAmount = 0;
    const cartItems = action.items || [];

    for (const item of cartItems) {
      let itemUnitPrice = 0;
      if (item.type === 'convention') itemUnitPrice = 1000;
      else if (item.type === 'dinner') itemUnitPrice = 2500;
      else if (item.type === 'brochure') itemUnitPrice = 2000;
      else if (item.type === 'uniform') itemUnitPrice = 15000;
      else if (item.type === 'emblem') itemUnitPrice = 2000;
      else if (item.type === 'magazine') itemUnitPrice = 3000;
      else if (item.type === 'donation') itemUnitPrice = item.amount || 0;

      const itemQuantity = (item.type === 'convention' || item.type === 'dinner' || item.type === 'donation')
        ? (item.targetJids && item.targetJids.length > 0 ? item.targetJids.length : (item.quantity || 1))
        : (item.quantity || 1);

      cartBaseTotalAmount += itemUnitPrice * itemQuantity;
    }

    const cartTotalAmount = calculatePaystackTotal(cartBaseTotalAmount);
    const paymentReference = `cart_${Date.now()}_${senderUser.phoneNumber.replace('+', '')}`;

    const paystackRes = await Payment.httpInitializePayment({
      email: senderUser.email,
      amount: cartTotalAmount,
      reference: paymentReference
    });

    if (!paystackRes?.status || !paystackRes?.data?.authorization_url) {
      throw new Error("Failed to initialize payment with Paystack.");
    }

    const checkoutUrl = paystackRes.data.authorization_url;
    const isGroup = remoteJid.endsWith('@g.us');

    // Create the unified transaction
    await Transaction.create({
      userId: senderUser._id,
      paymentReference: paymentReference,
      amount: cartTotalAmount,
      type: 'cart',
      status: 'pending',
      source: remoteJid,
      initiatorLid: initiatorLid || undefined,
      mentionLids: mentionLids,
      metadata: {
        items: cartItems,
        baseTotalAmount: cartBaseTotalAmount,
        groupJid: isGroup ? remoteJid : null
      }
    });

    // Create pending records in respective collections
    for (let index = 0; index < cartItems.length; index++) {
      const item = cartItems[index];
      let itemUnitPrice = 0;
      if (item.type === 'convention') itemUnitPrice = 1000;
      else if (item.type === 'dinner') itemUnitPrice = 2500;
      else if (item.type === 'brochure') itemUnitPrice = 2000;
      else if (item.type === 'uniform') itemUnitPrice = 15000;
      else if (item.type === 'emblem') itemUnitPrice = 2000;
      else if (item.type === 'magazine') itemUnitPrice = 3000;
      else if (item.type === 'donation') itemUnitPrice = item.amount || 0;

      const itemQuantity = (item.type === 'convention' || item.type === 'dinner' || item.type === 'donation')
        ? (item.targetJids && item.targetJids.length > 0 ? item.targetJids.length : (item.quantity || 1))
        : (item.quantity || 1);

      const itemBaseTotalAmount = itemUnitPrice * itemQuantity;
      const itemRef = `${paymentReference}_${index}`;

      if (item.type === 'convention' || item.type === 'dinner') {
        const itemTargetJids = item.targetJids || [];
        if (itemTargetJids.length === 0) {
          // BUY FOR ONESELF: Create single record with quantity
          if (item.type === 'dinner') {
            await DinnerReservation.create({
              userId: senderUser._id,
              paymentReference: itemRef,
              numberOfGuests: itemQuantity,
              guestDetails: Array(itemQuantity).fill({
                name: senderUser.fullName,
                email: senderUser.email,
                phone: senderUser.phoneNumber,
              }),
              totalAmount: itemBaseTotalAmount,
              confirmed: false,
              status: 'pending',
              isPrimaryContact: true,
            });
          } else {
            await ConventionRegistration.create({
              userId: senderUser._id,
              paymentReference: itemRef,
              amount: itemBaseTotalAmount,
              quantity: itemQuantity,
              confirm: false,
              status: 'pending',
            });
          }
        } else {
          // BUY FOR MENTIONS: Create individual records
          for (let i = 0; i < itemTargetJids.length; i++) {
            const targetJid = itemTargetJids[i];
            const targetPhone = targetJid.split('@')[0];

            let targetUser = await User.findOne({
              phoneNumber: { $regex: targetPhone }
            });
            if (!targetUser) {
              const targetEmail = `${targetPhone}@event.gosanigeria.ng`;
              const existingEmailUser = await User.findOne({ email: targetEmail });
              if (existingEmailUser) {
                targetUser = existingEmailUser;
                if (targetUser.phoneNumber !== `+${targetPhone}`) {
                  targetUser.phoneNumber = `+${targetPhone}`;
                  await targetUser.save();
                }
              } else {
                targetUser = await User.create({
                  fullName: `GOSA Member (${targetPhone})`,
                  phoneNumber: `+${targetPhone}`,
                  email: targetEmail
                });
              }
            }

            const individualRef = `${itemRef}_${i}`;

            if (item.type === 'dinner') {
              await DinnerReservation.create({
                userId: targetUser._id,
                paymentReference: individualRef,
                numberOfGuests: 1,
                guestDetails: [{
                  name: targetUser.fullName,
                  email: targetUser.email,
                  phone: targetUser.phoneNumber,
                }],
                totalAmount: itemUnitPrice,
                confirmed: false,
                status: 'pending',
                isPrimaryContact: i === 0,
              });
            } else {
              await ConventionRegistration.create({
                userId: targetUser._id,
                paymentReference: individualRef,
                amount: itemUnitPrice,
                quantity: 1,
                confirm: false,
                status: 'pending',
              });
            }
          }
        }
      } else if (item.type === 'donation') {
        const itemTargetJids = item.targetJids || [];
        if (itemTargetJids.length === 0) {
          // Single donation by sender
          await Donation.create({
            userId: senderUser._id,
            paymentReference: itemRef,
            amount: itemBaseTotalAmount,
            donorName: senderUser.fullName,
            donorEmail: senderUser.email,
            donorPhone: senderUser.phoneNumber,
            anonymous: false,
            confirmed: false,
            receiptNumber: `DON-${Date.now()}-${senderUser.phoneNumber.slice(-4)}-${index}`
          });
        } else {
          for (let i = 0; i < itemTargetJids.length; i++) {
            const targetJid = itemTargetJids[i];
            const targetPhone = targetJid.split('@')[0];

            let targetUser = await User.findOne({
              phoneNumber: { $regex: targetPhone }
            });
            if (!targetUser) {
              const targetEmail = `${targetPhone}@event.gosanigeria.ng`;
              const existingEmailUser = await User.findOne({ email: targetEmail });
              if (existingEmailUser) {
                targetUser = existingEmailUser;
                if (targetUser.phoneNumber !== `+${targetPhone}`) {
                  targetUser.phoneNumber = `+${targetPhone}`;
                  await targetUser.save();
                }
              } else {
                targetUser = await User.create({
                  fullName: `GOSA Member (${targetPhone})`,
                  phoneNumber: `+${targetPhone}`,
                  email: targetEmail
                });
              }
            }

            const individualRef = `${itemRef}_${i}`;

            await Donation.create({
              userId: targetUser._id,
              paymentReference: individualRef,
              amount: itemUnitPrice,
              donorName: senderUser.fullName,
              donorEmail: senderUser.email,
              donorPhone: senderUser.phoneNumber,
              anonymous: false,
              confirmed: false,
              receiptNumber: `DON-${Date.now()}-${targetPhone.slice(-4)}-${index}-${i}`
            });
          }
        }
      } else if (item.type === 'brochure') {
        await ConventionBrochure.create({
          userId: senderUser._id,
          paymentReference: itemRef,
          quantity: itemQuantity,
          brochureType: 'physical',
          recipientDetails: [{
            name: senderUser.fullName,
            email: senderUser.email,
            phone: senderUser.phoneNumber,
          }],
          totalAmount: itemBaseTotalAmount,
          confirmed: false,
          qrCode: `GOSA-BRO-${Date.now()}-${senderUser.phoneNumber.slice(-4)}`,
          collected: false,
          status: 'pending',
        });
      } else {
        await ProductPurchase.create({
          userId: senderUser._id,
          productType: item.type as any,
          quantity: itemQuantity,
          totalAmount: itemBaseTotalAmount,
          paymentReference: itemRef,
          status: 'pending',
          confirmed: false,
        });
      }
    }

    const feeAmount = cartTotalAmount - cartBaseTotalAmount;
    let cartItemsSummaryText = "";
    for (const item of cartItems) {
      const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      const itemQuantity = (item.type === 'convention' || item.type === 'dinner' || item.type === 'donation')
        ? (item.targetJids && item.targetJids.length > 0 ? item.targetJids.length : (item.quantity || 1))
        : (item.quantity || 1);
      cartItemsSummaryText += `• ${itemQuantity}x GOSA ${typeLabel}\n`;
    }

    const responseText = `🛒 *Combined Cart Checkout*

Items in Cart:
${cartItemsSummaryText.trim()}

Amount: ₦${cartBaseTotalAmount.toLocaleString()}
Fee: ₦${feeAmount.toLocaleString()}
Email: ${senderUser.email}
Type: Combined Purchase

👉 Tap the link below to make payment:
${checkoutUrl}`;

    const formattedText = isGroup ? formatGroupResponse(responseText) : sanitizeMessage(responseText);

    await Wasender.httpSenderMessage({
      to: remoteJid,
      text: formattedText
    });

    return;
  }

  let unitPrice = 0;
  let serviceName = "";

  if (action.type === 'buy_tickets') {
    if (action.ticketType === 'dinner') {
      unitPrice = 2500;
      serviceName = "Dinner Ticket";
    } else {
      unitPrice = 1000; // convention registration
      serviceName = "Convention Ticket";
    }
  } else if (action.type === 'buy_product') {
    if (action.productType === 'uniform') {
      unitPrice = 15000;
      serviceName = "GOSA Uniform";
    } else if (action.productType === 'emblem') {
      unitPrice = 2000;
      serviceName = "GOSA Emblem";
    } else if (action.productType === 'magazine') {
      unitPrice = 3000;
      serviceName = "Magazine";
    } else if (action.productType === 'brochure') {
      unitPrice = 2000;
      serviceName = "Convention Brochure";
    }
  } else if (action.type === 'donation') {
    unitPrice = action.amount || 0;
    serviceName = "GOSA Donation";
  }

  if (unitPrice === 0) {
    throw new Error("Invalid product, donation, or ticket type requested.");
  }

  const quantity = (action.type === 'buy_tickets' || action.type === 'donation')
    ? (action.targetJids.length || action.quantity || 1)
    : (action.quantity || 1);
  const baseTotalAmount = unitPrice * quantity;
  const totalAmount = calculatePaystackTotal(baseTotalAmount);

  const prefix = action.type === 'buy_tickets'
    ? action.ticketType
    : (action.type === 'donation' ? 'donation' : action.productType);

  const paymentReference = `${prefix}_${Date.now()}_${senderUser.phoneNumber.replace('+', '')}`;

  const paystackRes = await Payment.httpInitializePayment({
    email: senderUser.email,
    amount: totalAmount,
    reference: paymentReference
  });

  if (!paystackRes?.status || !paystackRes?.data?.authorization_url) {
    throw new Error("Failed to initialize payment with Paystack.");
  }

  const checkoutUrl = paystackRes.data.authorization_url;

  // Determine Transaction type
  let transactionType: 'ticket_convention' | 'ticket_dinner' | 'product_uniform' | 'product_emblem' | 'product_magazine' | 'product_brochure' | 'donation' = 'donation';
  if (action.type === 'buy_tickets') {
    transactionType = action.ticketType === 'dinner' ? 'ticket_dinner' : 'ticket_convention';
  } else if (action.type === 'buy_product') {
    if (action.productType === 'uniform') transactionType = 'product_uniform';
    else if (action.productType === 'emblem') transactionType = 'product_emblem';
    else if (action.productType === 'magazine') transactionType = 'product_magazine';
    else if (action.productType === 'brochure') transactionType = 'product_brochure';
  } else if (action.type === 'donation') {
    transactionType = 'donation';
  }

  const isGroup = remoteJid.endsWith('@g.us');

  // Create unified Transaction record
  await Transaction.create({
    userId: senderUser._id,
    paymentReference: paymentReference,
    amount: totalAmount,
    type: transactionType,
    status: 'pending',
    source: remoteJid,
    initiatorLid: initiatorLid || undefined,
    mentionLids: mentionLids,
    metadata: {
      quantity,
      targets: action.targetJids,
      baseTotalAmount,
      groupJid: isGroup ? remoteJid : null
    }
  });

  if (action.type === 'buy_tickets') {
    if (action.targetJids.length === 0) {
      // BUY FOR ONESELF: Create single record with quantity
      if (action.ticketType === 'dinner') {
        await DinnerReservation.create({
          userId: senderUser._id,
          paymentReference,
          numberOfGuests: quantity,
          guestDetails: Array(quantity).fill({
            name: senderUser.fullName,
            email: senderUser.email,
            phone: senderUser.phoneNumber,
          }),
          totalAmount: baseTotalAmount,
          confirmed: false,
          status: 'pending',
          isPrimaryContact: true,
        });
      } else {
        await ConventionRegistration.create({
          userId: senderUser._id,
          paymentReference,
          amount: baseTotalAmount,
          quantity: quantity,
          confirm: false,
          status: 'pending',
        });
      }
    } else {
      for (let i = 0; i < action.targetJids.length; i++) {
        const targetJid = action.targetJids[i];
        const targetPhone = targetJid.split('@')[0];

        let targetUser = await User.findOne({
          phoneNumber: { $regex: targetPhone }
        });
        if (!targetUser) {
          const targetEmail = `${targetPhone}@event.gosanigeria.ng`;
          const existingEmailUser = await User.findOne({ email: targetEmail });
          if (existingEmailUser) {
            targetUser = existingEmailUser;
            if (targetUser.phoneNumber !== `+${targetPhone}`) {
              targetUser.phoneNumber = `+${targetPhone}`;
              await targetUser.save();
            }
          } else {
            targetUser = await User.create({
              fullName: `GOSA Member (${targetPhone})`,
              phoneNumber: `+${targetPhone}`,
              email: targetEmail
            });
          }
        }

        const individualRef = `${paymentReference}_${i}`;

        if (action.ticketType === 'dinner') {
          await DinnerReservation.create({
            userId: targetUser._id,
            paymentReference: individualRef,
            numberOfGuests: 1,
            guestDetails: [{
              name: targetUser.fullName,
              email: targetUser.email,
              phone: targetUser.phoneNumber,
            }],
            totalAmount: unitPrice,
            confirmed: false,
            status: 'pending',
            isPrimaryContact: i === 0,
          });
        } else {
          await ConventionRegistration.create({
            userId: targetUser._id,
            paymentReference: individualRef,
            amount: unitPrice,
            quantity: 1,
            confirm: false,
            status: 'pending',
          });
        }
      }
    }
  } else if (action.type === 'donation') {
    if (action.targetJids.length === 0) {
      await Donation.create({
        userId: senderUser._id,
        paymentReference,
        amount: baseTotalAmount,
        donorName: senderUser.fullName,
        donorEmail: senderUser.email,
        donorPhone: senderUser.phoneNumber,
        anonymous: false,
        confirmed: false,
        receiptNumber: `DON-${Date.now()}-${senderUser.phoneNumber.slice(-4)}`
      });
    } else {
      for (let i = 0; i < action.targetJids.length; i++) {
        const targetJid = action.targetJids[i];
        const targetPhone = targetJid.split('@')[0];

        let targetUser = await User.findOne({
          phoneNumber: { $regex: targetPhone }
        });
        if (!targetUser) {
          const targetEmail = `${targetPhone}@event.gosanigeria.ng`;
          const existingEmailUser = await User.findOne({ email: targetEmail });
          if (existingEmailUser) {
            targetUser = existingEmailUser;
            if (targetUser.phoneNumber !== `+${targetPhone}`) {
              targetUser.phoneNumber = `+${targetPhone}`;
              await targetUser.save();
            }
          } else {
            targetUser = await User.create({
              fullName: `GOSA Member (${targetPhone})`,
              phoneNumber: `+${targetPhone}`,
              email: targetEmail
            });
          }
        }

        const individualRef = `${paymentReference}_${i}`;

        await Donation.create({
          userId: targetUser._id,
          paymentReference: individualRef,
          amount: unitPrice,
          donorName: senderUser.fullName,
          donorEmail: senderUser.email,
          donorPhone: senderUser.phoneNumber,
          anonymous: false,
          confirmed: false,
          receiptNumber: `DON-${Date.now()}-${targetPhone.slice(-4)}-${i}`
        });
      }
    }
  } else if (action.type === 'buy_product') {
    if (action.productType === 'brochure') {
      await ConventionBrochure.create({
        userId: senderUser._id,
        paymentReference,
        quantity,
        brochureType: 'physical',
        recipientDetails: [{
          name: senderUser.fullName,
          email: senderUser.email,
          phone: senderUser.phoneNumber,
        }],
        totalAmount: baseTotalAmount,
        confirmed: false,
        qrCode: `GOSA-BRO-${Date.now()}-${senderUser.phoneNumber.slice(-4)}`,
        collected: false,
        status: 'pending',
      });
    } else {
      await ProductPurchase.create({
        userId: senderUser._id,
        productType: action.productType,
        quantity,
        totalAmount: baseTotalAmount,
        paymentReference,
        status: 'pending',
        confirmed: false,
      });
    }
  }

  const feeAmount = totalAmount - baseTotalAmount;
  const typeLabel = quantity > 1 ? `${serviceName}s` : serviceName;
  const responseText = `Amount: ₦${baseTotalAmount.toLocaleString()}
Fee: ₦${feeAmount.toLocaleString()}
Email: ${senderUser.email}
Type: ${typeLabel}

👉 Tap the link below to make payment:
${checkoutUrl}`;

  const formattedText = isGroup ? formatGroupResponse(responseText) : sanitizeMessage(responseText);

  await Wasender.httpSenderMessage({
    to: remoteJid,
    text: formattedText
  });
}

async function handleHistoryQuery(senderJid: string, remoteJid: string) {
  const senderPhone = normalizeJidToPhone(senderJid);
  const user = await User.findOne({ phoneNumber: senderPhone });

  if (!user) {
    const defaultResponse = "I searched our GOSA records, but I couldn't find your profile. Therefore, you don't have any transaction history yet.";
    const isGroup = remoteJid.endsWith('@g.us');
    const formattedText = isGroup ? formatGroupResponse(defaultResponse) : sanitizeMessage(defaultResponse);

    await Wasender.httpSenderMessage({
      to: remoteJid,
      text: formattedText
    });
    return;
  }

  const conventions = await ConventionRegistration.find({ userId: user._id });
  const dinners = await DinnerReservation.find({ userId: user._id });
  const products = await ProductPurchase.find({ userId: user._id });
  const donations = await Donation.find({ userId: user._id });
  const brochures = await ConventionBrochure.find({ userId: user._id });

  let text = `Here is your transaction summary:\n\n`;
  let hasTransactions = false;

  if (conventions.length > 0) {
    hasTransactions = true;
    text += `*Convention Registrations:* \n`;
    conventions.forEach((c) => {
      text += `• Ref: ${c.paymentReference.split('_')[0]} | ₦${c.amount.toLocaleString()} | Status: ${c.confirm ? "Confirmed ✅" : "Pending ⏳"}\n`;
    });
    text += `\n`;
  }

  if (dinners.length > 0) {
    hasTransactions = true;
    text += `*Dinner Reservations:* \n`;
    dinners.forEach((d) => {
      text += `• Ref: ${d.paymentReference.split('_')[0]} | ₦${d.totalAmount.toLocaleString()} | Status: ${d.confirmed ? "Confirmed ✅" : "Pending ⏳"}\n`;
    });
    text += `\n`;
  }

  if (products.length > 0) {
    hasTransactions = true;
    text += `*Product Purchases (GOSA Shop):* \n`;
    products.forEach((p) => {
      const typeLabel = p.productType.charAt(0).toUpperCase() + p.productType.slice(1);
      text += `• ${p.quantity}x ${typeLabel} | ₦${p.totalAmount.toLocaleString()} | Status: ${p.confirmed ? "Confirmed ✅" : "Pending ⏳"}\n`;
    });
    text += `\n`;
  }

  if (brochures.length > 0) {
    hasTransactions = true;
    text += `*Brochure Orders:* \n`;
    brochures.forEach((b) => {
      text += `• ${b.quantity}x Brochure | ₦${b.totalAmount.toLocaleString()} | Status: ${b.confirmed ? "Confirmed ✅" : "Pending ⏳"}\n`;
    });
    text += `\n`;
  }

  if (donations.length > 0) {
    hasTransactions = true;
    text += `*Donations:* \n`;
    donations.forEach((d) => {
      text += `• Ref: ${d.paymentReference.split('_')[0]} | ₦${d.amount.toLocaleString()} | Status: ${d.confirmed ? "Confirmed ✅" : "Pending ⏳"}\n`;
    });
    text += `\n`;
  }

  if (!hasTransactions) {
    text = "I see your profile, but you have not made any purchases or registrations yet.";
  } else {
    text += `Always at your service!`;
  }

  const isGroup = remoteJid.endsWith('@g.us');
  const responseText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);

  await Wasender.httpSenderMessage({
    to: remoteJid,
    text: responseText
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log(body)

    // Prevent duplicate processing by only listening to allowed events
    const allowedEvents = [
      'messages.received',
      'messages-group.received',
      'group-participants.update',
      'groups.upsert'
    ];
    if (body?.event && !allowedEvents.includes(body.event)) {
      return NextResponse.json({ message: `Ignoring event ${body.event}`, success: true });
    }

    if (body?.event === 'groups.upsert') {
      console.log(`[GROUPS-UPSERT] Groups upsert event received. Syncing groups...`);
      try {
        await connectDB();
        await syncAllGroups(body.sessionId);
      } catch (err) {
        console.error("Error handling groups.upsert event:", err);
      }
      return NextResponse.json({ message: "Groups upsert processed", success: true });
    }

    if (body?.event === 'group-participants.update') {
      const { groupId, jid: groupJid, participants, action } = body.data || {};
      const resolvedGroupJid = groupId || groupJid;
      if (resolvedGroupJid && Array.isArray(participants) && participants.length > 0) {
        // Resolve bot JID and LID for the current session to check if the bot is involved
        let botJid = "";
        let botLid = "";
        try {
          const fetchedJid = await Wasender.getBotJidFromSession(body.sessionId);
          if (fetchedJid) {
            botJid = fetchedJid;
            botLid = (await Wasender.getLidFromPn(botJid)) || "";
          }
        } catch (err) {
          console.error("Error resolving bot JID/LID for participants update check:", err);
        }

        // Extract participant IDs (supporting strings or objects)
        const participantIds: string[] = [];
        for (const p of participants) {
          if (typeof p === 'string') {
            participantIds.push(p);
          } else if (p && typeof p === 'object') {
            const val = p.jid || p.id || p.user || p.participant;
            if (val) participantIds.push(val);
          }
        }

        // Check if the bot was involved
        const isBotInvolved = participantIds.some((p: string) => {
          const numericP = p.replace(/\D/g, '');
          const numericBotJid = botJid.replace(/\D/g, '');
          const numericBotLid = botLid.replace(/\D/g, '');

          return (
            (numericBotJid && (numericBotJid.endsWith(numericP) || numericP.endsWith(numericBotJid))) ||
            (numericBotLid && (numericBotLid.endsWith(numericP) || numericP.endsWith(numericBotLid)))
          );
        });

        if (isBotInvolved) {
          await connectDB();
          const { WhatsAppGroup } = await import("@/lib/schema");

          if (action === 'add') {
            console.log(`[BOT-ADD] Bot added to group: ${resolvedGroupJid}. Triggering group sync...`);
            try {
              await syncAllGroups(body.sessionId);
            } catch (syncErr) {
              console.error("[BOT-ADD] Error syncing groups after bot addition:", syncErr);
            }
          } else if (action === 'remove') {
            console.log(`[BOT-REMOVE] Bot removed from group: ${resolvedGroupJid}. Updating database...`);
            try {
              // Mark group as inactive and clear participants list per user preference
              await WhatsAppGroup.findOneAndUpdate(
                { groupId: resolvedGroupJid },
                {
                  active: false,
                  participants: [],
                  lastSyncedAt: new Date()
                },
                { upsert: true }
              );
              console.log(`[BOT-REMOVE] Group ${resolvedGroupJid} marked inactive and participants cleared.`);
            } catch (err) {
              console.error("[BOT-REMOVE] Error marking group inactive:", err);
            }
          }
        }
      }
      return NextResponse.json({ message: "Group participants update processed", success: true });
    }

    // Self-message prevention
    if (body?.data?.messages?.key?.fromMe) {
      return NextResponse.json({ message: "Ignore self message", success: true });
    }

    const remoteJid = body?.data?.messages?.key?.remoteJid;
    const rawSenderJid = body?.data?.messages?.key?.participant || remoteJid;

    if (!remoteJid || !rawSenderJid) {
      return NextResponse.json({ message: "No JID provided", success: false });
    }

    const msgObj = body?.data?.messages?.message;
    const messageText = (
      msgObj?.conversation ||
      msgObj?.extendedTextMessage?.text ||
      msgObj?.imageMessage?.caption ||
      msgObj?.videoMessage?.caption ||
      ""
    ).trim();

    if (!messageText) {
      return NextResponse.json({ message: "Empty message", success: true });
    }

    const isGroup = remoteJid.endsWith('@g.us');

    // Dynamically resolve LIDs (Linked Identity JIDs) to standard phone number JIDs
    const senderJid = await resolveJidToPn(rawSenderJid);

    const rawMentionedJids = msgObj?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const mentionedJids: string[] = [];
    for (const rawJid of rawMentionedJids) {
      mentionedJids.push(await resolveJidToPn(rawJid));
    }

    // Fetch bot profile details and cache them to identify native mentions using the session ID
    if (!cachedBotJid) {
      try {
        const botJid = await Wasender.getBotJidFromSession(body.sessionId);
        if (botJid) {
          cachedBotJid = botJid;
        }
      } catch (err) {
        console.error("Error fetching bot JID from session:", err);
      }
    }
    if (cachedBotJid && !cachedBotLid) {
      try {
        cachedBotLid = await Wasender.getLidFromPn(cachedBotJid);
      } catch (err) {
        console.error("Error fetching bot LID:", err);
      }
    }

    await connectDB();

    // Active conversational session (processed early so group chat approvals bypass the bot mention check)
    const session = await WhatsAppSession.findOne({ jid: senderJid });
    if (session) {
      if (session.pendingAction.type === 'approve_send_group_message') {
        const cleanMsg = messageText.trim().toLowerCase();
        if (cleanMsg === 'yes' || cleanMsg === 'approve' || cleanMsg === 'confirm' || cleanMsg === 'send' || cleanMsg === 'y') {
          const { messageContent } = session.pendingAction;
          
          // Forward message asynchronously in the background
          const runGroupSend = async () => {
            const formattedMessage = formatGroupResponse(messageContent);
            const groupsList = await WhatsAppGroup.find({ active: true });
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < groupsList.length; i++) {
              const g = groupsList[i];
              
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 10000));
              }

              try {
                const res = await Wasender.httpSenderMessage({
                  to: g.groupId,
                  text: formattedMessage
                });
                if (res.success) {
                  successCount++;
                } else {
                  failCount++;
                }
              } catch (err) {
                console.error(`Group send failed to ${g.groupId}:`, err);
                failCount++;
              }
            }

            const completionText = `I have finished forwarding the message to all GOSA groups.\n\n• *Total Groups*: ${groupsList.length}\n• *Sent*: ${successCount}\n• *Failed*: ${failCount}`;
            const formattedText = formatGroupResponse(completionText);
            await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          };

          waitUntil(runGroupSend().catch(err => console.error("Error in async group send task:", err)));

          await WhatsAppSession.deleteOne({ jid: senderJid });

          const text = `Message approved. Starting the forward to all GOSA groups in the background.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Group message send approved", success: true });
        } else if (cleanMsg === 'no' || cleanMsg === 'cancel' || cleanMsg === 'n') {
          await WhatsAppSession.deleteOne({ jid: senderJid });
          const text = `Cancelled the announcement send.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Group message send cancelled", success: true });
        } else {
          const text = `I apologize, Please reply with *yes* to approve sending the message to all groups, or *no* to cancel.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Awaiting approval response", success: true });
        }
      }

      if (session.pendingAction.type === 'approve_send_broadcast_message') {
        const cleanMsg = messageText.trim().toLowerCase();
        if (cleanMsg === 'yes' || cleanMsg === 'approve' || cleanMsg === 'confirm' || cleanMsg === 'send' || cleanMsg === 'y') {
          const { messageContent } = session.pendingAction;
          
          const groupsList = await WhatsAppGroup.find({ active: true });
          const uniqueP = new Set<string>();
          for (const g of groupsList) {
            (g.participants || []).forEach((p: string) => uniqueP.add(p));
          }
          const participants = Array.from(uniqueP);

          // Trigger background broadcast loop asynchronously with 10s delay
          waitUntil(
            runBroadcast(participants, messageContent, "all groups", remoteJid)
              .catch(err => console.error("Error in async broadcast loop:", err))
          );

          await WhatsAppSession.deleteOne({ jid: senderJid });

          const text = `Message approved. Starting the direct message broadcast to the ${participants.length} unique participants in the background.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Broadcast approved", success: true });
        } else if (cleanMsg === 'no' || cleanMsg === 'cancel' || cleanMsg === 'n') {
          await WhatsAppSession.deleteOne({ jid: senderJid });
          const text = `Cancelled the broadcast send.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Broadcast cancelled", success: true });
        } else {
          const text = `I apologize. Please reply with *yes* to approve sending the broadcast to all groups' participants, or *no* to cancel.`;
          const formattedText = formatGroupResponse(text);
          await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
          return NextResponse.json({ message: "Awaiting approval response", success: true });
        }
      }

      // Use match to extract email from anywhere in the text (more conversational)
      const emailMatch = messageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const capturedEmail = emailMatch[0];
        const senderPhone = normalizeJidToPhone(senderJid);

        let senderUser = await User.findOne({ email: capturedEmail });

        if (senderUser) {
          // If user already exists with this email, link current phone number to it
          if (senderUser.phoneNumber !== senderPhone) {
            senderUser.phoneNumber = senderPhone;
            await senderUser.save();
          }
        } else {
          // If no user has this email, check if one has this phone number to update
          senderUser = await User.findOne({ phoneNumber: senderPhone });
          if (senderUser) {
            senderUser.email = capturedEmail;
            await senderUser.save();
          } else {
            // Otherwise create a completely new user
            senderUser = await User.create({
              fullName: body?.data?.messages?.pushName || "GOSA Member",
              phoneNumber: senderPhone,
              email: capturedEmail
            });
          }
        }

        // Resume flow
        const pendingAction = session.pendingAction;
        await handlePaymentFlow(senderUser, pendingAction as any, remoteJid, senderJid, rawSenderJid, rawMentionedJids);
        await WhatsAppSession.deleteOne({ jid: senderJid });

        return NextResponse.json({ message: "Email captured, checkout generated", success: true });
      } else {
        // Unrelated message typed during email request -> delete session to allow normal conversation
        await WhatsAppSession.deleteOne({ jid: senderJid });
      }
    }

    // Group mention check - allow text keywords OR native mention JID/LID matching the bot
    if (isGroup) {
      const hasKeyword =
        messageText.toLowerCase().includes('wani yaro') ||
        messageText.toLowerCase().includes('junior boy') ||
        messageText.toLowerCase().includes('yaro') ||
        messageText.toLowerCase().includes('waniyaro') ||
        messageText.toLowerCase().includes('gosa') ||
        messageText.toLowerCase().includes('bilkwas');

      let isBotMentioned = hasKeyword;
      if (!isBotMentioned && rawMentionedJids.length > 0) {
        if (
          (cachedBotJid && rawMentionedJids.includes(cachedBotJid)) ||
          (cachedBotLid && rawMentionedJids.includes(cachedBotLid)) ||
          (rawSenderJid !== senderJid && rawMentionedJids.includes(rawSenderJid))
        ) {
          isBotMentioned = true;
        }
      }

      if (!isBotMentioned) {
        return NextResponse.json({ message: "Ignore group message without mention", success: true });
      }
    }

    await connectDB();

    // Auto-resolve and save/update mentioned users on the database
    if (mentionedJids.length > 0) {
      const textMentions = messageText.match(/@[a-zA-Z0-9_\-]+/g) || [];
      const cleanTextMentions = textMentions.filter((m: string) => m.toLowerCase() !== '@all');

      for (let i = 0; i < cleanTextMentions.length; i++) {
        if (i < mentionedJids.length) {
          const mentionHandle = cleanTextMentions[i].replace('@', '').trim();
          const jid = mentionedJids[i];
          const phone = jid.split('@')[0];
          const formattedPhone = '+' + phone;

          let userRecord = await User.findOne({ phoneNumber: formattedPhone });
          if (userRecord) {
            // Update name if currently a placeholder name
            if (userRecord.fullName.startsWith('GOSA Member') || userRecord.fullName.startsWith('User')) {
              userRecord.fullName = mentionHandle;
              await userRecord.save();
              console.log(`Updated user ${formattedPhone} name to ${mentionHandle} from mention`);
            }
          } else {
            // Check if user exists with the default placeholder email to avoid duplicate key errors
            const targetEmail = `${phone}@gosa.events`;
            const existingEmailUser = await User.findOne({ email: targetEmail });
            if (existingEmailUser) {
              userRecord = existingEmailUser;
              userRecord.fullName = mentionHandle;
              userRecord.phoneNumber = formattedPhone;
              await userRecord.save();
            } else {
              await User.create({
                fullName: mentionHandle,
                phoneNumber: formattedPhone,
                email: targetEmail
              });
            }
            console.log(`Created/Linked user ${formattedPhone} with name ${mentionHandle} from mention`);
          }
        }
      }
    }

    // Group Syncing (Non-blocking background promise)
    if (isGroup) {
      waitUntil(
        WhatsAppGroup.findOne({ groupId: remoteJid }).then((groupRecord) => {
          const oneDay = 24 * 60 * 60 * 1000;
          if (!groupRecord || Date.now() - new Date(groupRecord.lastSyncedAt).getTime() > oneDay) {
            return syncGroupParticipants(remoteJid);
          }
        }).catch((err) => {
          console.error("Failed to sync group participants in background:", err);
        })
      );
    }

    // Process using wani yaro agent with conversation memory context
    const senderName = body?.data?.messages?.pushName || "User";
    const agentResponse = await Agent.httpSendMessage(messageText, remoteJid, senderName);

    if (agentResponse.intent === 'general_query') {
      const formattedText = isGroup ? formatGroupResponse(agentResponse.response) : sanitizeMessage(agentResponse.response);
      await Wasender.httpSenderMessage({
        to: remoteJid,
        text: formattedText
      });
      return NextResponse.json({ message: "General query handled", success: true });
    }

    if (agentResponse.intent === 'view_history') {
      await handleHistoryQuery(senderJid, remoteJid);
      return NextResponse.json({ message: "History query handled", success: true });
    }

    if (agentResponse.intent === 'list_groups') {
      const ADMIN_GROUP_JID = process.env.ADMIN_GROUP_JID || "120363408711532693@g.us";
      const APPROVED_ADMIN_JIDS = [ADMIN_GROUP_JID, "120363402321564330@g.us"];
      if (!APPROVED_ADMIN_JIDS.includes(remoteJid)) {
        const text = `I apologize. Listing groups is a restricted command and can only be performed from the official Admin group.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Restricted command rejected", success: true });
      }

      await connectDB();
      const groups = await WhatsAppGroup.find({ active: true });
      let replyText = "";
      if (groups.length === 0) {
        replyText = "I couldn't find any active groups in my registry.";
      } else {
        replyText = "Here are the active GOSA groups in my registry:\n\n";
        groups.forEach((g, index) => {
          replyText += `${index + 1}. *Name*: ${g.name}\n• *Participants*: ${g.participants.length} members\n\n`;
        });
      }
      const formattedText = isGroup ? formatGroupResponse(replyText) : sanitizeMessage(replyText);
      await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
      return NextResponse.json({ message: "Groups listed successfully", success: true });
    }

    if (agentResponse.intent === 'send_group_message') {
      const ADMIN_GROUP_JID = process.env.ADMIN_GROUP_JID || "120363408711532693@g.us";
      const APPROVED_ADMIN_JIDS = [ADMIN_GROUP_JID, "120363402321564330@g.us"];
      if (!APPROVED_ADMIN_JIDS.includes(remoteJid)) {
        const text = `I apologize. Sending messages to other groups is a restricted command and can only be performed from the official Admin group.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Restricted command rejected", success: true });
      }

      const { targetGroupId, messageText: messageContent } = agentResponse.data;
      if (!targetGroupId || !messageContent) {
        const text = `I apologize. I couldn't resolve the target group or message content. Could you please specify them clearly?`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Invalid command parameters", success: true });
      }

      await connectDB();

      if (targetGroupId === 'all') {
        // Upsert confirmation session on the database to prevent duplicate key errors and overwrite stale sessions
        await WhatsAppSession.findOneAndUpdate(
          { jid: senderJid },
          {
            pendingAction: {
              type: 'approve_send_group_message',
              targetGroupId: targetGroupId,
              messageContent: messageContent
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
          },
          { upsert: true, new: true }
        );

        const ackText = `I have prepared the announcement to be sent to all active GOSA groups.

📢 *Announcement Preview:*
━━━━━━━━━━━━━━━━━━
${messageContent}
━━━━━━━━━━━━━━━━━━

Please reply with *yes* (or *approve*) to confirm and send, or *no* to cancel.`;
        const formattedAck = formatGroupResponse(ackText);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedAck });
        return NextResponse.json({ message: "Group message confirmation requested", success: true });
      }

      // Check if specific target group is active in DB
      const targetGroup = await WhatsAppGroup.findOne({ groupId: targetGroupId, active: true });
      if (!targetGroup) {
        const text = `I apologize. The group JID *${targetGroupId}* was not found or is currently inactive.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Target group not found", success: true });
      }

      // Forward message asynchronously in the background
      const runGroupSend = async () => {
        const formattedMessage = formatGroupResponse(messageContent);
        const res = await Wasender.httpSenderMessage({
          to: targetGroupId,
          text: formattedMessage
        });

        let replyText = "";
        if (res.success) {
          replyText = `I have successfully forwarded the message to the group *${targetGroup.name}*.`;
        } else {
          replyText = `I apologize. I failed to forward the message to group *${targetGroup.name}*. Error: ${res.error || "unknown"}.`;
        }
        const formattedText = formatGroupResponse(replyText);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
      };

      waitUntil(runGroupSend().catch(err => console.error("Error in async group send task:", err)));

      const ackText = `I am forwarding the message to the group *${targetGroup.name}* in the background.`;
      const formattedAck = formatGroupResponse(ackText);
      await Wasender.httpSenderMessage({ to: remoteJid, text: formattedAck });
      return NextResponse.json({ message: "Group message send initiated", success: true });
    }

    if (agentResponse.intent === 'send_broadcast_message') {
      const ADMIN_GROUP_JID = process.env.ADMIN_GROUP_JID || "120363408711532693@g.us";
      const APPROVED_ADMIN_JIDS = [ADMIN_GROUP_JID, "120363402321564330@g.us"];
      if (!APPROVED_ADMIN_JIDS.includes(remoteJid)) {
        const text = `I apologize. Sending broadcast messages is a restricted command and can only be performed from the official Admin group.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Restricted command rejected", success: true });
      }

      const { targetGroupId, messageText: messageContent } = agentResponse.data;
      if (!targetGroupId || !messageContent) {
        const text = `I apologize. I couldn't resolve the target group or message content. Could you please specify them clearly?`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Invalid command parameters", success: true });
      }

      await connectDB();

      if (targetGroupId === 'all') {
        // Upsert confirmation session on the database to prevent duplicate key errors and overwrite stale sessions
        await WhatsAppSession.findOneAndUpdate(
          { jid: senderJid },
          {
            pendingAction: {
              type: 'approve_send_broadcast_message',
              targetGroupId: targetGroupId,
              messageContent: messageContent
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
          },
          { upsert: true, new: true }
        );

        const ackText = `I have prepared the direct message broadcast to unique participants of all active groups.

📢 *Broadcast Message Preview:*
━━━━━━━━━━━━━━━━━━
${messageContent}
━━━━━━━━━━━━━━━━━━

Please reply with *yes* (or *approve*) to confirm and send, or *no* to cancel.`;
        const formattedAck = formatGroupResponse(ackText);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedAck });
        return NextResponse.json({ message: "Broadcast confirmation requested", success: true });
      }

      // Check if target group is active in DB
      const targetGroup = await WhatsAppGroup.findOne({ groupId: targetGroupId, active: true });
      if (!targetGroup) {
        const text = `I apologize. The group JID *${targetGroupId}* was not found or is currently inactive.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "Target group not found", success: true });
      }

      const participants = targetGroup.participants || [];
      if (participants.length === 0) {
        const text = `I apologize. No participant JIDs were found registered in our database for the selected target.`;
        const formattedText = isGroup ? formatGroupResponse(text) : sanitizeMessage(text);
        await Wasender.httpSenderMessage({ to: remoteJid, text: formattedText });
        return NextResponse.json({ message: "No participants registered", success: true });
      }

      // Trigger background broadcast loop asynchronously with 10s delay
      waitUntil(
        runBroadcast(participants, messageContent, targetGroup.name, remoteJid)
          .catch(err => console.error("Error in async broadcast loop:", err))
      );

      const ackText = `I am starting the direct message broadcast to the ${participants.length} participants of group *${targetGroup.name}* in the background. I will notify you in this chat once it is complete.`;
      const formattedAck = formatGroupResponse(ackText);
      await Wasender.httpSenderMessage({ to: remoteJid, text: formattedAck });
      return NextResponse.json({ message: "Broadcast initiated", success: true });
    }

    // Payment intents: buy_tickets, buy_product, donation, checkout_cart
    if (
      agentResponse.intent === 'buy_tickets' ||
      agentResponse.intent === 'buy_product' ||
      agentResponse.intent === 'donation' ||
      agentResponse.intent === 'checkout_cart'
    ) {
      let resolvedItems = [];
      if (agentResponse.intent === 'checkout_cart') {
        const cartItems = agentResponse.data.items || [];
        for (const item of cartItems) {
          const itemTargets = item.targets || [];
          let itemTargetJids: string[] = [];
          if (itemTargets.length > 0) {
            itemTargetJids = await resolveMentionsToJids(itemTargets, remoteJid, mentionedJids);

            // Pad target JIDs list to match the quantity only if targets are provided
            const qty = item.quantity || 1;
            if (itemTargetJids.length < qty) {
              const padValue = itemTargetJids[itemTargetJids.length - 1];
              const shortfall = qty - itemTargetJids.length;
              for (let s = 0; s < shortfall; s++) {
                itemTargetJids.push(padValue);
              }
            }
          }

          resolvedItems.push({
            type: item.type,
            quantity: item.quantity || itemTargetJids.length || 1,
            amount: item.amount,
            targetJids: itemTargetJids
          });
        }
      }

      const rawTargets = agentResponse.data.targets || [];

      let targetJids: string[] = [];
      if (rawTargets.length > 0) {
        targetJids = await resolveMentionsToJids(rawTargets, remoteJid, mentionedJids);

        // Pad target JIDs list to match the quantity for single ticket purchases only if targets are provided
        if (agentResponse.intent === 'buy_tickets') {
          const qty = agentResponse.data.quantity || 1;
          if (targetJids.length < qty) {
            const padValue = targetJids[targetJids.length - 1];
            const shortfall = qty - targetJids.length;
            for (let s = 0; s < shortfall; s++) {
              targetJids.push(padValue);
            }
          }
        }
      }

      const senderPhone = normalizeJidToPhone(senderJid);
      const senderUser = await User.findOne({ phoneNumber: senderPhone });

      // Check if email needs to be requested
      const hasEmail = senderUser && senderUser.email && !senderUser.email.endsWith('@gosa.events');
      if (!hasEmail) {
        // Save session
        // Upsert confirmation session on the database to prevent duplicate key errors and overwrite stale sessions
        await WhatsAppSession.findOneAndUpdate(
          { jid: senderJid },
          {
            pendingAction: {
              type: agentResponse.intent,
              ticketType: agentResponse.data.ticketType,
              productType: agentResponse.data.productType,
              quantity: agentResponse.data.quantity || 1,
              amount: agentResponse.data.amount,
              targetJids: targetJids,
              items: resolvedItems // Save the items for cart session continuation
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
          },
          { upsert: true, new: true }
        );

        const responseText = agentResponse.intent === 'checkout_cart'
          ? `I see you want to make a combined checkout. However, I don't have your email address on file to process the receipt. Could you please reply with your email address?`
          : `I see you want to make a purchase. However, I don't have your email address on file to process the receipt. Could you please reply with your email address?`;
        const formattedText = isGroup ? formatGroupResponse(responseText) : sanitizeMessage(responseText);

        await Wasender.httpSenderMessage({
          to: remoteJid,
          text: formattedText
        });

        return NextResponse.json({ message: "Session created, email requested", success: true });
      }

      // Execute payment link generation
      if (agentResponse.intent === 'checkout_cart') {
        await handlePaymentFlow(senderUser, {
          type: 'checkout_cart',
          items: resolvedItems,
          targetJids: []
        } as any, remoteJid, senderJid, rawSenderJid, rawMentionedJids);
      } else {
        await handlePaymentFlow(senderUser, {
          type: agentResponse.intent,
          ticketType: agentResponse.data.ticketType,
          productType: agentResponse.data.productType,
          quantity: agentResponse.data.quantity || 1,
          amount: agentResponse.data.amount,
          targetJids: targetJids
        }, remoteJid, senderJid, rawSenderJid, rawMentionedJids);
      }

      return NextResponse.json({ message: "Checkout generated", success: true });
    }

    return NextResponse.json({ message: "Unsupported intent", success: false });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Whatsapp api hook running...",
    success: true,
  });
}