import { NextRequest } from "next/server";
import connectDB from "../mongodb";
import { IUser, User } from "../schema";
import { Types } from "mongoose";

export class UserUtils {
  static async createUser(userData: {
    fullName: string;
    email: string;
    phoneNumber: string;
  }): Promise<IUser> {
    await connectDB();
    return await User.create(userData);
  }

  static async findUserByEmail(email: string): Promise<IUser | null> {
    await connectDB();
    return await User.findOne({ email: email.toLowerCase() });
  }

  static async findUserByPhone(phoneNumber: string): Promise<IUser | null> {
    await connectDB();
    return await User.findOne({ phoneNumber });
  }

  static async findOrCreateUser(userData: {
    fullName?: string;
    email: string;
    phoneNumber: string;
  }): Promise<IUser> {
    await connectDB();

    let user = await User.findOne({
      $or: [
        { email: userData.email.toLowerCase() },
        { phoneNumber: userData.phoneNumber },
      ],
    });

    if (!user) {
      const fullName = userData.fullName || userData.email.split("@")[0];
      user = await User.create({
        fullName,
        email: userData.email.toLowerCase(),
        phoneNumber: userData.phoneNumber,
      });
    }

    return user;
  }

  static async getAllUser(req: NextRequest): Promise<{
    users: IUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  } | null> {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const populate = searchParams.get("populate"); // e.g., 'all', 'convention', 'dinner'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let query = User.find({}).skip(skip).limit(limit);

    // Different population options
    switch (populate) {
      case "all":
        query = query.populate("conventionRegistrations");
        // .populate("dinnerReservations")
        // .populate("accommodations")
        // .populate("conventionBrochures")
        // .populate("goodwillMessages")
        // .populate("donations");
        break;

      case "convention":
        query = query.populate("conventionRegistrations");
        break;

      case "dinner":
        query = query.populate("dinnerReservations");
        break;

      case "accommodation":
        query = query.populate("accommodations");
        break;

      case "brochure":
        query = query.populate("conventionBrochures");
        break;

      case "goodwill":
        query = query.populate("goodwillMessages");
        break;

      case "donation":
        query = query.populate("donations");
        break;

      default:
        // No population, just return users
        break;
    }

    const users = await query.exec();
    const total = await User.countDocuments();

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
