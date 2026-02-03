import { UserService, type AuthResponse } from '../user/user.service';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  companyName: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
}

export class AuthService {
  static async login(data: LoginData): Promise<AuthResponse> {
    return UserService.authenticateUser(data);
  }

  static async register(data: RegisterData) {
    const user = await UserService.createUser({
      ...data,
      role: 'user',
    });

    return {
      _id: user._id,
      email: user.email,
      companyName: user.companyName,
      logo: user.logo,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
