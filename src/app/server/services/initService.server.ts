import { ensureDBConnection } from '../../../lib/mongodb';
import { UserServiceServer } from './userService.server';

export class InitServiceServer {
  // Initialize root user on app startup
  static async initializeRootUser(): Promise<void> {
    try {
      await ensureDBConnection();
      
      const rootUserEmail = process.env.ROOT_USER_EMAIL;
      const rootUserPassword = process.env.ROOT_USER_PASSWORD;
      
      if (!rootUserEmail || !rootUserPassword) {
        console.warn('⚠️ Root user environment variables not configured. Skipping root user initialization.');
        return;
      }

      console.log('🔄 Initializing root user...');
      
      // Check if root user already exists
      const existingUser = await UserServiceServer.getUserByEmail(rootUserEmail);
      
      if (existingUser) {
        console.log('✅ Root user already exists, skipping creation.');
        return;
      }

      // Create root user
      const rootUserData = {
        email: rootUserEmail,
        password: rootUserPassword,
        companyName: 'Root Company',
        role: 'admin' as const,
        isActive: true
      };

      const rootUser = await UserServiceServer.createUser(rootUserData);
      console.log('✅ Root user created successfully:', {
        id: rootUser._id,
        email: rootUser.email,
        role: rootUser.role
      });

    } catch (error) {
      console.error('❌ Error initializing root user:', error);
      // Don't throw error to prevent app from crashing
      // Just log the error and continue
    }
  }

  // Initialize database indexes and other startup tasks
  static async initializeDatabase(): Promise<void> {
    try {
      await ensureDBConnection();
      console.log('✅ Database connection established');
      
      // Initialize root user
      await this.initializeRootUser();
      
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
}
