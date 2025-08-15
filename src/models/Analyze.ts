import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyze extends Document {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyzeSchema: Schema = new Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  businessLine: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  useCase: {
    type: String,
    required: true,
    trim: true
  },
  timeline: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Create index for better query performance
AnalyzeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Analyze || mongoose.model<IAnalyze>('Analyze', AnalyzeSchema);
