import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeServiceServer } from '../../server/services/analyzeService.server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    console.log('🔍 API: GET request received with params:', { id, userId });
    console.log('🔍 API: Request headers:', Object.fromEntries(request.headers.entries()));

    if (id) {
      // Get specific analyze by ID
      const analyze = await AnalyzeServiceServer.getAnalyzeById(id);
      if (!analyze) {
        return NextResponse.json(
          { success: false, message: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: analyze });
    }

    if (userId) {
      // Get all analyzes for a user
      console.log('👤 API: Fetching analyzes for user:', userId);
      const analyzes = await AnalyzeServiceServer.getAnalyzesByUser(userId);
      console.log('📊 API: Found analyzes:', analyzes.length);
      return NextResponse.json({ success: true, data: analyzes });
    }

    // Get all analyzes (admin)
    const analyzes = await AnalyzeServiceServer.getAllAnalyzes();
    return NextResponse.json({ success: true, data: analyzes });

  } catch (error) {
    console.error('Error in GET /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 API: POST request received');
    const body = await request.json();
    const { analyzeId, ...data } = body;
    console.log('📝 API: Request body parsed:', { analyzeId, data });

    if (analyzeId) {
      // Update existing analyze
      console.log('🔄 API: Updating analyze with ID:', analyzeId);
      const updatedAnalyze = await AnalyzeServiceServer.updateAnalyze(analyzeId, data);
      console.log('📥 API: Update result from service:', updatedAnalyze);
      
      if (!updatedAnalyze) {
        console.log('❌ API: Analyze record not found');
        return NextResponse.json(
          { success: false, message: 'Analyze record not found' },
          { status: 404 }
        );
      }
      console.log('✅ API: Update successful, returning:', updatedAnalyze);
      return NextResponse.json({ success: true, data: updatedAnalyze });
    } else {
      // Create new analyze
      console.log('🆕 API: Creating new analyze');
      const newAnalyze = await AnalyzeServiceServer.createAnalyze(data);
      return NextResponse.json({ success: true, data: newAnalyze });
    }

  } catch (error) {
    console.error('Error in POST /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = await AnalyzeServiceServer.deleteAnalyze(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Analyze record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Analyze record deleted' });

  } catch (error) {
    console.error('Error in DELETE /api/analyze:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
