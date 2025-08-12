import connectDB from "../mongodb";
import { GoodwillMessage, IGoodwillMessage } from "../schema/goodwill.schema";
import { Types } from "mongoose";

// Type assertion to bypass Mongoose typing issues
const GoodwillModel = GoodwillMessage as any;

export interface GoodwillMessageData {
  userId: string | Types.ObjectId;
  paymentReference: string;
  message: string;
  donationAmount: number;
  attributionName?: string;
  anonymous: boolean;
}

export class GoodwillUtils {
  // Minimum donation amount for goodwill messages
  static readonly MIN_DONATION_AMOUNT = 10;

  /**
   * Create a new goodwill message
   */
  static async createMessage(data: GoodwillMessageData): Promise<IGoodwillMessage> {
    try {
      await connectDB();

      // Validate message content
      const messageValidation = this.validateMessage(data.message);
      if (!messageValidation.valid) {
        throw new Error(messageValidation.message);
      }

      // Validate donation amount
      if (data.donationAmount < this.MIN_DONATION_AMOUNT) {
        throw new Error(`Minimum donation amount is $${this.MIN_DONATION_AMOUNT}`);
      }

      // Create message
      const message = await GoodwillModel.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        confirmed: false,
        approved: false
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to create goodwill message: ${error}`);
    }
  }

  /**
   * Find a goodwill message by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<any | null> {
    try {
      await connectDB();

      // Search for message where paymentReference starts with the pattern
      const { GoodwillMessage } = await import('../schema/goodwill.schema');
      const message = await GoodwillMessage.findOne({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return message;
    } catch (error) {
      console.error(`Error finding goodwill message by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm a goodwill message (after payment)
   */
  static async confirmMessage(paymentReference: string): Promise<IGoodwillMessage> {
    try {
      await connectDB();

      const message = await GoodwillModel.findOneAndUpdate(
        { paymentReference },
        { confirmed: true },
        { new: true }
      ).populate("userId");

      if (!message) {
        throw new Error("Goodwill message not found");
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to confirm goodwill message: ${error}`);
    }
  }

  /**
   * Approve a goodwill message
   */
  static async approveMessage(
    messageId: string | Types.ObjectId,
    approvedBy: string | Types.ObjectId
  ): Promise<IGoodwillMessage> {
    try {
      await connectDB();

      const message = await GoodwillModel.findByIdAndUpdate(
        messageId,
        {
          approved: true,
          approvedBy: new Types.ObjectId(approvedBy),
          approvedAt: new Date()
        },
        { new: true }
      ).populate("userId").populate("approvedBy");

      if (!message) {
        throw new Error("Goodwill message not found");
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to approve goodwill message: ${error}`);
    }
  }

  /**
   * Reject/unapprove a goodwill message
   */
  static async rejectMessage(
    messageId: string | Types.ObjectId,
    rejectedBy: string | Types.ObjectId
  ): Promise<IGoodwillMessage> {
    try {
      await connectDB();

      const message = await GoodwillModel.findByIdAndUpdate(
        messageId,
        {
          approved: false,
          approvedBy: new Types.ObjectId(rejectedBy),
          approvedAt: new Date()
        },
        { new: true }
      ).populate("userId").populate("approvedBy");

      if (!message) {
        throw new Error("Goodwill message not found");
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to reject goodwill message: ${error}`);
    }
  }

  /**
   * Get all goodwill messages for a user
   */
  static async getUserMessages(userId: string | Types.ObjectId): Promise<IGoodwillMessage[]> {
    try {
      await connectDB();
      return await GoodwillModel.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").populate("approvedBy").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user goodwill messages: ${error}`);
    }
  }

  /**
   * Find message by payment reference
   */
  static async findByPaymentReference(paymentReference: string): Promise<IGoodwillMessage | null> {
    try {
      await connectDB();
      return await GoodwillModel.findOne({ paymentReference })
        .populate("userId")
        .populate("approvedBy");
    } catch (error) {
      throw new Error(`Failed to find goodwill message: ${error}`);
    }
  }

  /**
   * Find multiple messages by payment reference pattern
   */
  static async findMany(paymentReference: string): Promise<IGoodwillMessage[]> {
    try {
      await connectDB();
      return await GoodwillModel.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
      }).populate("userId").populate("approvedBy");
    } catch (error) {
      throw new Error(`Failed to find goodwill messages: ${error}`);
    }
  }

  /**
   * Confirm multiple messages by payment reference pattern
   */
  static async findAndConfirmMany(paymentReference: string): Promise<any> {
    try {
      await connectDB();

      return await GoodwillModel.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
        },
        { confirmed: true }
      );
    } catch (error) {
      throw new Error(`Failed to confirm multiple goodwill messages: ${error}`);
    }
  }

  /**
   * Get all goodwill messages with pagination and filtering
   */
  static async getAllMessages(
    page: number = 1,
    limit: number = 10,
    filters: {
      approved?: boolean;
      confirmed?: boolean;
      anonymous?: boolean;
    } = {}
  ): Promise<{
    messages: IGoodwillMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const skip = (page - 1) * limit;
      const query = { ...filters };

      const messages = await GoodwillModel.find(query)
        .populate("userId")
        .populate("approvedBy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await GoodwillModel.countDocuments(query);

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get goodwill messages: ${error}`);
    }
  }

  /**
   * Get approved messages for public display
   */
  static async getApprovedMessages(limit: number = 50): Promise<IGoodwillMessage[]> {
    try {
      await connectDB();
      return await GoodwillModel.find({
        confirmed: true,
        approved: true
      })
        .populate("userId")
        .sort({ approvedAt: -1 })
        .limit(limit);
    } catch (error) {
      throw new Error(`Failed to get approved goodwill messages: ${error}`);
    }
  }

  /**
   * Get pending messages awaiting approval
   */
  static async getPendingMessages(): Promise<IGoodwillMessage[]> {
    try {
      await connectDB();
      return await GoodwillModel.find({
        confirmed: true,
        approved: false
      })
        .populate("userId")
        .sort({ createdAt: 1 }); // Oldest first for approval queue
    } catch (error) {
      throw new Error(`Failed to get pending goodwill messages: ${error}`);
    }
  }

  /**
   * Validate message content
   */
  static validateMessage(message: string, allowEmpty: boolean = false): {
    valid: boolean;
    message?: string;
  } {
    if (!message || message.trim().length === 0) {
      if (allowEmpty) {
        return { valid: true };
      }
      return {
        valid: false,
        message: "Message cannot be empty"
      };
    }

    const trimmedMessage = message.trim();

    // Skip validation for donation-only placeholder messages
    if (trimmedMessage === 'No message - donation only') {
      return { valid: true };
    }

    if (trimmedMessage.length < 10) {
      return {
        valid: false,
        message: "Message must be at least 10 characters long"
      };
    }

    if (trimmedMessage.length > 500) {
      return {
        valid: false,
        message: "Message cannot exceed 500 characters"
      };
    }

    // Check for inappropriate content (basic profanity filter)
    const inappropriateWords = [
      'spam', 'scam', 'fraud', 'hate', 'violence'
      // Add more words as needed
    ];

    const lowerMessage = trimmedMessage.toLowerCase();
    for (const word of inappropriateWords) {
      if (lowerMessage.includes(word)) {
        return {
          valid: false,
          message: "Message contains inappropriate content"
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate attribution name
   */
  static validateAttributionName(name: string): {
    valid: boolean;
    message?: string;
  } {
    if (!name || name.trim().length === 0) {
      return { valid: true }; // Attribution name is optional
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 100) {
      return {
        valid: false,
        message: "Attribution name cannot exceed 100 characters"
      };
    }

    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\.\-\']+$/;
    if (!validNameRegex.test(trimmedName)) {
      return {
        valid: false,
        message: "Attribution name contains invalid characters"
      };
    }

    return { valid: true };
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

    if (amount > 10000) {
      return {
        valid: false,
        message: "Maximum donation amount is $10,000"
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
   * Get message statistics
   */
  static async getMessageStatistics(): Promise<{
    total: number;
    confirmed: number;
    approved: number;
    pending: number;
    anonymous: number;
    totalDonationAmount: number;
  }> {
    try {
      await connectDB();

      const [
        total,
        confirmed,
        approved,
        pending,
        anonymous,
        donationStats
      ] = await Promise.all([
        GoodwillModel.countDocuments(),
        GoodwillModel.countDocuments({ confirmed: true }),
        GoodwillModel.countDocuments({ confirmed: true, approved: true }),
        GoodwillModel.countDocuments({ confirmed: true, approved: false }),
        GoodwillModel.countDocuments({ anonymous: true }),
        GoodwillModel.aggregate([
          { $match: { confirmed: true } },
          { $group: { _id: null, total: { $sum: "$donationAmount" } } }
        ])
      ]);

      const totalDonationAmount = donationStats.length > 0 ? donationStats[0].total : 0;

      return {
        total,
        confirmed,
        approved,
        pending,
        anonymous,
        totalDonationAmount
      };
    } catch (error) {
      throw new Error(`Failed to get message statistics: ${error}`);
    }
  }

  /**
   * Search messages by content
   */
  static async searchMessages(
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    messages: IGoodwillMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      await connectDB();

      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(searchTerm, 'i');

      const query = {
        $or: [
          { message: { $regex: searchRegex } },
          { attributionName: { $regex: searchRegex } }
        ]
      };

      const messages = await GoodwillModel.find(query)
        .populate("userId")
        .populate("approvedBy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await GoodwillModel.countDocuments(query);

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to search goodwill messages: ${error}`);
    }
  }

  /**
   * Get messages by donation amount range
   */
  static async getMessagesByDonationRange(
    minAmount: number,
    maxAmount: number
  ): Promise<IGoodwillMessage[]> {
    try {
      await connectDB();
      return await GoodwillModel.find({
        donationAmount: { $gte: minAmount, $lte: maxAmount },
        confirmed: true
      })
        .populate("userId")
        .populate("approvedBy")
        .sort({ donationAmount: -1 });
    } catch (error) {
      throw new Error(`Failed to get messages by donation range: ${error}`);
    }
  }
}