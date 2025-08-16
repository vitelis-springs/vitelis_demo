import mongoose from 'mongoose';

export interface IMessage {
  _id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new mongoose.Schema<IMessage>(
  {
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
MessageSchema.index({ chatId: 1, timestamp: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
