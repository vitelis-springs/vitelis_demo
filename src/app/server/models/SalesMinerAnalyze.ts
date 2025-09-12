import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISalesMinerAnalyze extends Document {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  targetMarket: string;
  competitorAnalysis: string;
  salesStrategy: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  user?: Types.ObjectId;
  status: 'progress' | 'finished' | 'error' | 'canceled';
  currentStep: number;
  executionId?: string;
  executionStatus?: 'started' | 'inProgress' | 'finished' | 'error' | 'canceled';
  executionStep?: number;
  resultText?: string;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesMinerAnalyzeSchema: Schema = new Schema({
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
    default: 'SalesMiner'
  },
  targetMarket: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  competitorAnalysis: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  salesStrategy: {
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
  language: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['progress', 'finished', 'error', 'canceled'],
    default: 'progress'
  },
  currentStep: {
    type: Number,
    default: 0
  },
  executionId: {
    type: String,
    required: false,
    trim: true
  },
  executionStatus: {
    type: String,
    enum: ['started', 'inProgress', 'finished', 'error', 'canceled'],
    default: null,
    required: false,
  },
  executionStep: {
    type: Number,
    default: 0,
    required: false,
  },
  resultText: {
    type: String,
    required: false,
    trim: true
  },
  summary: {
    type: String,
    required: false,
    trim: true
  },
  improvementLeverages: {
    type: String,
    required: false,
    trim: true
  },
  headToHead: {
    type: String,
    required: false,
    trim: true
  },
  sources: {
    type: String,
    required: false,
    trim: true
  },
  additionalInformation: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Create index for better query performance
SalesMinerAnalyzeSchema.index({ user: 1, createdAt: -1 });

const SalesMinerAnalyze = mongoose.models.SalesMinerAnalyze || mongoose.model<ISalesMinerAnalyze>('SalesMinerAnalyze', SalesMinerAnalyzeSchema);

export default SalesMinerAnalyze;
