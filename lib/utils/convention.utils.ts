import connectDB from "../mongodb";
import { ConventionRegistration, IUser, User } from "../schema";
import { Types } from "mongoose";
import { PaymentRecord } from "../types";

export class ConventionUtils {
  static async createRegistration(
    data: PaymentRecord & { userId: string | Types.ObjectId },
  ) {
    try {
      await connectDB();
      return await ConventionRegistration.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
      });
    } catch (err) {
      throw err;
    }
  }

  static async confirmRegistration(paymentReference: string) {
    try {
      await connectDB();
      return await ConventionRegistration.findOneAndUpdate(
        { paymentReference },
        { confirm: true },
        { new: true },
      ).populate("userId");
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  static async findAndConfirmMany(paymentReference: string) {
    try {
      await connectDB();
      return await ConventionRegistration.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" },
        },
        { confirm: true },
      );
    } catch (err) {
      throw err;
    }
  }

  static async findMany(paymentReference: string) {
    try {
      await connectDB();
      return await ConventionRegistration.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" },
      });
    } catch (err) {
      throw err;
    }
  }

  static async confirmCollection(paymentReference: string) {
    await connectDB();
    return await ConventionRegistration.findOneAndUpdate(
      { paymentReference },
      { collected: true },
      { new: true },
    ).populate("userId");
  }

  static async getUserRegistrations(userId: string | Types.ObjectId) {
    await connectDB();
    return await ConventionRegistration.find({
      userId: new Types.ObjectId(userId),
    }).populate("userId");
  }
}
