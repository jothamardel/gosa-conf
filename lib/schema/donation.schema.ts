import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDonation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  anonymous: boolean;
  onBehalfOf?: string;
  confirmed: boolean;
  receiptNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 5,
    },
    donorName: {
      type: String,
      trim: true,
    },
    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    donorPhone: {
      type: String,
      trim: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    onBehalfOf: {
      type: String,
      trim: true,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
DonationSchema.index({ userId: 1 });
// paymentReference and receiptNumber indexes are already created by unique: true in field definitions
DonationSchema.index({ confirmed: 1 });
DonationSchema.index({ anonymous: 1 });
DonationSchema.index({ amount: 1 });

// Virtual for user details
DonationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for display name (handles anonymous donations)
DonationSchema.virtual("displayName").get(function (this: IDonation) {
  if (this.anonymous) {
    return "Anonymous";
  }
  return this.onBehalfOf || this.donorName || "Unknown";
});

export const Donation =
  mongoose.models.Donation ||
  mongoose.model<IDonation>("Donation", DonationSchema);