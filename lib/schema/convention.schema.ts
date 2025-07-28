import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConventionRegistration extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  quantity: number;
  confirm: boolean;
  collected: boolean;
  createdAt: Date;
  updatedAt: Date;
  persons: [];
}

const ConventionRegistrationSchema = new Schema<IConventionRegistration>(
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
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    confirm: {
      type: Boolean,
      default: false,
    },
    collected: {
      type: Boolean,
      default: false,
    },
    persons: {
      type: [],
    },
  },
  {
    timestamps: true,
  },
);

ConventionRegistrationSchema.index({ userId: 1, paymentReference: 1 });

export const ConventionRegistration =
  mongoose.models.ConventionRegistration ||
  mongoose.model<IConventionRegistration>(
    "ConventionRegistration",
    ConventionRegistrationSchema,
  );
