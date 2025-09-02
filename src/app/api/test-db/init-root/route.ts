import { NextRequest, NextResponse } from 'next/server';
import { InitServiceServer } from '../../../server/services/initService.server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Test DB: Manually triggering root user initialization...');
    
    // Manually trigger root user initialization
    await InitServiceServer.initializeRootUser();
    
    return NextResponse.json({
      success: true,
      message: 'Root user initialization completed'
    });
    
  } catch (error) {
    console.error('❌ Test DB: Error during root user initialization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize root user' },
      { status: 500 }
    );
  }
}
