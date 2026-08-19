import mongoose, { Schema, Document } from "mongoose";

export interface IConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
  timestamp: Date;
}

export interface IConversationHistory extends Document {
  jid: string;
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationHistorySchema = new Schema<IConversationHistory>(
  {
    jid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    messages: [
      {
        role: {
          type: String,
          required: true,
          enum: ['user', 'assistant', 'system'],
        },
        content: {
          type: String,
          required: true,
        },
        name: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

ConversationHistorySchema.index({ jid: 1 });

export const ConversationHistory =
  mongoose.models.ConversationHistory ||
  mongoose.model<IConversationHistory>("ConversationHistory", ConversationHistorySchema);
