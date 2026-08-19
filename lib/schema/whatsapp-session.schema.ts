import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppSession extends Document {
  jid: string;
  pendingAction: {
    type: string; // 'buy_tickets', 'buy_uniform', etc.
    serviceType?: string;
    productType?: string;
    quantity?: number;
    targetJids?: string[];
    [key: string]: any;
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    jid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    pendingAction: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically expire sessions
WhatsAppSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
WhatsAppSessionSchema.index({ jid: 1 });

export const WhatsAppSession =
  mongoose.models.WhatsAppSession ||
  mongoose.model<IWhatsAppSession>("WhatsAppSession", WhatsAppSessionSchema);
