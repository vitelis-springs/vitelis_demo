import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeService, AnalyzeData } from '../../../../services/analyzeService';
import { connectToDatabase } from '../../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { companyName, businessLine, country, useCase, timeline, userId } = body;

    // Validate required fields
    if (!companyName || !businessLine || !country || !useCase || !timeline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analyzeData: AnalyzeData = {
      companyName,
      businessLine,
      country,
      useCase,
      timeline,
      userId
    };

    const analyze = await AnalyzeService.createAnalyze(analyzeData);

    return NextResponse.json({
      success: true,
      data: analyze
    });

  } catch (error) {
    console.error('Error in analyze POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (id) {
      // Get specific analyze record
      const analyze = await AnalyzeService.getAnalyzeById(id);
      if (!analyze) {
        return NextResponse.json(
          { error: 'Analyze record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: analyze });
    }

    if (userId) {
      // Get analyzes for specific user
      const analyzes = await AnalyzeService.getAnalyzesByUser(userId);
      return NextResponse.json({ success: true, data: analyzes });
    }

    // Get all analyzes (for admin purposes)
    const analyzes = await AnalyzeService.getAllAnalyzes();
    return NextResponse.json({ success: true, data: analyzes });

  } catch (error) {
    console.error('Error in analyze GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing analyze ID' },
        { status: 400 }
      );
    }

    const success = await AnalyzeService.deleteAnalyze(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Analyze record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in analyze DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
