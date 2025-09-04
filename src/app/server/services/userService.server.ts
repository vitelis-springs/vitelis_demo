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

      console.error('🔐 UserService: CREATING NEW USER...');
      console.error('🔐 UserService: User creation data:', {
        email: userData.email,
        passwordLength: userData.password?.length || 0,
        passwordPreview: userData.password?.substring(0, 3) + '...',
        fullPassword: userData.password,
        role: userData.role,
        isActive: userData.isActive
      });
      console.error('🔐 UserService: Password validation:', {
        hasPassword: !!userData.password,
        passwordType: typeof userData.password,
        passwordNotEmpty: userData.password?.length > 0
      });

      const user = new User(userData);
      const savedUser = await user.save();
      
      console.error('✅ UserService: User created successfully:', {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role
      });
      
      return savedUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Authenticate user and return JWT token
  static async authenticateUser(loginData: UserLoginData): Promise<AuthResponse> {
    try {
      // Force error logging that will show in Vercel
      console.error('🔐 UserService: Starting authentication for email:', loginData.email);
      console.error('🔐 UserService: Input password length:', loginData.password?.length || 0);
      console.error('🔐 UserService: Input password preview:', loginData.password?.substring(0, 3) + '...');
      
      await ensureDBConnection();
      console.error('🔐 UserService: Database connection established');
      
      // Find user by email
      console.error('🔐 UserService: Searching for user with email:', loginData.email.toLowerCase());
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      
      if (!user) {
        console.error('❌ UserService: USER NOT FOUND - Email does not exist in database');
        console.error('🔐 UserService: Searched for email:', loginData.email.toLowerCase());
        console.error('🔐 UserService: Database query result: null');
        throw new Error('User not found in database');
      }
      
      console.error('✅ UserService: USER FOUND - Email exists in database');
      console.error('🔐 UserService: User database record:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        storedPasswordLength: user.password?.length || 0,
        storedPasswordPreview: user.password?.substring(0, 3) + '...',
        fullStoredPassword: user.password
      });

      // Check if user is active
      if (!user.isActive) {
        console.error('❌ UserService: User account is deactivated');
        throw new Error('User account is deactivated');
      }
      console.error('✅ UserService: User account is active');

      // Verify password (plain text comparison)
      console.error('🔐 UserService: STARTING PASSWORD VERIFICATION...');
      console.error('🔐 UserService: Input password from login form:', JSON.stringify(loginData.password));
      console.error('🔐 UserService: Stored password from database:', JSON.stringify(user.password));
      console.error('🔐 UserService: Password data types:', {
        inputType: typeof loginData.password,
        storedType: typeof user.password
      });
      console.error('🔐 UserService: Password lengths:', {
        inputLength: loginData.password?.length || 0,
        storedLength: user.password?.length || 0
      });
      console.error('🔐 UserService: Password content analysis:', {
        inputHasSpaces: loginData.password?.includes(' '),
        storedHasSpaces: user.password?.includes(' '),
        inputTrimmed: loginData.password?.trim(),
        storedTrimmed: user.password?.trim()
      });
      
      const isPasswordValid = loginData.password === user.password;
      console.error('🔐 UserService: PASSWORD COMPARISON RESULT:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.error('❌ UserService: PASSWORD VERIFICATION FAILED - Passwords do not match');
        console.error('🔐 UserService: DETAILED PASSWORD ANALYSIS:', {
          inputPassword: loginData.password,
          storedPassword: user.password,
          inputLength: loginData.password?.length || 0,
          storedLength: user.password?.length || 0,
          exactMatch: loginData.password === user.password,
          trimmedMatch: loginData.password?.trim() === user.password?.trim(),
          inputStartsWithStored: loginData.password?.startsWith(user.password || ''),
          storedStartsWithInput: user.password?.startsWith(loginData.password || '')
        });
        console.error('🔐 UserService: PASSWORD MISMATCH REASON: Input and stored passwords are different');
        throw new Error('Password verification failed - passwords do not match');
      }
      
      console.error('✅ UserService: PASSWORD VERIFICATION SUCCESSFUL - Passwords match exactly');

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
