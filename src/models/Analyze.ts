import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyze extends Document {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  userId?: string;
  status: 'progress' | 'finished';
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyzeSchema: Schema = new Schema({
  companyName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  businessLine: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  useCase: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  timeline: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  userId: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: String,
    enum: ['progress', 'finished'],
    default: 'progress'
  },
  currentStep: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create index for better query performance
AnalyzeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Analyze || mongoose.model<IAnalyze>('Analyze', AnalyzeSchema);
