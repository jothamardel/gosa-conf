import mongoose, { Schema, Document, Types } from 'mongoose';

export type BroadcastAudienceFilter = 'no-tickets' | 'all-members' | 'missing-dinner' | 'custom';
export type BroadcastCampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface IBroadcastRecipient {
  userId?: Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sentAt?: Date;
  error?: string;
  msgId?: string | number;
  previewText?: string;
}

export interface IBroadcastCampaign extends Document {
  title: string;
  template: string;
  audienceFilter: BroadcastAudienceFilter;
  status: BroadcastCampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  currentCursor: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  recipients: IBroadcastRecipient[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastRecipientSchema = new Schema<IBroadcastRecipient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    sentAt: { type: Date },
    error: { type: String },
    msgId: { type: Schema.Types.Mixed },
    previewText: { type: String },
  },
  { _id: false },
);

const BroadcastCampaignSchema = new Schema<IBroadcastCampaign>(
  {
    title: { type: String, required: true, trim: true },
    template: { type: String, required: true },
    audienceFilter: {
      type: String,
      enum: ['no-tickets', 'all-members', 'missing-dinner', 'custom'],
      default: 'no-tickets',
    },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    currentCursor: { type: Number, default: 0 },
    minDelaySeconds: { type: Number, default: 8 },
    maxDelaySeconds: { type: Number, default: 18 },
    recipients: [BroadcastRecipientSchema],
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: String, default: 'Desk Admin' },
    lastError: { type: String },
  },
  {
    timestamps: true,
  },
);

BroadcastCampaignSchema.index({ createdAt: -1 });

export const BroadcastCampaign =
  mongoose.models.BroadcastCampaign ||
  mongoose.model<IBroadcastCampaign>('BroadcastCampaign', BroadcastCampaignSchema);
