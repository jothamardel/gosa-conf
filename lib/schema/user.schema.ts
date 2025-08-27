import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  updatedAt: Date;
  house: string;
  year: string;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    house: {
      type: String,
    },
    year: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// phoneNumber index is already created by unique: true in field definition

// Virtual populate for convention registrations
UserSchema.virtual("conventionRegistrations", {
  ref: "ConventionRegistration",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for dinner reservations
UserSchema.virtual("dinnerReservations", {
  ref: "DinnerReservation",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for accommodations
UserSchema.virtual("accommodations", {
  ref: "Accommodation",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for convention brochures
UserSchema.virtual("conventionBrochures", {
  ref: "ConventionBrochure",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for goodwill messages
UserSchema.virtual("goodwillMessages", {
  ref: "GoodwillMessage",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for donations
UserSchema.virtual("donations", {
  ref: "Donation",
  localField: "_id",
  foreignField: "userId",
});

// Virtual populate for attendee badge
UserSchema.virtual("attendeeBadge", {
  ref: "AttendeeBadge",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
