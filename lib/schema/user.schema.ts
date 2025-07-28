import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  updatedAt: Date;
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
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.index({ phoneNumber: 1 });

// Virtual populate for convention registrations
UserSchema.virtual("conventionRegistrations", {
  ref: "ConventionRegistration",
  localField: "_id",
  foreignField: "userId",
});

// // Virtual populate for dinner reservations
// UserSchema.virtual("dinnerReservations", {
//   ref: "DinnerReservation",
//   localField: "_id",
//   foreignField: "userId",
// });

// // Virtual populate for accommodations
// UserSchema.virtual("accommodations", {
//   ref: "Accommodation",
//   localField: "_id",
//   foreignField: "userId",
// });

// // Virtual populate for convention brochures
// UserSchema.virtual("conventionBrochures", {
//   ref: "ConventionBrochure",
//   localField: "_id",
//   foreignField: "userId",
// });

// // Virtual populate for goodwill messages
// UserSchema.virtual("goodwillMessages", {
//   ref: "GoodwillMessage",
//   localField: "_id",
//   foreignField: "userId",
// });

// // Virtual populate for donations
// UserSchema.virtual("donations", {
//   ref: "Donation",
//   localField: "_id",
//   foreignField: "userId",
// });

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
