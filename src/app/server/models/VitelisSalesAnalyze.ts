import mongoose, { Document, Schema, Types } from "mongoose";

export interface IVitelisSalesAnalyze extends Document {
  companyName: string;
  url: string;
  useCase?: string;
  industry_id: number;
  user?: Types.ObjectId;
  status: "progress" | "finished" | "error" | "canceled";
  currentStep: number;
  executionId?: string;
  n8nInstance?: string;
  executionStatus?:
    | "started"
    | "inProgress"
    | "finished"
    | "error"
    | "canceled";
  executionStep?: number;
  docxFile?: string;
  companyId?: number;
  reportId?: number;
  generatedReportId?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VitelisSalesAnalyzeSchema: Schema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    useCase: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    industry_id: {
      type: Number,
      required: true,
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
    n8nInstance: {
      type: String,
      required: false,
      default: "vitelis_sales",
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
    docxFile: {
      type: String,
      required: false,
      trim: true,
    },
    companyId: {
      type: Number,
      required: false,
    },
    reportId: {
      type: Number,
      required: false,
    },
    generatedReportId: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

VitelisSalesAnalyzeSchema.index({ user: 1, createdAt: -1 });
VitelisSalesAnalyzeSchema.index({ user: 1, status: 1 });
VitelisSalesAnalyzeSchema.index({ executionId: 1 });
VitelisSalesAnalyzeSchema.index({ createdAt: -1 });

const VitelisSalesAnalyze =
  mongoose.models.VitelisSalesAnalyze ||
  mongoose.model<IVitelisSalesAnalyze>(
    "VitelisSalesAnalyze",
    VitelisSalesAnalyzeSchema
  );

export default VitelisSalesAnalyze;
