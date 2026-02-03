import User, { type IUser } from '../../models/User';
import { ensureDBConnection } from '../../../../lib/mongodb';

export class UserRepository {
  static async findById(id: string): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findById(id).select('-password').lean();
  }

  static async findByIdWithPassword(id: string): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findById(id).lean();
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findOne({ email: email.toLowerCase() }).select('-password').lean();
  }

  static async findByEmailWithPassword(email: string): Promise<IUser | null> {
    await ensureDBConnection();
    return User.findOne({ email: email.toLowerCase() });
  }

  static async findAll(): Promise<IUser[]> {
    await ensureDBConnection();
    return (User as any).find({}).select('-password').lean();
  }

  static async create(data: Partial<IUser>): Promise<IUser> {
    await ensureDBConnection();
    const user = new User(data);
    return user.save();
  }

  static async updateById(id: string, data: Partial<IUser>): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).select('-password');
  }

  static async deleteById(id: string): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findByIdAndDelete(id);
  }

  static async updateCredits(id: string, credits: number): Promise<IUser | null> {
    await ensureDBConnection();
    return (User as any).findByIdAndUpdate(id, { credits }, { new: true }).select('-password');
  }

  static async findByIdSelectCredits(id: string): Promise<{ _id: any; credits?: number; role: string } | null> {
    await ensureDBConnection();
    return (User as any).findById(id).select('credits role').lean();
  }

  static async updateLastLogin(id: string): Promise<void> {
    await ensureDBConnection();
    await (User as any).findByIdAndUpdate(id, { lastLogin: new Date() });
  }
}
