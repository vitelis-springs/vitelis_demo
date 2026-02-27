import VitelisSalesAnalyze, {
  type IVitelisSalesAnalyze,
} from "../../models/VitelisSalesAnalyze";
import { ensureDBConnection } from "../../../../lib/mongodb";

export class VitelisSalesRepository {
  static async create(
    data: Partial<IVitelisSalesAnalyze>
  ): Promise<IVitelisSalesAnalyze> {
    await ensureDBConnection();
    const analyze = new VitelisSalesAnalyze(data);
    return analyze.save();
  }

  static async findById(id: string): Promise<IVitelisSalesAnalyze | null> {
    await ensureDBConnection();
    return (VitelisSalesAnalyze as any).findById(id).exec();
  }

  static async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: IVitelisSalesAnalyze[];
    total: number;
    page: number;
    limit: number;
  }> {
    await ensureDBConnection();
    const skip = (page - 1) * limit;

    let query = {};
    if (userId !== "all") {
      query = { user: userId };
    }

    const total = await (VitelisSalesAnalyze as any).countDocuments(query);
    let dbQuery = (VitelisSalesAnalyze as any)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (userId === "all") {
      dbQuery = dbQuery.populate("user", "firstName lastName email");
    }

    const data = await dbQuery.exec();
    return { data, total, page, limit };
  }

  static async updateById(
    id: string,
    data: Partial<IVitelisSalesAnalyze>
  ): Promise<IVitelisSalesAnalyze | null> {
    await ensureDBConnection();
    return (VitelisSalesAnalyze as any)
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  static async deleteById(id: string): Promise<boolean> {
    await ensureDBConnection();
    const result = await (VitelisSalesAnalyze as any).findByIdAndDelete(id).exec();
    return !!result;
  }

  static async findByExecutionId(
    executionId: string
  ): Promise<IVitelisSalesAnalyze | null> {
    await ensureDBConnection();
    return (VitelisSalesAnalyze as any).findOne({ executionId }).exec();
  }

  static async updateByExecutionId(
    executionId: string,
    data: Partial<IVitelisSalesAnalyze>
  ): Promise<IVitelisSalesAnalyze | null> {
    await ensureDBConnection();
    return (VitelisSalesAnalyze as any).findOneAndUpdate(
      { executionId: executionId.toString() },
      { $set: data },
      { new: true, runValidators: true }
    );
  }
}
