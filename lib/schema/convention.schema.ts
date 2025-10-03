import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConventionRegistration extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  quantity: number;
  confirm: boolean;
  collected: boolean;
  checkIn: boolean;
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  checkInHistory: Array<{
    action: 'check-in' | 'check-out';
    timestamp: Date;
    officialId: string;
    officialName: string;
  }>;
  status: string;
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
    checkIn: {
      type: Boolean,
      default: false,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
    },
    checkedOutAt: {
      type: Date,
    },
    checkInHistory: [{
      action: {
        type: String,
        enum: ['check-in', 'check-out'],
        required: true,
      },
      timestamp: {
        type: Date,
        required: true,
      },
      officialId: {
        type: String,
        required: true,
      },
      officialName: {
        type: String,
        required: true,
      },
    }],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    persons: {
      type: [],
    },
  },
  {
    timestamps: true,
  },
);

ConventionRegistrationSchema.index({ userId: 1 });
// paymentReference index is already created by unique: true in field definition

export const ConventionRegistration =
  mongoose.models.ConventionRegistration ||
  mongoose.model<IConventionRegistration>(
    "ConventionRegistration",
    ConventionRegistrationSchema,
  );
