import mongoose from 'mongoose';

export interface IChat {
  _id: string;
  userId: string;
  title: string;
  preview: string;
  messageCount: number;
  lastMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new mongoose.Schema<IChat>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    preview: {
      type: String,
      required: true,
      trim: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessage: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
ChatSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);
