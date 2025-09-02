import { InitServiceServer } from './server/services/initService.server';

// Initialize database and root user on app startup
export async function initializeApp() {
  try {
    console.log('🚀 Initializing application...');
    await InitServiceServer.initializeDatabase();
    console.log('✅ Application initialization completed');
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    // Don't throw error to prevent app from crashing
    // Just log the error and continue
  }
}

// Run initialization when this module is imported
if (typeof window === 'undefined') {
  // Only run on server side
  initializeApp().catch(console.error);
}
