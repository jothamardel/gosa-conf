import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBrochureRecipient {
  name: string;
  email?: string;
  phone?: string;
}

export interface IConventionBrochure extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  quantity: number;
  brochureType: 'digital' | 'physical';
  recipientDetails: IBrochureRecipient[];
  totalAmount: number;
  confirmed: boolean;
  qrCode: string;
  collected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrochureRecipientSchema = new Schema<IBrochureRecipient>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
}, { _id: false });

const ConventionBrochureSchema = new Schema<IConventionBrochure>(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    brochureType: {
      type: String,
      required: true,
      enum: ['digital', 'physical'],
    },
    recipientDetails: {
      type: [BrochureRecipientSchema],
      required: true,
      validate: {
        validator: function (this: IConventionBrochure, recipientDetails: IBrochureRecipient[]) {
          return recipientDetails.length >= 1;
        },
        message: "At least one recipient detail is required",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
    },
    collected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
ConventionBrochureSchema.index({ userId: 1 });
// paymentReference and qrCode indexes are already created by unique: true in field definitions
ConventionBrochureSchema.index({ confirmed: 1 });
ConventionBrochureSchema.index({ brochureType: 1 });
ConventionBrochureSchema.index({ collected: 1 });

// Virtual for user details
ConventionBrochureSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const ConventionBrochure =
  mongoose.models.ConventionBrochure ||
  mongoose.model<IConventionBrochure>("ConventionBrochure", ConventionBrochureSchema);