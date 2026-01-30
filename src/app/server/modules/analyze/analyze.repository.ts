import Analyze, { type IAnalyze } from '../../models/Analyze';
import { ensureDBConnection } from '../../../../lib/mongodb';

export class AnalyzeRepository {
  static async create(data: Partial<IAnalyze>): Promise<IAnalyze> {
    await ensureDBConnection();
    const analyze = new Analyze(data);
    return analyze.save();
  }

  static async findById(id: string): Promise<IAnalyze | null> {
    await ensureDBConnection();
    return (Analyze as any).findById(id).exec();
  }

  static async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: IAnalyze[]; total: number; page: number; limit: number }> {
    await ensureDBConnection();
    const skip = (page - 1) * limit;
    const total = await (Analyze as any).countDocuments({ user: userId });
    const data = await (Analyze as any)
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return { data, total, page, limit };
  }

  static async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: IAnalyze[]; total: number; page: number; limit: number }> {
    await ensureDBConnection();
    const skip = (page - 1) * limit;
    const total = await (Analyze as any).countDocuments();
    const data = await (Analyze as any)
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email')
      .exec();
    return { data, total, page, limit };
  }

  static async updateById(id: string, data: Partial<IAnalyze>): Promise<IAnalyze | null> {
    await ensureDBConnection();
    return (Analyze as any)
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  static async deleteById(id: string): Promise<boolean> {
    await ensureDBConnection();
    const result = await (Analyze as any).findByIdAndDelete(id).exec();
    return !!result;
  }

  static async findByExecutionId(executionId: string): Promise<IAnalyze | null> {
    await ensureDBConnection();
    return (Analyze as any).findOne({ executionId }).exec();
  }

  static async updateByExecutionId(
    executionId: string,
    data: Partial<IAnalyze>
  ): Promise<IAnalyze | null> {
    await ensureDBConnection();
    return (Analyze as any).findOneAndUpdate(
      { executionId: executionId.toString() },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  static async findLatestInProgress(userId: string): Promise<IAnalyze | null> {
    await ensureDBConnection();
    return (Analyze as any)
      .findOne({ user: userId, status: 'progress' })
      .sort({ updatedAt: -1 })
      .exec();
  }

  static async getStats(): Promise<{
    total: number;
    byUseCase: Record<string, number>;
    byCountry: Record<string, number>;
    recentCount: number;
  }> {
    await ensureDBConnection();
    const total = await Analyze.countDocuments();

    const byUseCaseAgg = await Analyze.aggregate([
      { $group: { _id: '$useCase', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byCountryAgg = await Analyze.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await Analyze.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    return {
      total,
      byUseCase: byUseCaseAgg.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byCountry: byCountryAgg.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      recentCount,
    };
  }
}
