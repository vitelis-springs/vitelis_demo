import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeServiceServer } from '../../server/services/analyzeService.server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

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
      const analyzes = await AnalyzeServiceServer.getAnalyzesByUser(userId);
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
    const body = await request.json();
    const { analyzeId, ...data } = body;

    if (analyzeId) {
      // Update existing analyze
      const updatedAnalyze = await AnalyzeServiceServer.updateAnalyze(analyzeId, data);
      if (!updatedAnalyze) {
        return NextResponse.json(
          { success: false, message: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updatedAnalyze });
    } else {
      // Create new analyze
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
