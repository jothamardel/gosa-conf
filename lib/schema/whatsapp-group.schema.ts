import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppGroup extends Document {
  groupId: string;
  name: string;
  participants: string[];
  active: boolean;
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
    active: {
      type: Boolean,
      default: true,
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

export const WhatsAppGroup =
  mongoose.models.WhatsAppGroup ||
  mongoose.model<IWhatsAppGroup>("WhatsAppGroup", WhatsAppGroupSchema);
