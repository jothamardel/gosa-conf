import connectDB from "../mongodb";
import { ProductPurchase, IProductPurchase } from "../schema/product-purchase.schema";
import { Types } from "mongoose";

export interface ProductPurchaseData {
  userId: string | Types.ObjectId;
  productType: 'uniform' | 'emblem' | 'magazine';
  quantity: number;
  totalAmount: number;
  paymentReference: string;
}

export class ProductPurchaseUtils {
  /**
   * Create a new pending product purchase
   */
  static async createPurchase(data: ProductPurchaseData): Promise<IProductPurchase> {
    try {
      await connectDB();

      const purchase = await ProductPurchase.create({
        ...data,
        userId: new Types.ObjectId(data.userId),
        status: 'pending',
        confirmed: false,
      });

      return purchase;
    } catch (error) {
      throw new Error(`Failed to create product purchase: ${error}`);
    }
  }

  /**
   * Find a product purchase by reference pattern (for webhook processing)
   */
  static async findByReferencePattern(referencePattern: string): Promise<IProductPurchase | null> {
    try {
      await connectDB();

      // Search for purchase where paymentReference starts with the pattern
      const purchase = await ProductPurchase.findOne({
        paymentReference: { $regex: `^${referencePattern}`, $options: "i" }
      }).populate('userId');

      return purchase;
    } catch (error) {
      console.error(`Error finding product purchase by pattern ${referencePattern}:`, error);
      return null;
    }
  }

  /**
   * Confirm a product purchase
   */
  static async confirmPurchase(paymentReference: string): Promise<IProductPurchase> {
    try {
      await connectDB();

      const purchase = await ProductPurchase.findOneAndUpdate(
        { paymentReference },
        { confirmed: true, status: 'confirmed' },
        { new: true }
      ).populate("userId");

      if (!purchase) {
        throw new Error("Product purchase not found");
      }

      return purchase;
    } catch (error) {
      throw new Error(`Failed to confirm product purchase: ${error}`);
    }
  }

  /**
   * Get all product purchases for a user
   */
  static async getUserPurchases(userId: string | Types.ObjectId): Promise<IProductPurchase[]> {
    try {
      await connectDB();
      return await ProductPurchase.find({
        userId: new Types.ObjectId(userId)
      }).populate("userId").sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user product purchases: ${error}`);
    }
  }
}
