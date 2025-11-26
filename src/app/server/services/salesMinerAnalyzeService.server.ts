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
  // Get all sales miner analyze records for a user
  static async getSalesMinerAnalyzesByUser(userId: string, page: number = 1, limit: number = 10): Promise<{ data: ISalesMinerAnalyze[], total: number, page: number, limit: number }> {
    try {
      await ensureDBConnection();
      const skip = (page - 1) * limit;
      
      let query = {};
      if (userId !== 'all') {
        query = { user: userId };
      }

      const total = await (SalesMinerAnalyze as any).countDocuments(query);
      
      let dbQuery = (SalesMinerAnalyze as any).find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
      if (userId === 'all') {
        dbQuery = dbQuery.populate('user', 'firstName lastName email');
      }
      
      const data = await dbQuery.exec();
        
      return { data, total, page, limit };
    } catch (error) {
      console.error("Error fetching sales miner analyze records:", error);
      throw new Error("Failed to fetch sales miner analyze records");
    }
  }

  static async getSalesMinerAnalyzeById(id: string): Promise<ISalesMinerAnalyze | null> {
    try {
      await ensureDBConnection();
      return await (SalesMinerAnalyze as any).findById(id).exec();
    } catch (error) {
      console.error("Error fetching sales miner analyze record:", error);
      throw new Error("Failed to fetch sales miner analyze record");
    }
  }

  static async createSalesMinerAnalyze(data: Partial<ISalesMinerAnalyze>): Promise<ISalesMinerAnalyze> {
    try {
      await ensureDBConnection();
      const analyze = new SalesMinerAnalyze(data);
      return await analyze.save();
    } catch (error) {
      console.error("Error creating sales miner analyze record:", error);
      throw new Error("Failed to create sales miner analyze record");
    }
  }

  static async updateSalesMinerAnalyze(id: string, data: Partial<ISalesMinerAnalyze>): Promise<ISalesMinerAnalyze | null> {
    try {
      await ensureDBConnection();
      return await (SalesMinerAnalyze as any).findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).exec();
    } catch (error) {
      console.error("Error updating sales miner analyze record:", error);
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

  static async deleteSalesMinerAnalyze(id: string): Promise<boolean> {
    try {
      await ensureDBConnection();
      const result = await (SalesMinerAnalyze as any).findByIdAndDelete(id).exec();
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
