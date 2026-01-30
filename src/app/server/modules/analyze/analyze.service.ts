import { type IAnalyze } from '../../models/Analyze';
import { AnalyzeRepository } from './analyze.repository';
import { UserService } from '../user/user.service';

export interface AnalyzeData {
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
}

export class AnalyzeService {
  static async createAnalyze(data: AnalyzeData): Promise<IAnalyze> {
    return AnalyzeRepository.create(data as Partial<IAnalyze>);
  }

  static async createAnalyzeWithCredits(
    data: AnalyzeData,
    userId: string,
    userRole: string
  ): Promise<IAnalyze> {
    const analyzeDataWithUser = { ...data, user: userId } as unknown as Partial<IAnalyze>;
    const newAnalyze = await AnalyzeRepository.create(analyzeDataWithUser);

    if (userRole === 'user' && newAnalyze) {
      const creditsDeducted = await UserService.deductCredits(userId, 1);
      if (!creditsDeducted) {
        console.error('❌ AnalyzeService: Failed to deduct credits after creating analysis');
      }
    }

    return newAnalyze;
  }

  static async getAnalyzeById(id: string): Promise<IAnalyze | null> {
    return AnalyzeRepository.findById(id);
  }

  static async getAnalyzesByUser(userId: string, page: number = 1, limit: number = 10) {
    return AnalyzeRepository.findByUser(userId, page, limit);
  }

  static async getAllAnalyzes(page: number = 1, limit: number = 10) {
    return AnalyzeRepository.findAll(page, limit);
  }

  static async updateAnalyze(id: string, data: Partial<IAnalyze>): Promise<IAnalyze | null> {
    return AnalyzeRepository.updateById(id, data);
  }

  static async deleteAnalyze(id: string): Promise<boolean> {
    return AnalyzeRepository.deleteById(id);
  }

  static async getLatestProgress(userId: string): Promise<IAnalyze | null> {
    return AnalyzeRepository.findLatestInProgress(userId);
  }

  static async getAnalyzeStats() {
    return AnalyzeRepository.getStats();
  }
}
