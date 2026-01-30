import SalesMinerAnalyze, { type ISalesMinerAnalyze } from '../../models/SalesMinerAnalyze';
import { ensureDBConnection } from '../../../../lib/mongodb';

export class SalesMinerRepository {
  static async create(data: Partial<ISalesMinerAnalyze>): Promise<ISalesMinerAnalyze> {
    await ensureDBConnection();
    const analyze = new SalesMinerAnalyze(data);
    return analyze.save();
  }

  static async findById(id: string): Promise<ISalesMinerAnalyze | null> {
    await ensureDBConnection();
    return (SalesMinerAnalyze as any).findById(id).exec();
  }

  static async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: ISalesMinerAnalyze[]; total: number; page: number; limit: number }> {
    await ensureDBConnection();
    const skip = (page - 1) * limit;

    let query = {};
    if (userId !== 'all') {
      query = { user: userId };
    }

    const total = await (SalesMinerAnalyze as any).countDocuments(query);

    let dbQuery = (SalesMinerAnalyze as any)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (userId === 'all') {
      dbQuery = dbQuery.populate('user', 'firstName lastName email');
    }

    const data = await dbQuery.exec();
    return { data, total, page, limit };
  }

  static async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: ISalesMinerAnalyze[]; total: number; page: number; limit: number }> {
    return this.findByUser('all', page, limit);
  }

  static async updateById(id: string, data: Partial<ISalesMinerAnalyze>): Promise<ISalesMinerAnalyze | null> {
    await ensureDBConnection();
    return (SalesMinerAnalyze as any)
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  static async deleteById(id: string): Promise<boolean> {
    await ensureDBConnection();
    const result = await (SalesMinerAnalyze as any).findByIdAndDelete(id).exec();
    return !!result;
  }

  static async findByExecutionId(executionId: string): Promise<ISalesMinerAnalyze | null> {
    await ensureDBConnection();
    return (SalesMinerAnalyze as any).findOne({ executionId }).exec();
  }

  static async updateByExecutionId(
    executionId: string,
    data: Partial<ISalesMinerAnalyze>
  ): Promise<ISalesMinerAnalyze | null> {
    await ensureDBConnection();
    return (SalesMinerAnalyze as any).findOneAndUpdate(
      { executionId: executionId.toString() },
      { $set: data },
      { new: true, runValidators: true }
    );
  }
}
