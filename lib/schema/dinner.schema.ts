import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGuestDetail {
  name: string;
  email?: string;
  phone?: string;
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
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
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
    sparse: true,    // Only index non-null values
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
DinnerReservationSchema.index({ userId: 1 });
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