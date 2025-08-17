import { Schema, model, models, Document, Types } from 'mongoose';

export interface IAttendeeBadge extends Document {
  userId: Types.ObjectId;
  badgeImageUrl: string; // Vercel Blob storage URL
  profilePhotoUrl: string; // Original uploaded photo
  attendeeName: string;
  attendeeTitle?: string;
  organization?: string;
  socialMediaShared: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeBadgeSchema = new Schema<IAttendeeBadge>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Remove index: true to avoid duplicate with explicit index below
  },
  badgeImageUrl: {
    type: String,
    required: true,
    trim: true
  },
  profilePhotoUrl: {
    type: String,
    required: true,
    trim: true
  },
  attendeeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  attendeeTitle: {
    type: String,
    trim: true,
    maxlength: 100
  },
  organization: {
    type: String,
    trim: true,
    maxlength: 150
  },
  socialMediaShared: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'attendeeBadges'
});

// Indexes for performance
AttendeeBadgeSchema.index({ userId: 1 });
AttendeeBadgeSchema.index({ createdAt: -1 });
AttendeeBadgeSchema.index({ socialMediaShared: 1 });

// Virtual for user population
AttendeeBadgeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
AttendeeBadgeSchema.set('toJSON', { virtuals: true });
AttendeeBadgeSchema.set('toObject', { virtuals: true });

export const AttendeeBadge = models.AttendeeBadge || model<IAttendeeBadge>('AttendeeBadge', AttendeeBadgeSchema);