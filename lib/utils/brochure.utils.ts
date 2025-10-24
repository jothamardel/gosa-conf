import connectDB from "../mongodb";
import { ConventionBrochure, IConventionBrochure, IBrochureRecipient } from "../schema/brochure.schema";
import { Types } from "mongoose";
import { PhoneUtils } from "./phone.utils";
import { QRCodeService } from "../services/qr-code.service";

// Type assertion to bypass Mongoose typing issues
const BrochureModel = ConventionBrochure as any;

export interface BrochureOrderData {
  userId: string | Types.ObjectId;
  paymentReference: string;
  quantity: number;
  brochureType: 'digital' | 'physical';
  recipientDetails: IBrochureRecipient[];
  totalAmount: number;
}

export class BrochureUtils {
  // Brochure pricing
  static readonly PRICING = {
    digital: 1200,
    physical: 1200
  };

  /**
   * Create a new brochure order
   */
  static async createOrder(data: BrochureOrderData): Promise<IConventionBrochure> {
    try {
      await connectDB();

      // Validate recipient details
      if (data.recipientDetails.length === 0) {
        throw new Error("At least one recipient detail is required");
      }

      for (const recipient of data.recipientDetails) {
        if (!recipient.name || recipient.name.trim().length === 0) {
          throw new Error("All recipients must have a name");
        }
      }

      // Generate QR code for physical pickup verification
      const qrCode = QRCodeService.generateUniqueQRData(
        'brochure',
        data.paymentReference,
        data.brochureType
      );

      // Create order
      const order = await BrochureModel.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        confirmed: false,
        qrCode,
        collected: false
      });

      return order;
    } catch (error) {
      throw new Error(`Failed to create brochure order: ${error}`);
    }
  }

  /**
   * Find a brochure order by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<any | null> {
    try {
      await connectDB();

      // Search for order where paymentReference starts with the pattern
      const { ConventionBrochure } = await import('../schema/brochure.schema');
      const order = await ConventionBrochure.findOne({
        paymentReference: { $regex: `^${referencePattern}` }
      }).populate('userId');

      return order;
    } catch (error) {
      console.error(`Error finding brochure order by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm a brochure order
   */
  static async confirmOrder(paymentReference: string): Promise<IConventionBrochure> {
    try {
      await connectDB();

      const order = await BrochureModel.findOneAndUpdate(
        { paymentReference },
        { confirmed: true },
        { new: true }
      ).populate("userId");

      if (!order) {
        throw new Error("Brochure order not found");
      }

      return order;
    } catch (error) {
      throw new Error(`Failed to confirm brochure order: ${error}`);
    }
  }

  /**
   * Generate QR code for physical pickup verification
   */
  static async generateQRCode(orderId: string, brochureType: 'digital' | 'physical'): Promise<string> {
    try {
      return QRCodeService.generateUniqueQRData('brochure', orderId, brochureType);
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Get all brochure orders for a user
   */
  static async getUserOrders(userId: string | Types.ObjectId): Promise<IConventionBrochure[]> {
    try {
      await connectDB();
      return await BrochureModel.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user brochure orders: ${error}`);
    }
  }

  /**
   * Find order by payment reference
   */
  static async findByPaymentReference(paymentReference: string): Promise<IConventionBrochure | null> {
    try {
      await connectDB();
      return await BrochureModel.findOne({ paymentReference }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find brochure order: ${error}`);
    }
  }

  /**
   * Find multiple orders by payment reference pattern (for group orders)
   */
  static async findMany(paymentReference: string): Promise<IConventionBrochure[]> {
    try {
      await connectDB();
      return await BrochureModel.find({
        paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
      }).populate("userId");
    } catch (error) {
      throw new Error(`Failed to find brochure orders: ${error}`);
    }
  }

  /**
   * Confirm multiple orders by payment reference pattern
   */
  static async findAndConfirmMany(paymentReference: string): Promise<any> {
    try {
      await connectDB();

      return await BrochureModel.updateMany(
        {
          paymentReference: { $regex: `^${paymentReference}`, $options: "i" }
        },
        { confirmed: true }
      );
    } catch (error) {
      throw new Error(`Failed to confirm multiple brochure orders: ${error}`);
    }
  }

  /**
   * Mark physical brochure as collected using QR code
   */
  static async markAsCollected(qrCode: string): Promise<IConventionBrochure | null> {
    try {
      await connectDB();

      const order = await BrochureModel.findOneAndUpdate(
        { qrCode },
        { collected: true },
        { new: true }
      ).populate("userId");

      return order;
    } catch (error) {
      throw new Error(`Failed to mark brochure as collected: ${error}`);
    }
  }

  /**
   * Validate QR code for physical pickup
   */
  static async validateQRCode(qrCode: string): Promise<{
    valid: boolean;
    order?: IConventionBrochure;
    message: string;
  }> {
    try {
      await connectDB();

      const order = await BrochureModel.findOne({ qrCode }).populate("userId");

      if (!order) {
        return {
          valid: false,
          message: "QR code not found"
        };
      }

      if (!order.confirmed) {
        return {
          valid: false,
          order,
          message: "Order not confirmed"
        };
      }

      if (order.brochureType === 'digital') {
        return {
          valid: false,
          order,
          message: "Digital brochures don't require physical pickup"
        };
      }

      if (order.collected) {
        return {
          valid: false,
          order,
          message: "Brochure already collected"
        };
      }

      return {
        valid: true,
        order,
        message: "Valid QR code for pickup"
      };
    } catch (error) {
      throw new Error(`Failed to validate QR code: ${error}`);
    }
  }

  /**
   * Get all brochure orders with pagination
   */
  static async getAllOrders(page: number = 1, limit: number = 10): Promise<{
    orders: IConventionBrochure[];
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

      const orders = await BrochureModel.find({})
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await BrochureModel.countDocuments();

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get brochure orders: ${error}`);
    }
  }

  /**
   * Calculate brochure order total amount
   */
  static calculateTotalAmount(quantity: number, brochureType: 'digital' | 'physical'): number {
    const pricePerBrochure = this.PRICING[brochureType];
    return quantity * pricePerBrochure;
  }

  /**
   * Get brochure pricing information
   */
  static getPricingInfo(): {
    digital: { price: number; description: string };
    physical: { price: number; description: string };
  } {
    return {
      digital: {
        price: this.PRICING.digital,
        description: "Digital brochure delivered via email"
      },
      physical: {
        price: this.PRICING.physical,
        description: "Physical brochure for pickup at the convention"
      }
    };
  }

  /**
   * Get orders by brochure type
   */
  static async getOrdersByType(brochureType: 'digital' | 'physical'): Promise<IConventionBrochure[]> {
    try {
      await connectDB();
      return await BrochureModel.find({ brochureType })
        .populate("userId")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get orders by type: ${error}`);
    }
  }

  /**
   * Get uncollected physical brochures
   */
  static async getUncollectedPhysicalBrochures(): Promise<IConventionBrochure[]> {
    try {
      await connectDB();
      return await BrochureModel.find({
        brochureType: 'physical',
        confirmed: true,
        collected: false
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get uncollected physical brochures: ${error}`);
    }
  }

  /**
   * Validate and format recipient details
   */
  static validateAndFormatRecipientDetails(recipients: IBrochureRecipient[]): {
    valid: boolean;
    message?: string;
    formattedRecipients?: IBrochureRecipient[];
  } {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return {
        valid: false,
        message: "At least one recipient is required"
      };
    }

    const formattedRecipients: IBrochureRecipient[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const formattedRecipient: IBrochureRecipient = { ...recipient };

      // Validate name
      if (!recipient.name || recipient.name.trim().length === 0) {
        return {
          valid: false,
          message: `Recipient ${i + 1} name is required`
        };
      }

      if (recipient.name.trim().length > 100) {
        return {
          valid: false,
          message: `Recipient ${i + 1} name must be less than 100 characters`
        };
      }

      // Validate email format if provided
      if (recipient.email && recipient.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          return {
            valid: false,
            message: `Recipient ${i + 1} has invalid email format`
          };
        }
      }

      // Format and validate phone number if provided
      if (recipient.phone && recipient.phone.trim().length > 0) {
        const formattedPhone = PhoneUtils.formatPhoneNumber(recipient.phone);
        const validation = PhoneUtils.validatePhoneNumber(recipient.phone);

        if (!validation.valid) {
          return {
            valid: false,
            message: `Recipient ${i + 1}: ${validation.message}`
          };
        } else {
          formattedRecipient.phone = formattedPhone;
        }
      }

      formattedRecipients.push(formattedRecipient);
    }

    return {
      valid: true,
      formattedRecipients
    };
  }

  /**
   * Validate recipient details (legacy method for backward compatibility)
   */
  static validateRecipientDetails(recipients: IBrochureRecipient[]): {
    valid: boolean;
    message?: string;
  } {
    if (recipients.length === 0) {
      return {
        valid: false,
        message: "At least one recipient is required"
      };
    }

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      if (!recipient.name || recipient.name.trim().length === 0) {
        return {
          valid: false,
          message: `Recipient ${i + 1} must have a name`
        };
      }

      if (recipient.name.trim().length > 100) {
        return {
          valid: false,
          message: `Recipient ${i + 1} name is too long (max 100 characters)`
        };
      }

      // Validate email format if provided
      if (recipient.email && recipient.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          return {
            valid: false,
            message: `Recipient ${i + 1} has invalid email format`
          };
        }
      }

      // Validate phone format if provided
      if (recipient.phone && recipient.phone.trim().length > 0) {
        const validation = PhoneUtils.validatePhoneNumber(recipient.phone);
        if (!validation.valid) {
          return {
            valid: false,
            message: `Recipient ${i + 1}: ${validation.message}`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity: number): {
    valid: boolean;
    message?: string;
  } {
    if (quantity < 1) {
      return {
        valid: false,
        message: "Quantity must be at least 1"
      };
    }

    if (quantity > 50) {
      return {
        valid: false,
        message: "Maximum quantity is 50 brochures per order"
      };
    }

    return { valid: true };
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics(): Promise<{
    total: number;
    confirmed: number;
    digital: number;
    physical: number;
    collected: number;
    uncollected: number;
  }> {
    try {
      await connectDB();

      const [
        total,
        confirmed,
        digital,
        physical,
        collected,
        uncollected
      ] = await Promise.all([
        BrochureModel.countDocuments(),
        BrochureModel.countDocuments({ confirmed: true }),
        BrochureModel.countDocuments({ brochureType: 'digital' }),
        BrochureModel.countDocuments({ brochureType: 'physical' }),
        BrochureModel.countDocuments({ brochureType: 'physical', collected: true }),
        BrochureModel.countDocuments({ brochureType: 'physical', confirmed: true, collected: false })
      ]);

      return {
        total,
        confirmed,
        digital,
        physical,
        collected,
        uncollected
      };
    } catch (error) {
      throw new Error(`Failed to get order statistics: ${error}`);
    }
  }
}