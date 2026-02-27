import { type IVitelisSalesAnalyze } from "../../models/VitelisSalesAnalyze";
import { VitelisSalesRepository } from "./vitelis-sales.repository";

export interface VitelisSalesAnalyzeData {
  companyName: string;
  url: string;
  useCase?: string;
  industry_id: number;
  user?: string;
  status?: "progress" | "finished" | "error" | "canceled";
  currentStep?: number;
  executionId?: string;
  executionStatus?: "started" | "inProgress" | "finished" | "error" | "canceled";
  executionStep?: number;
  docxFile?: string;
}

export class VitelisSalesService {
  static async createVitelisSalesAnalyze(
    data: Partial<IVitelisSalesAnalyze>,
    userId: string
  ): Promise<IVitelisSalesAnalyze> {
    const dataWithUser = {
      ...data,
      user: userId,
    } as unknown as Partial<IVitelisSalesAnalyze>;

    return VitelisSalesRepository.create(dataWithUser);
  }

  static async getVitelisSalesAnalyzeById(
    id: string
  ): Promise<IVitelisSalesAnalyze | null> {
    return VitelisSalesRepository.findById(id);
  }

  static async getVitelisSalesAnalyzesByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    return VitelisSalesRepository.findByUser(userId, page, limit);
  }

  static async updateVitelisSalesAnalyze(
    id: string,
    data: Partial<IVitelisSalesAnalyze>
  ): Promise<IVitelisSalesAnalyze | null> {
    return VitelisSalesRepository.updateById(id, data);
  }

  static async deleteVitelisSalesAnalyze(id: string): Promise<boolean> {
    return VitelisSalesRepository.deleteById(id);
  }

  static async getVitelisSalesAnalyzeByExecutionId(
    executionId: string
  ): Promise<IVitelisSalesAnalyze | null> {
    return VitelisSalesRepository.findByExecutionId(executionId);
  }
}
