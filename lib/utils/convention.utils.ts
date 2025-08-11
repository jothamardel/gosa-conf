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

  /**
   * Find convention registrations by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<any[] | null> {
    try {
      await connectDB();

      // Search for registrations where paymentReference starts with the pattern
      const { ConventionRegistration } = await import('../schema/convention.schema');
      const registrations = await ConventionRegistration.find({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return registrations.length > 0 ? registrations : null;
    } catch (error) {
      console.error(`Error finding convention registrations by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm convention registrations by reference pattern (for webhook processing)
   */
  static async confirmByReferencePattern(referencePattern: string) {
    try {
      await connectDB();

      const { ConventionRegistration } = await import('../schema/convention.schema');
      const result = await ConventionRegistration.updateMany(
        { paymentReference: { $regex: `^${referencePattern}` } },
        { $set: { confirm: true } }
      );

      return result;
    } catch (error) {
      console.error(`Error confirming convention registrations by pattern ${referencePattern}:`, error);
      throw error;
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
