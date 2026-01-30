import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type IUser } from '../../models/User';
import { UserRepository } from './user.repository';

export interface CreateUserData {
  email: string;
  password: string;
  companyName?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin';
  usercases?: string[];
  credits?: number;
}

export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    companyName?: string;
    logo?: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: boolean;
  };
  token: string;
}

export class UserService {
  // ── User CRUD ──────────────────────────────────────

  static async createUser(data: CreateUserData): Promise<IUser> {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return UserRepository.create({
      ...data,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role || 'user',
      isActive: true,
    } as Partial<IUser>);
  }

  static async authenticateUser(loginData: { email: string; password: string }): Promise<AuthResponse> {
    const user = await UserRepository.findByEmailWithPassword(loginData.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const userId = String(user._id);
    await UserRepository.updateLastLogin(userId);

    const token = jwt.sign(
      { userId, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return {
      user: {
        _id: userId,
        email: user.email,
        companyName: user.companyName,
        logo: user.logo,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    };
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return UserRepository.findById(userId);
  }

  static async getUserByEmail(email: string): Promise<IUser | null> {
    return UserRepository.findByEmail(email);
  }

  static async updateUser(userId: string, data: Partial<CreateUserData>): Promise<IUser | null> {
    const updateData: Partial<IUser> = { ...data } as Partial<IUser>;

    if (data.password) {
      (updateData as any).password = await bcrypt.hash(data.password, 12);
    }

    return UserRepository.updateById(userId, updateData);
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const result = await UserRepository.deleteById(userId);
    return !!result;
  }

  static async getAllUsers(): Promise<IUser[]> {
    return UserRepository.findAll();
  }

  // ── Credits ────────────────────────────────────────

  static async deductCredits(userId: string, amount: number): Promise<boolean> {
    const user = await UserRepository.findByIdSelectCredits(userId);
    if (!user) {
      console.error('❌ UserService: User not found:', userId);
      return false;
    }

    const currentCredits = user.credits ?? 0;
    if (currentCredits < amount) {
      console.warn('⚠️ UserService: Insufficient credits:', { userId, currentCredits, requestedAmount: amount });
      return false;
    }

    await UserRepository.updateCredits(userId, currentCredits - amount);
    return true;
  }

  static async addCredits(userId: string, amount: number): Promise<boolean> {
    const user = await UserRepository.findByIdSelectCredits(userId);
    if (!user) {
      console.error('❌ UserService: User not found:', userId);
      return false;
    }

    const currentCredits = user.credits ?? 0;
    await UserRepository.updateCredits(userId, currentCredits + amount);
    return true;
  }

  static async getUserCredits(userId: string): Promise<number> {
    const user = await UserRepository.findByIdSelectCredits(userId);
    if (!user) return 0;
    return user.credits ?? 0;
  }

  static async hasEnoughCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);
    return currentCredits >= requiredAmount;
  }

  static async setCredits(userId: string, amount: number): Promise<boolean> {
    const result = await UserRepository.updateCredits(userId, amount);
    return !!result;
  }

  static async handleStatusChangeRefund(
    userId: string,
    oldStatus: string | undefined,
    newStatus: string | undefined
  ): Promise<boolean> {
    const user = await UserRepository.findByIdSelectCredits(userId);
    if (!user || user.role !== 'user') return false;

    if (oldStatus === 'inProgress' && newStatus === 'error') {
      console.log('💰 UserService: Status changed from progress to error, refunding 1 credit to user:', userId);
      return this.addCredits(userId, 1);
    }

    return false;
  }
}
