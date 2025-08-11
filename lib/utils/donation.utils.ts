import connectDB from "../mongodb";
import { Donation, IDonation } from "../schema/donation.schema";
import { Types } from "mongoose";

// Type assertion to bypass Mongoose typing issues
const DonationModel = Donation as any;

export interface DonationData {
  userId: string | Types.ObjectId;
  paymentReference: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  anonymous: boolean;
  onBehalfOf?: string;
}

export class DonationUtils {
  // Minimum donation amount
  static readonly MIN_DONATION_AMOUNT = 5;

  /**
   * Create a new donation
   */
  static async createDonation(data: DonationData): Promise<IDonation> {
    try {
      await connectDB();

      // Validate donation amount
      const amountValidation = this.validateDonationAmount(data.amount);
      if (!amountValidation.valid) {
        throw new Error(amountValidation.message);
      }

      // Validate donor information if not anonymous
      if (!data.anonymous) {
        const donorValidation = this.validateDonorInfo(data);
        if (!donorValidation.valid) {
          throw new Error(donorValidation.message);
        }
      }

      // Generate receipt number
      const receiptNumber = this.generateReceiptNumber();

      // Create donation
      const donation = await DonationModel.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        confirmed: false,
        receiptNumber
      });

      return donation;
    } catch (error) {
      throw new Error(`Failed to create donation: ${error}`);
    }
  }

  /**
   * Find a donation by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<any | null> {
    try {
      await connectDB();

      // Search for donation where paymentReference starts with the pattern
      const { Donation } = await import('../schema/donation.schema');
      const donation = await Donation.findOne({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return donation;
    } catch (error) {
      console.error(`Error finding donation by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm a donation (after payment)
   */
  static async confirmDonation(paymentReference: string): Promise<IDonation> {
    try {
      await connectDB();

      const donation = await DonationModel.findOneAndUpdate(
        { paymentReference },
        { confirmed: true },
        { new: true }
      ).populate("userId");

      if (!donation) {
        throw new Error("Donation not found");
      }

      return donation;
    } catch (error) {
      throw new Error(`Failed to confirm donation: ${error}`);
    }
  }

  /**
   * Generate a unique receipt number
   */
  static generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DON-${year}-${timestamp}-${random}`;
  }
  /**
    * Get all donations for a user
    */
  static async getUserDonations(userId: string | Types.ObjectId): Promise<IDonation[]> {
    try {
      await connectDB();
      return await DonationModel.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user donations: ${error}`);
    }
  }

  /**
   * Find donation by payment reference
   */
  static async findByPaymentReference(paymentReference: string): Promise<IDonation | null> {
    try {
      await connectDB();
      return await DonationModel.findOne({ paymentReference }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find donation: ${error}`);
    }
  }

  /**
   * Find donation by receipt number
   */
  static async findByReceiptNumber(receiptNumber: string): Promise<IDonation | null> {
    try {
      await connectDB();
      return await DonationModel.findOne({ receiptNumber }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find donation by receipt number: ${error}`);
    }
  }

  /**
   * Find multiple donations by payment reference pattern
   */
  static async findMany(paymentReference: string): Promise<IDonation[]> {
    try {
      await connectDB();
      return await DonationModel.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
      }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find donations: ${error}`);
    }
  }

  /**
   * Confirm multiple donations by payment reference pattern
   */
  static async findAndConfirmMany(paymentReference: string): Promise<any> {
    try {
      await connectDB();

      return await DonationModel.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
        },
        { confirmed: true }
      );
    } catch (error) {
      throw new Error(`Failed to confirm multiple donations: ${error}`);
    }
  }

  /**
   * Get all donations with pagination and filtering
   */
  static async getAllDonations(options: {
    page?: number;
    limit?: number;
    confirmed?: boolean;
    anonymous?: boolean;
    minAmount?: number;
    maxAmount?: number;
  } = {}): Promise<{
    donations: IDonation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;
      const query: any = {};

      // Apply filters
      if (options.confirmed !== undefined) {
        query.confirmed = options.confirmed;
      }
      if (options.anonymous !== undefined) {
        query.anonymous = options.anonymous;
      }
      if (options.minAmount !== undefined || options.maxAmount !== undefined) {
        query.amount = {};
        if (options.minAmount !== undefined) {
          query.amount.$gte = options.minAmount;
        }
        if (options.maxAmount !== undefined) {
          query.amount.$lte = options.maxAmount;
        }
      }

      const donations = await DonationModel.find(query)
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await DonationModel.countDocuments(query);

      return {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get donations: ${error}`);
    }
  }

  /**
   * Get public donations for display (non-anonymous)
   */
  static async getPublicDonations(limit: number = 50): Promise<IDonation[]> {
    try {
      await connectDB();
      return await DonationModel.find({
        confirmed: true,
        anonymous: false
      })
        .populate("userId")
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      throw new Error(`Failed to get public donations: ${error}`);
    }
  }

  /**
   * Validate donation amount
   */
  static validateDonationAmount(amount: number): {
    valid: boolean;
    message?: string;
  } {
    if (amount < this.MIN_DONATION_AMOUNT) {
      return {
        valid: false,
        message: `Minimum donation amount is $${this.MIN_DONATION_AMOUNT}`
      };
    }

    if (amount > 50000) {
      return {
        valid: false,
        message: "Maximum donation amount is $50,000"
      };
    }

    // Check if amount has more than 2 decimal places
    if (Math.round(amount * 100) !== amount * 100) {
      return {
        valid: false,
        message: "Donation amount cannot have more than 2 decimal places"
      };
    }

    return { valid: true };
  }

  /**
   * Validate donor information
   */
  static validateDonorInfo(data: Partial<DonationData>): {
    valid: boolean;
    message?: string;
  } {
    // If anonymous, no validation needed
    if (data.anonymous) {
      return { valid: true };
    }

    // At least donor name or onBehalfOf should be provided
    if (!data.donorName && !data.onBehalfOf) {
      return {
        valid: false,
        message: "Donor name or 'on behalf of' information is required for non-anonymous donations"
      };
    }

    // Validate donor name if provided
    if (data.donorName) {
      if (data.donorName.trim().length === 0) {
        return {
          valid: false,
          message: "Donor name cannot be empty"
        };
      }

      if (data.donorName.trim().length > 100) {
        return {
          valid: false,
          message: "Donor name cannot exceed 100 characters"
        };
      }

      // Check for valid characters
      const validNameRegex = /^[a-zA-Z0-9\s\.\-\']+$/;
      if (!validNameRegex.test(data.donorName.trim())) {
        return {
          valid: false,
          message: "Donor name contains invalid characters"
        };
      }
    }

    // Validate email if provided
    if (data.donorEmail && data.donorEmail.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.donorEmail)) {
        return {
          valid: false,
          message: "Invalid email format"
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get donation statistics
   */
  static async getDonationStatistics(): Promise<{
    total: number;
    confirmed: number;
    anonymous: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    try {
      await connectDB();

      const [
        total,
        confirmed,
        anonymous,
        amountStats
      ] = await Promise.all([
        DonationModel.countDocuments(),
        DonationModel.countDocuments({ confirmed: true }),
        DonationModel.countDocuments({ anonymous: true }),
        DonationModel.aggregate([
          { $match: { confirmed: true } },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
              average: { $avg: "$amount" }
            }
          }
        ])
      ]);

      const totalAmount = amountStats.length > 0 ? amountStats[0].total : 0;
      const averageAmount = amountStats.length > 0 ? amountStats[0].average : 0;

      return {
        total,
        confirmed,
        anonymous,
        totalAmount,
        averageAmount: Math.round(averageAmount * 100) / 100
      };
    } catch (error) {
      throw new Error(`Failed to get donation statistics: ${error}`);
    }
  }

  /**
   * Search donations by donor name, email, or receipt number
   */
  static async searchDonations(searchTerm: string, options: {
    page?: number;
    limit?: number;
    confirmed?: boolean;
  } = {}): Promise<{
    donations: IDonation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {
        $or: [
          { donorName: { $regex: searchTerm, $options: 'i' } },
          { donorEmail: { $regex: searchTerm, $options: 'i' } },
          { receiptNumber: { $regex: searchTerm, $options: 'i' } },
          { onBehalfOf: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (options.confirmed !== undefined) {
        query.confirmed = options.confirmed;
      }

      const donations = await DonationModel.find(query)
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await DonationModel.countDocuments(query);

      return {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to search donations: ${error}`);
    }
  }

  /**
   * Get donations by date range
   */
  static async getDonationsByDateRange(
    startDate: Date,
    endDate: Date,
    options: {
      page?: number;
      limit?: number;
      confirmed?: boolean;
    } = {}
  ): Promise<{
    donations: IDonation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    summary: {
      totalAmount: number;
      count: number;
      averageAmount: number;
    };
  }> {
    try {
      await connectDB();

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (options.confirmed !== undefined) {
        query.confirmed = options.confirmed;
      }

      const donations = await DonationModel.find(query)
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await DonationModel.countDocuments(query);

      // Get summary stats
      const summaryStats = await DonationModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            averageAmount: { $avg: "$amount" }
          }
        }
      ]);

      const summary = summaryStats.length > 0 ? {
        totalAmount: summaryStats[0].totalAmount,
        count: summaryStats[0].count,
        averageAmount: Math.round(summaryStats[0].averageAmount * 100) / 100
      } : {
        totalAmount: 0,
        count: 0,
        averageAmount: 0
      };

      return {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary
      };
    } catch (error) {
      throw new Error(`Failed to get donations by date range: ${error}`);
    }
  }

  /**
   * Get top donors
   */
  static async getTopDonors(limit: number = 10): Promise<Array<{
    donorName: string;
    donorEmail?: string;
    totalAmount: number;
    donationCount: number;
    lastDonation: Date;
  }>> {
    try {
      await connectDB();

      const topDonors = await DonationModel.aggregate([
        {
          $match: {
            confirmed: true,
            anonymous: false,
            donorName: { $exists: true, $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: {
              name: "$donorName",
              email: "$donorEmail"
            },
            totalAmount: { $sum: "$amount" },
            donationCount: { $sum: 1 },
            lastDonation: { $max: "$createdAt" }
          }
        },
        {
          $sort: { totalAmount: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 0,
            donorName: "$_id.name",
            donorEmail: "$_id.email",
            totalAmount: 1,
            donationCount: 1,
            lastDonation: 1
          }
        }
      ]);

      return topDonors;
    } catch (error) {
      throw new Error(`Failed to get top donors: ${error}`);
    }
  }

  /**
   * Generate donation report
   */
  static async generateDonationReport(options: {
    startDate?: Date;
    endDate?: Date;
    includeAnonymous?: boolean;
  } = {}): Promise<{
    summary: {
      totalDonations: number;
      totalAmount: number;
      averageAmount: number;
      confirmedDonations: number;
      anonymousDonations: number;
    };
    topDonors: Array<{
      donorName: string;
      totalAmount: number;
      donationCount: number;
    }>;
    monthlyBreakdown: Array<{
      month: string;
      year: number;
      totalAmount: number;
      donationCount: number;
    }>;
  }> {
    try {
      await connectDB();

      const dateQuery: any = {};
      if (options.startDate || options.endDate) {
        dateQuery.createdAt = {};
        if (options.startDate) dateQuery.createdAt.$gte = options.startDate;
        if (options.endDate) dateQuery.createdAt.$lte = options.endDate;
      }

      // Summary statistics
      const summaryStats = await DonationModel.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: null,
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            averageAmount: { $avg: "$amount" },
            confirmedDonations: {
              $sum: { $cond: [{ $eq: ["$confirmed", true] }, 1, 0] }
            },
            anonymousDonations: {
              $sum: { $cond: [{ $eq: ["$anonymous", true] }, 1, 0] }
            }
          }
        }
      ]);

      const summary = summaryStats.length > 0 ? {
        ...summaryStats[0],
        averageAmount: Math.round(summaryStats[0].averageAmount * 100) / 100
      } : {
        totalDonations: 0,
        totalAmount: 0,
        averageAmount: 0,
        confirmedDonations: 0,
        anonymousDonations: 0
      };

      // Top donors (if including non-anonymous)
      let topDonors: any[] = [];
      if (options.includeAnonymous !== false) {
        topDonors = await DonationModel.aggregate([
          {
            $match: {
              ...dateQuery,
              confirmed: true,
              anonymous: false,
              donorName: { $exists: true, $nin: [null, ""] }
            }
          },
          {
            $group: {
              _id: "$donorName",
              totalAmount: { $sum: "$amount" },
              donationCount: { $sum: 1 }
            }
          },
          {
            $sort: { totalAmount: -1 }
          },
          {
            $limit: 10
          },
          {
            $project: {
              _id: 0,
              donorName: "$_id",
              totalAmount: 1,
              donationCount: 1
            }
          }
        ]);
      }

      // Monthly breakdown
      const monthlyBreakdown = await DonationModel.aggregate([
        { $match: { ...dateQuery, confirmed: true } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalAmount: { $sum: "$amount" },
            donationCount: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.year": -1, "_id.month": -1 }
        },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: {
              $arrayElemAt: [
                ["", "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"],
                "$_id.month"
              ]
            },
            totalAmount: 1,
            donationCount: 1
          }
        }
      ]);

      return {
        summary,
        topDonors,
        monthlyBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to generate donation report: ${error}`);
    }
  }
}