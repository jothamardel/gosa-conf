import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppGroup extends Document {
  groupId: string;
  name: string;
  participants: string[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppGroupSchema = new Schema<IWhatsAppGroup>(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

WhatsAppGroupSchema.index({ groupId: 1 });

export const WhatsAppGroup =
  mongoose.models.WhatsAppGroup ||
  mongoose.model<IWhatsAppGroup>("WhatsAppGroup", WhatsAppGroupSchema);
