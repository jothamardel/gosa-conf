import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Try local database first
const localURI = "mongodb://localhost:27017/gosa";

async function run() {
  console.log(`Connecting to database: ${localURI}`);
  await mongoose.connect(localURI);
  console.log("Connected to MongoDB");

  const { Transaction } = await import("../lib/schema/transaction.schema");
  const { ConventionRegistration } = await import("../lib/schema/convention.schema");
  const { DinnerReservation } = await import("../lib/schema/dinner.schema");
  const { ConventionBrochure } = await import("../lib/schema/brochure.schema");

  const ref = "cart_1787256997654_2348035994898";
  console.log(`Inspecting reference: ${ref}`);

  const tx = await Transaction.findOne({ paymentReference: ref }).populate("userId");
  console.log("Transaction:", JSON.stringify(tx, null, 2));

  const conventions = await ConventionRegistration.find({ paymentReference: { $regex: `^${ref}` } }).populate("userId");
  console.log("Convention Registrations found:", conventions.length);
  for (const c of conventions) {
    console.log(`  - Ref: ${c.paymentReference}, Confirm: ${c.confirm}, Status: ${c.status}`);
  }

  const dinners = await DinnerReservation.find({ paymentReference: { $regex: `^${ref}` } }).populate("userId");
  console.log("Dinner Reservations found:", dinners.length);
  for (const d of dinners) {
    console.log(`  - Ref: ${d.paymentReference}, Confirmed: ${d.confirmed}, Status: ${d.status}`);
  }

  const brochures = await ConventionBrochure.find({ paymentReference: { $regex: `^${ref}` } }).populate("userId");
  console.log("Brochures found:", brochures.length);
  for (const b of brochures) {
    console.log(`  - Ref: ${b.paymentReference}, Confirmed: ${b.confirmed}, Status: ${b.status}`);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

run().catch(console.error);
