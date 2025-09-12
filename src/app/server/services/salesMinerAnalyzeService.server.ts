import { ensureDBConnection } from "../../../lib/mongodb";
import SalesMinerAnalyze, { type ISalesMinerAnalyze } from "../models/SalesMinerAnalyze";

export interface SalesMinerAnalyzeData {
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
  resultText?: string;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
}

export class SalesMinerAnalyzeServiceServer {
  // Create a new sales miner analyze record
  static async createSalesMinerAnalyze(data: SalesMinerAnalyzeData): Promise<ISalesMinerAnalyze> {
    try {
      await ensureDBConnection();
      const salesMinerAnalyze = new SalesMinerAnalyze(data);
      return await salesMinerAnalyze.save();
    } catch (error) {
      console.error("Error creating sales miner analyze record:", error);
      throw new Error("Failed to create sales miner analyze record");
    }
  }

  // Get all sales miner analyze records for a user
  static async getSalesMinerAnalyzesByUser(userId: string): Promise<ISalesMinerAnalyze[]> {
    try {
      await ensureDBConnection();
      return await SalesMinerAnalyze.find({ user: userId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      console.error("Error fetching sales miner analyze records:", error);
      throw new Error("Failed to fetch sales miner analyze records");
    }
  }

  // Get sales miner analyze record by ID
  static async getSalesMinerAnalyzeById(id: string): Promise<ISalesMinerAnalyze | null> {
    try {
      await ensureDBConnection();
      return await SalesMinerAnalyze.findById(id).exec();
    } catch (error) {
      console.error("Error fetching sales miner analyze record:", error);
      throw new Error("Failed to fetch sales miner analyze record");
    }
  }

  // Update a sales miner analyze record
  static async updateSalesMinerAnalyze(id: string, data: Partial<SalesMinerAnalyzeData>): Promise<ISalesMinerAnalyze | null> {
    try {
      console.log("🔄 Server: Starting updateSalesMinerAnalyze with:", { id, data });
      await ensureDBConnection();

      const UPDATE_RESULT = await SalesMinerAnalyze.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true },
      ).exec();

      console.log("📊 Server: UPDATE_RESULT:", UPDATE_RESULT);
      console.log("✅ Server: Update completed successfully");
      return UPDATE_RESULT;
    } catch (error) {
      console.error("❌ Server: Error updating sales miner analyze record:", error);
      throw new Error("Failed to update sales miner analyze record");
    }
  }

  // Get latest progress for a user
  static async getLatestSalesMinerProgress(userId: string): Promise<ISalesMinerAnalyze | null> {
    try {
      await ensureDBConnection();
      return await SalesMinerAnalyze.findOne({ user: userId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      console.error("Error fetching latest sales miner progress:", error);
      throw new Error("Failed to fetch latest sales miner progress");
    }
  }

  // Delete a sales miner analyze record
  static async deleteSalesMinerAnalyze(id: string): Promise<boolean> {
    try {
      await ensureDBConnection();
      const result = await SalesMinerAnalyze.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error("Error deleting sales miner analyze record:", error);
      throw new Error("Failed to delete sales miner analyze record");
    }
  }

  // Get sales miner analyze record by execution ID
  static async getSalesMinerAnalyzeByExecutionId(executionId: string): Promise<ISalesMinerAnalyze | null> {
    try {
      await ensureDBConnection();
      return await SalesMinerAnalyze.findOne({ executionId }).exec();
    } catch (error) {
      console.error("Error fetching sales miner analyze by execution ID:", error);
      throw new Error("Failed to fetch sales miner analyze by execution ID");
    }
  }
}
