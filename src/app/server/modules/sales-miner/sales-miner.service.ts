import { type ISalesMinerAnalyze } from '../../models/SalesMinerAnalyze';
import { SalesMinerRepository } from './sales-miner.repository';
import { UserService } from '../user/user.service';

export interface SalesMinerAnalyzeData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  user?: string;
  status?: 'progress' | 'finished' | 'error' | 'canceled';
  currentStep?: number;
  executionId?: string;
  executionStatus?: 'started' | 'inProgress' | 'finished' | 'error' | 'canceled';
  executionStep?: number;
  resultText?: string;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
}

export class SalesMinerService {
  static async createSalesMinerAnalyze(data: Partial<ISalesMinerAnalyze>): Promise<ISalesMinerAnalyze> {
    return SalesMinerRepository.create(data);
  }

  static async createSalesMinerAnalyzeWithCredits(
    data: Partial<ISalesMinerAnalyze>,
    userId: string,
    userRole: string
  ): Promise<ISalesMinerAnalyze> {
    const dataWithUser = { ...data, user: userId } as unknown as Partial<ISalesMinerAnalyze>;
    const newAnalyze = await SalesMinerRepository.create(dataWithUser);

    if (userRole === 'user' && newAnalyze) {
      const creditsDeducted = await UserService.deductCredits(userId, 1);
      if (!creditsDeducted) {
        console.error('❌ SalesMinerService: Failed to deduct credits after creating sales miner analysis');
      }
    }

    return newAnalyze;
  }

  static async getSalesMinerAnalyzeById(id: string): Promise<ISalesMinerAnalyze | null> {
    return SalesMinerRepository.findById(id);
  }

  static async getSalesMinerAnalyzesByUser(userId: string, page: number = 1, limit: number = 10) {
    return SalesMinerRepository.findByUser(userId, page, limit);
  }

  static async updateSalesMinerAnalyze(
    id: string,
    data: Partial<ISalesMinerAnalyze>
  ): Promise<ISalesMinerAnalyze | null> {
    return SalesMinerRepository.updateById(id, data);
  }

  static async deleteSalesMinerAnalyze(id: string): Promise<boolean> {
    return SalesMinerRepository.deleteById(id);
  }

  static async getSalesMinerAnalyzeByExecutionId(executionId: string): Promise<ISalesMinerAnalyze | null> {
    return SalesMinerRepository.findByExecutionId(executionId);
  }

  static async getLatestSalesMinerProgress(userId: string): Promise<ISalesMinerAnalyze | null> {
    const result = await SalesMinerRepository.findByUser(userId, 1, 1);
    return result.data[0] ?? null;
  }
}
