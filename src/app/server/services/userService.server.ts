import User, { IUser } from '../models/User';
import { ensureDBConnection } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';

export interface CreateUserData {
  email: string;
  password: string;
  companyName?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin';
}

export interface UserLoginData {
  email: string;
  password: string;
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

export class UserServiceServer {
  // Create a new user with hashed password
  static async createUser(data: CreateUserData): Promise<IUser> {
    try {
      await ensureDBConnection();
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user with plain password
      const userData = {
        ...data,
        email: data.email.toLowerCase(),
        password: data.password,
        role: data.role || 'user',
        isActive: true
      };

      const user = new User(userData);
      return await user.save();
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Authenticate user and return JWT token
  static async authenticateUser(loginData: UserLoginData): Promise<AuthResponse> {
    try {
      console.log('🔐 UserService: Starting authentication for email:', loginData.email);
      console.log('🔐 UserService: Input password length:', loginData.password?.length || 0);
      console.log('🔐 UserService: Input password preview:', loginData.password?.substring(0, 3) + '...');
      
      await ensureDBConnection();
      console.log('🔐 UserService: Database connection established');
      
      // Find user by email
      console.log('🔐 UserService: Searching for user with email:', loginData.email.toLowerCase());
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      
      if (!user) {
        console.log('❌ UserService: User not found in database');
        throw new Error('Invalid credentials');
      }
      
      console.log('✅ UserService: User found in database');
      console.log('🔐 UserService: User details:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        storedPasswordLength: user.password?.length || 0,
        storedPasswordPreview: user.password?.substring(0, 3) + '...'
      });

      // Check if user is active
      if (!user.isActive) {
        console.log('❌ UserService: User account is deactivated');
        throw new Error('User account is deactivated');
      }
      console.log('✅ UserService: User account is active');

      // Verify password (plain text comparison)
      console.log('🔐 UserService: Starting password verification...');
      console.log('🔐 UserService: Input password:', JSON.stringify(loginData.password));
      console.log('🔐 UserService: Stored password:', JSON.stringify(user.password));
      console.log('🔐 UserService: Password types - Input:', typeof loginData.password, 'Stored:', typeof user.password);
      
      const isPasswordValid = loginData.password === user.password;
      console.log('🔐 UserService: Password verification result:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('❌ UserService: Password verification failed');
        console.log('🔐 UserService: Password mismatch details:', {
          inputPassword: loginData.password,
          storedPassword: user.password,
          inputLength: loginData.password?.length,
          storedLength: user.password?.length,
          exactMatch: loginData.password === user.password,
          trimmedMatch: loginData.password?.trim() === user.password?.trim()
        });
        throw new Error('Invalid credentials');
      }
      
      console.log('✅ UserService: Password verification successful');

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      // Return user data and token
      return {
        user: {
          _id: user._id.toString(),
          email: user.email,
          companyName: user.companyName,
          logo: user.logo,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive
        },
        token
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw new Error('Authentication failed');
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<IUser | null> {
    try {
      await ensureDBConnection();
      return await User.findById(userId).select('-password');
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      await ensureDBConnection();
      return await User.findOne({ email: email.toLowerCase() });
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user');
    }
  }

  // Update user
  static async updateUser(userId: string, data: Partial<CreateUserData>): Promise<IUser | null> {
    try {
      await ensureDBConnection();
      
      const updateData: any = { ...data };
      
      // Update password if it's being updated (plain text)
      if (data.password) {
        updateData.password = data.password;
      }

      return await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).select('-password');
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Delete user
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      await ensureDBConnection();
      const result = await User.findByIdAndDelete(userId);
      return !!result;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }
}
