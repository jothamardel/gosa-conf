import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGuestDetail {
  name: string;
  email: string;        // Now required
  phone: string;        // Now required
  dietaryRequirements?: string;
}

export interface IQRCode {
  guestName: string;
  qrCode?: string; // Make optional to avoid null issues
  used: boolean;
}

export interface IDinnerReservation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  numberOfGuests: number;
  guestDetails: IGuestDetail[];
  specialRequests?: string;
  totalAmount: number;
  confirmed: boolean;
  qrCodes: IQRCode[];
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
  // Enhanced fields for multiple guest support
  primaryReservationId?: Types.ObjectId;  // Links to main reservation
  isPrimaryContact: boolean;              // Identifies the primary contact
  guestIndex?: number;                    // Index of this guest in the group
  transferredFrom?: Types.ObjectId;
  transferredAt?: Date;
  transferReason?: 'gift' | 'on_behalf' | 'transfer';
  personalNote?: string;
  upgradedFrom?: {
    ticketType: string;
    ticketId: Types.ObjectId;
    originalReference: string;
    upgradedAt: Date;
    officialName: string;
    differencePaid: number;
    paymentMethod: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GuestDetailSchema = new Schema<IGuestDetail>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,  // Now required
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,  // Now required
    trim: true,
  },
  dietaryRequirements: {
    type: String,
    trim: true,
  },
}, { _id: false });

const QRCodeSchema = new Schema<IQRCode>({
  guestName: {
    type: String,
    required: true,
    trim: true,
  },
  qrCode: {
    type: String,
    required: false, // Make optional
    // Remove sparse: true to avoid duplicate index with explicit index below
  },
  used: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const DinnerReservationSchema = new Schema<IDinnerReservation>(
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
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    guestDetails: {
      type: [GuestDetailSchema],
      required: true,
      validate: {
        validator: function (this: IDinnerReservation, guestDetails: IGuestDetail[]) {
          return guestDetails.length === this.numberOfGuests;
        },
        message: "Number of guest details must match numberOfGuests",
      },
    },
    specialRequests: {
      type: String,
      trim: true,
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
    qrCodes: {
      type: [QRCodeSchema],
      default: [],
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
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    // Enhanced fields for multiple guest support
    primaryReservationId: {
      type: Schema.Types.ObjectId,
      ref: 'DinnerReservation',
      required: false,
    },
    isPrimaryContact: {
      type: Boolean,
      default: false,
    },
    guestIndex: {
      type: Number,
      required: false,
    },
    transferredFrom: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    upgradedFrom: {
      ticketType: { type: String },
      ticketId: { type: Schema.Types.ObjectId },
      originalReference: { type: String },
      upgradedAt: { type: Date },
      officialName: { type: String },
      differencePaid: { type: Number },
      paymentMethod: { type: String },
      notes: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
DinnerReservationSchema.index({ userId: 1 });
DinnerReservationSchema.index({ checkedIn: 1 });
DinnerReservationSchema.index({ status: 1 });
DinnerReservationSchema.index({ checkInCode: 1 });
DinnerReservationSchema.index({ createdAt: -1 });
DinnerReservationSchema.index({ createdAt: -1, checkedIn: 1 });
// paymentReference index is already created by unique: true in field definition
DinnerReservationSchema.index({ confirmed: 1 });
// Create sparse unique index for qrCodes.qrCode to allow multiple null/undefined values
DinnerReservationSchema.index({ "qrCodes.qrCode": 1 }, {
  unique: true,
  sparse: true,
  partialFilterExpression: { "qrCodes.qrCode": { $exists: true, $ne: null } }
});

// Virtual for user details
DinnerReservationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const DinnerReservation =
  mongoose.models.DinnerReservation ||
  mongoose.model<IDinnerReservation>("DinnerReservation", DinnerReservationSchema);