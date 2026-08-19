import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProductPurchase extends Document {
  userId: Types.ObjectId;
  productType: 'uniform' | 'emblem' | 'magazine';
  quantity: number;
  totalAmount: number;
  paymentReference: string;
  status: string;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductPurchaseSchema = new Schema<IProductPurchase>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productType: {
      type: String,
      required: true,
      enum: ['uniform', 'emblem', 'magazine'],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ProductPurchaseSchema.index({ userId: 1 });
// paymentReference index is already created by unique: true in field definition
ProductPurchaseSchema.index({ confirmed: 1 });

export const ProductPurchase =
  mongoose.models.ProductPurchase ||
  mongoose.model<IProductPurchase>("ProductPurchase", ProductPurchaseSchema);
