import { NextRequest, NextResponse } from 'next/server';
import { InitServiceServer } from '../../server/services/initService.server';

// Global flag to ensure initialization runs only once
let hasInitialized = false;

export async function GET(request: NextRequest) {
  try {
    if (hasInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Already initialized',
        initialized: true
      });
    }

    console.log('🚀 STARTUP API: Server starting, running initialization...');
    
    // Run initialization
    await InitServiceServer.initializeDatabase();
    
    hasInitialized = true;
    
    console.log('✅ STARTUP API: Server initialization completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Initialization completed successfully',
      initialized: true
    });
    
  } catch (error) {
    console.error('❌ STARTUP API: Initialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Initialization failed' },
      { status: 500 }
    );
  }
}
