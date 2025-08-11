import { Schema, model, models, Document, Types } from 'mongoose';

export interface IQRCodeHistory extends Document {
  userId: Types.ObjectId;
  serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure';
  serviceId: Types.ObjectId;
  oldQRCode: string;
  newQRCode: string;
  regeneratedBy: Types.ObjectId; // Admin who regenerated
  reason?: string;
  createdAt: Date;
}

const QRCodeHistorySchema = new Schema<IQRCodeHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['convention', 'dinner', 'accommodation', 'brochure'],
    required: true,
    index: true
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  oldQRCode: {
    type: String,
    required: true,
    trim: true
  },
  newQRCode: {
    type: String,
    required: true,
    trim: true
  },
  regeneratedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'qrCodeHistory'
});

// Indexes for performance
QRCodeHistorySchema.index({ userId: 1, serviceType: 1 });
QRCodeHistorySchema.index({ serviceId: 1, serviceType: 1 });
QRCodeHistorySchema.index({ createdAt: -1 });

// Virtual for user population
QRCodeHistorySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for admin population
QRCodeHistorySchema.virtual('admin', {
  ref: 'User',
  localField: 'regeneratedBy',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
QRCodeHistorySchema.set('toJSON', { virtuals: true });
QRCodeHistorySchema.set('toObject', { virtuals: true });

export const QRCodeHistory = models.QRCodeHistory || model<IQRCodeHistory>('QRCodeHistory', QRCodeHistorySchema);