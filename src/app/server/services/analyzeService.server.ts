import { ensureDBConnection } from "../../../lib/mongodb";
import Analyze, { type IAnalyze } from "../models/Analyze";

export interface AnalyzeData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  user?: string;
  status?: "progress" | "finished" | "error" | "canceled";
  currentStep?: number;
  executionId?: string;
  executionStatus?: "started" | "inProgress" | "finished" | "error" | "canceled";
  executionStep?: number;
}

export class AnalyzeServiceServer {
  // Create a new analyze record
  static async createAnalyze(data: AnalyzeData): Promise<IAnalyze> {
    try {
      const analyze = new Analyze(data);
      return await analyze.save();
    } catch (error) {
      console.error("Error creating analyze record:", error);
      throw new Error("Failed to create analyze record");
    }
  }

  // Get all analyze records for a user
  static async getAnalyzesByUser(userId: string): Promise<IAnalyze[]> {
    try {
      await ensureDBConnection();
      return await Analyze.find({ user: userId }).sort({ createdAt: -1 }).exec();
    } catch (error) {
      console.error("Error fetching analyze records:", error);
      throw new Error("Failed to fetch analyze records");
    }
  }

  // Get all analyze records (admin function)
  static async getAllAnalyzes(): Promise<IAnalyze[]> {
    try {
      return await Analyze.find().sort({ createdAt: -1 }).exec();
    } catch (error) {
      console.error("Error fetching all analyze records:", error);
      throw new Error("Failed to fetch analyze records");
    }
  }

  // Get a specific analyze record by ID
  static async getAnalyzeById(id: string): Promise<IAnalyze | null> {
    try {
      return await Analyze.findById(id).exec();
    } catch (error) {
      console.error("Error fetching analyze record:", error);
      throw new Error("Failed to fetch analyze record");
    }
  }
  // Update an analyze record
  static async updateAnalyze(id: string, data: Partial<AnalyzeData>): Promise<IAnalyze | null> {
    try {
      console.log("🔄 Server: Starting updateAnalyze with:", { id, data });

      const UPDATE_RESULT = await Analyze.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true },
      ).exec();

      console.log("📊 Server: UPDATE_RESULT:", UPDATE_RESULT);
      console.log("✅ Server: Update completed successfully");
      return UPDATE_RESULT;
    } catch (error) {
      console.error("❌ Server: Error updating analyze record:", error);
      throw new Error("Failed to update analyze record");
    }
  }

  // Get latest progress for a user
  static async getLatestProgress(userId: string): Promise<IAnalyze | null> {
    try {
      return await Analyze.findOne({
        user: userId,
        status: "progress",
      })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      console.error("Error fetching latest progress:", error);
      throw new Error("Failed to fetch latest progress");
    }
  }

  // Delete an analyze record
  static async deleteAnalyze(id: string): Promise<boolean> {
    try {
      const result = await Analyze.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error("Error deleting analyze record:", error);
      throw new Error("Failed to delete analyze record");
    }
  }

  // Get analyze statistics
  static async getAnalyzeStats(): Promise<{
    total: number;
    byUseCase: Record<string, number>;
    byCountry: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const total = await Analyze.countDocuments();

      const byUseCase = await Analyze.aggregate([
        { $group: { _id: "$useCase", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const byCountry = await Analyze.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = await Analyze.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        total,
        byUseCase: byUseCase.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byCountry: byCountry.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        recentCount,
      };
    } catch (error) {
      console.error("Error fetching analyze statistics:", error);
      throw new Error("Failed to fetch analyze statistics");
    }
  }
}
