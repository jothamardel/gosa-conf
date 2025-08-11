import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGoodwillMessage extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  message: string;
  donationAmount: number;
  attributionName?: string;
  anonymous: boolean;
  approved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoodwillMessageSchema = new Schema<IGoodwillMessage>(
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
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    donationAmount: {
      type: Number,
      required: true,
      min: 10,
    },
    attributionName: {
      type: String,
      trim: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    confirmed: {
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
GoodwillMessageSchema.index({ userId: 1 });
// paymentReference index is already created by unique: true in field definition
GoodwillMessageSchema.index({ confirmed: 1 });
GoodwillMessageSchema.index({ approved: 1 });
GoodwillMessageSchema.index({ anonymous: 1 });
GoodwillMessageSchema.index({ approvedBy: 1 });

// Virtual for user details
GoodwillMessageSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for approver details
GoodwillMessageSchema.virtual("approver", {
  ref: "User",
  localField: "approvedBy",
  foreignField: "_id",
  justOne: true,
});

// Pre-save middleware to set approvedAt when approved
GoodwillMessageSchema.pre('save', function (this: IGoodwillMessage, next) {
  if (this.isModified('approved') && this.approved && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

export const GoodwillMessage =
  mongoose.models.GoodwillMessage ||
  mongoose.model<IGoodwillMessage>("GoodwillMessage", GoodwillMessageSchema);