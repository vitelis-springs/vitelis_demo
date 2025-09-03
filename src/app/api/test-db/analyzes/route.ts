import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../lib/mongodb';
import Analyze from '../../../server/models/Analyze';

export async function GET(request: NextRequest) {
  try {
    await ensureDBConnection();
    
    // Get all analyze records
    const analyzes = await Analyze.find({}).lean();
    
    console.log('🔍 Test DB: Found analyzes:', analyzes.length);
    console.log('🔍 Test DB: Analyzes data:', analyzes);
    
    return NextResponse.json({
      success: true,
      count: analyzes.length,
      analyzes: analyzes.map(analyze => ({
        _id: analyze._id,
        companyName: analyze.companyName,
        user: analyze.user,
        status: analyze.status,
        createdAt: analyze.createdAt,
        updatedAt: analyze.updatedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Test DB: Error fetching analyzes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analyzes' },
      { status: 500 }
    );
  }
}


