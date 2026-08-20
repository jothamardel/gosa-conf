import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "";
// Replace the database name in the URI to be 'gosa' instead of 'gosa-demo'
const gosaUri = uri.includes("gosa-demo") ? uri.replace("gosa-demo", "gosa") : uri;

function sanitizeMessage(text: string): string {
  let cleanText = text.replace(/\*\*/g, "*");
  cleanText = cleanText.replace(/([0-9\-]+)@(s\.whatsapp\.net|g\.us|lid)/g, (match, phone) => {
    return `+${phone}`;
  });
  cleanText = cleanText.replace(/[0-9a-fA-F]{24}/g, "");
  return cleanText;
}

async function run() {
  console.log("Connecting to:", gosaUri.replace(/:[^:]+@/, ":****@"));
  
  await mongoose.connect(gosaUri, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  });
  console.log("Connected successfully to Atlas gosa DB!");

  const { Wasender } = await import("../lib/wasender-api");
  const { User } = await import("../lib/schema/user.schema");
  const { Transaction } = await import("../lib/schema/transaction.schema");

  const ref = "cart_1787256997654_2348035994898";
  
  const tx = await Transaction.findOne({ paymentReference: ref }).populate("userId");
  if (!tx) {
    console.error("Transaction not found in database!");
    return;
  }

  console.log("Found Transaction:", JSON.stringify(tx, null, 2));

  const cartSummary = "• 1x GOSA Convention\n• 1x GOSA Dinner\n• 1x GOSA Brochure";
  const userName = "Josiah Mutihir";
  const userPhone = "2348035994898";

  const textMessage = `🎉 *GOSA Combined Purchase Confirmation*
For Light and Truth

Dear ${userName},

Your combined purchase/registration has been confirmed! ✅

📦 *Confirmed Items:*
${cartSummary.trim()}

💳 *Payment Details:*
• Total Amount: ₦${tx.amount.toLocaleString()}
• Reference: ${tx.paymentReference}
• Status: Confirmed ✅

Thank you for supporting the GOSA community, sir!`;

  const formattedText = sanitizeMessage(textMessage);

  // Send to both phone JID and LID to make absolutely sure they receive it
  const targets = ["2348035994898@s.whatsapp.net", "3234244632647@lid"];

  for (const target of targets) {
    console.log(`Sending WhatsApp message to target: ${target}`);
    try {
      const res = await Wasender.httpSenderMessage({
        to: target,
        text: formattedText,
      });
      console.log(`Result for ${target}:`, res);
    } catch (err) {
      console.error(`Failed to send to ${target}:`, err);
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch((err) => {
  console.error("Error running script:", err);
});
