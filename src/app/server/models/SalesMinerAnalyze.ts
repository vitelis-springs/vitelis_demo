import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICompetitor {
  name: string;
  url: string;
}

export interface ISalesMinerAnalyze extends Document {
  companyName: string;
  url: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  competitors?: ICompetitor[];
  user?: Types.ObjectId;
  status: "progress" | "finished" | "error" | "canceled";
  currentStep: number;
  executionId?: string;
  executionStatus?:
    | "started"
    | "inProgress"
    | "finished"
    | "error"
    | "canceled";
  executionStep?: number;
  resultText?: string;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
  yamlFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesMinerAnalyzeSchema: Schema = new Schema(
  {
    companyName: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    businessLine: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    useCase: {
      type: String,
      required: false,
      trim: true,
      default: "Qualtrics",
    },
    timeline: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    language: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    status: {
      type: String,
      enum: ["progress", "finished", "error", "canceled"],
      default: "progress",
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    executionId: {
      type: String,
      required: false,
      trim: true,
    },
    executionStatus: {
      type: String,
      enum: ["started", "inProgress", "finished", "error", "canceled"],
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
      trim: true,
    },
    summary: {
      type: String,
      required: false,
      trim: true,
    },
    improvementLeverages: {
      type: String,
      required: false,
      trim: true,
    },
    headToHead: {
      type: String,
      required: false,
      trim: true,
    },
    sources: {
      type: String,
      required: false,
      trim: true,
    },
    yamlFile: {
      type: String,
      required: false,
      trim: true,
    },
    additionalInformation: {
      type: String,
      required: false,
      trim: true,
    },
    competitors: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
SalesMinerAnalyzeSchema.index({ user: 1, createdAt: -1 }); // Main index for user queries with date sorting
SalesMinerAnalyzeSchema.index({ user: 1, status: 1 }); // Index for filtering by user and status
SalesMinerAnalyzeSchema.index({ executionId: 1 }); // Index for execution tracking
SalesMinerAnalyzeSchema.index({ createdAt: -1 }); // Index for date-based queries

const SalesMinerAnalyze =
  mongoose.models.SalesMinerAnalyze ||
  mongoose.model<ISalesMinerAnalyze>(
    "SalesMinerAnalyze",
    SalesMinerAnalyzeSchema
  );

export default SalesMinerAnalyze;
