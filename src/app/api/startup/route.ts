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

    
    // Run initialization
    await InitServiceServer.initializeDatabase();
    
    hasInitialized = true;
    
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
