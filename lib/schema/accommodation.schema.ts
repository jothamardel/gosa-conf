import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAccommodationGuest {
  name: string;
  email?: string;
  phone?: string;
}

export interface IAccommodation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  accommodationType: 'standard' | 'premium' | 'luxury';
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  guestDetails: IAccommodationGuest[];
  specialRequests?: string;
  totalAmount: number;
  confirmed: boolean;
  confirmationCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccommodationGuestSchema = new Schema<IAccommodationGuest>({
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

const AccommodationSchema = new Schema<IAccommodation>(
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
    accommodationType: {
      type: String,
      required: true,
      enum: ['standard', 'premium', 'luxury'],
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: IAccommodation, checkOutDate: Date) {
          return checkOutDate > this.checkInDate;
        },
        message: "Check-out date must be after check-in date",
      },
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    guestDetails: {
      type: [AccommodationGuestSchema],
      required: true,
      validate: {
        validator: function (this: IAccommodation, guestDetails: IAccommodationGuest[]) {
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
    confirmationCode: {
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
AccommodationSchema.index({ userId: 1 });
// paymentReference and confirmationCode indexes are already created by unique: true in field definitions
AccommodationSchema.index({ confirmed: 1 });
AccommodationSchema.index({ accommodationType: 1 });
AccommodationSchema.index({ checkInDate: 1, checkOutDate: 1 });

// Virtual for user details
AccommodationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for duration calculation
AccommodationSchema.virtual("duration").get(function (this: IAccommodation) {
  const diffTime = Math.abs(this.checkOutDate.getTime() - this.checkInDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export const Accommodation =
  mongoose.models.Accommodation ||
  mongoose.model<IAccommodation>("Accommodation", AccommodationSchema);