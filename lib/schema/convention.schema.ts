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
  checkInCode?: string;
  checkInHistory: Array<{
    action: 'check-in' | 'check-out';
    timestamp: Date;
    officialId: string;
    officialName: string;
    checkInCode?: string;
  }>;
  status: string;
  upgradedTo?: {
    ticketType: string;
    ticketId: Types.ObjectId;
    upgradedAt: Date;
    officialName: string;
    differencePaid: number;
    paymentMethod: string;
    notes?: string;
  };
  transferredFrom?: Types.ObjectId;
  transferredAt?: Date;
  transferReason?: 'gift' | 'on_behalf' | 'transfer';
  personalNote?: string;
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
    checkInCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
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
      checkInCode: {
        type: String,
      },
    }],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'upgraded'],
      default: 'pending',
    },
    upgradedTo: {
      ticketType: { type: String },
      ticketId: { type: Schema.Types.ObjectId },
      upgradedAt: { type: Date },
      officialName: { type: String },
      differencePaid: { type: Number },
      paymentMethod: { type: String },
      notes: { type: String },
    },
    transferredFrom: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredAt: {
      type: Date,
    },
    transferReason: {
      type: String,
      enum: ['gift', 'on_behalf', 'transfer'],
    },
    personalNote: {
      type: String,
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
ConventionRegistrationSchema.index({ checkedIn: 1 });
ConventionRegistrationSchema.index({ status: 1 });
ConventionRegistrationSchema.index({ checkInCode: 1 });
ConventionRegistrationSchema.index({ createdAt: -1 });
ConventionRegistrationSchema.index({ createdAt: -1, checkedIn: 1 });
// paymentReference index is already created by unique: true in field definition

export const ConventionRegistration =
  mongoose.models.ConventionRegistration ||
  mongoose.model<IConventionRegistration>(
    "ConventionRegistration",
    ConventionRegistrationSchema,
  );
