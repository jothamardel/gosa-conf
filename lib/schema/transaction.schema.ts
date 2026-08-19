import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  type: 'ticket_convention' | 'ticket_dinner' | 'product_uniform' | 'product_emblem' | 'product_magazine' | 'product_brochure' | 'donation';
  status: 'pending' | 'completed' | 'failed';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'ticket_convention',
        'ticket_dinner',
        'product_uniform',
        'product_emblem',
        'product_magazine',
        'product_brochure',
        'donation'
      ],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ userId: 1 });
// paymentReference index is already created by unique: true in field definition
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1 });

export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
