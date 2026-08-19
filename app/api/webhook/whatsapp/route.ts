import { Wasender } from "@/lib/wasender-api";
import { NextRequest, NextResponse } from "next/server";
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

function calculatePaystackTotal(baseAmount: number): number {
  // Paystack fee: 1.5% of amount + 100 Naira
  // Capped at 2,000 Naira
  const fee = (baseAmount * 0.015) + 100;
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
• *Theme:* _Together We Thrive: Fostering Growth and Community Spirit_
• *Date:* 31st October, 2026
• *Venue:* Crispan

📢 *Ad:* Sponsor a student project! Contact us at *+234 803 123 4567*`;
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

async function syncGroupParticipants(groupId: string, name: string) {
  try {
    const participants = await Wasender.getGroupParticipants(groupId);
    if (participants && participants.length > 0) {
      await WhatsAppGroup.findOneAndUpdate(
        { groupId },
        {
          name: name || "GOSA Group",
          participants,
          lastSyncedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`Synced ${participants.length} participants for group ${groupId}`);
    }
  } catch (error) {
    console.error(`Error syncing group participants for ${groupId}:`, error);
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
  },
  remoteJid: string,
  senderJid: string
) {
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
    throw new Error("Invalid product, donation, or ticket type requested, sir.");
  }

  const quantity = (action.type === 'buy_tickets' || action.type === 'donation') ? action.targetJids.length : (action.quantity || 1);
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
    throw new Error("Failed to initialize payment with Paystack, sir.");
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
    metadata: {
      quantity,
      targets: action.targetJids,
      baseTotalAmount,
      groupJid: isGroup ? remoteJid : null
    }
  });

  if (action.type === 'buy_tickets') {
    for (let i = 0; i < action.targetJids.length; i++) {
      const targetJid = action.targetJids[i];
      const targetPhone = targetJid.split('@')[0];

      let targetUser = await User.findOne({
        phoneNumber: { $regex: targetPhone }
      });
      if (!targetUser) {
        const targetEmail = `${targetPhone}@gosa.events`;
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
  } else if (action.type === 'donation') {
    for (let i = 0; i < action.targetJids.length; i++) {
      const targetJid = action.targetJids[i];
      const targetPhone = targetJid.split('@')[0];

      let targetUser = await User.findOne({
        phoneNumber: { $regex: targetPhone }
      });
      if (!targetUser) {
        const targetEmail = `${targetPhone}@gosa.events`;
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

👉 Tap the link below to make payment, sir:
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
    const defaultResponse = "I searched our GOSA records, sir, but I couldn't find your profile, sir. Therefore, you don't have any transaction history yet, sir.";
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

  let text = `Here is your transaction summary, sir:\n\n`;
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
    text = "I see your profile, sir, but you have not made any purchases or registrations yet, sir.";
  } else {
    text += `Always at your service, sir!`;
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

    // Prevent duplicate processing by only listening to the primary 'messages.received' event
    if (body?.event && body.event !== 'messages.received') {
      return NextResponse.json({ message: `Ignoring event ${body.event} to prevent duplicate processing`, success: true });
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
      WhatsAppGroup.findOne({ groupId: remoteJid }).then((groupRecord) => {
        const oneDay = 24 * 60 * 60 * 1000;
        if (!groupRecord || Date.now() - new Date(groupRecord.lastSyncedAt).getTime() > oneDay) {
          syncGroupParticipants(remoteJid, body?.data?.messages?.pushName || "GOSA Group").catch((err) => {
            console.error("Failed to sync group participants in background:", err);
          });
        }
      }).catch((err) => {
        console.error("Failed to query group in background:", err);
      });
    }

    // Active conversational session (capturing email)
    const session = await WhatsAppSession.findOne({ jid: senderJid });
    if (session) {
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
        await handlePaymentFlow(senderUser, pendingAction as any, remoteJid, senderJid);
        await WhatsAppSession.deleteOne({ jid: senderJid });

        return NextResponse.json({ message: "Email captured, checkout generated", success: true });
      } else {
        // Unrelated message typed during email request -> delete session to allow normal conversation
        await WhatsAppSession.deleteOne({ jid: senderJid });
      }
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

    // Payment intents: buy_tickets, buy_product, donation
    if (
      agentResponse.intent === 'buy_tickets' || 
      agentResponse.intent === 'buy_product' ||
      agentResponse.intent === 'donation'
    ) {
      const rawTargets = agentResponse.data.targets || [];
      
      let targetJids: string[] = [];
      if (rawTargets.length > 0) {
        targetJids = await resolveMentionsToJids(rawTargets, remoteJid, mentionedJids);
      }
      
      // Default to sender if no targets resolved
      if (targetJids.length === 0) {
        targetJids = [senderJid];
      }

      const senderPhone = normalizeJidToPhone(senderJid);
      const senderUser = await User.findOne({ phoneNumber: senderPhone });

      // Check if email needs to be requested
      const hasEmail = senderUser && senderUser.email && !senderUser.email.endsWith('@gosa.events');
      if (!hasEmail) {
        // Save session
        await WhatsAppSession.create({
          jid: senderJid,
          pendingAction: {
            type: agentResponse.intent,
            ticketType: agentResponse.data.ticketType,
            productType: agentResponse.data.productType,
            quantity: agentResponse.data.quantity || 1,
            amount: agentResponse.data.amount,
            targetJids: targetJids
          },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
        });

        const responseText = `Yes sir! I see you want to make a purchase, sir. However, I don't have your email address on file to process the receipt. Could you please reply with your email address, sir?`;
        const formattedText = isGroup ? formatGroupResponse(responseText) : sanitizeMessage(responseText);

        await Wasender.httpSenderMessage({
          to: remoteJid,
          text: formattedText
        });

        return NextResponse.json({ message: "Session created, email requested", success: true });
      }

      // Execute payment link generation
      await handlePaymentFlow(senderUser, {
        type: agentResponse.intent,
        ticketType: agentResponse.data.ticketType,
        productType: agentResponse.data.productType,
        quantity: agentResponse.data.quantity || 1,
        amount: agentResponse.data.amount,
        targetJids: targetJids
      }, remoteJid, senderJid);

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