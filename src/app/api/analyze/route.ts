import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeService, AnalyzeData } from '../../../services/analyzeService';
import connectDB from '../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      companyName, 
      businessLine, 
      country, 
      useCase, 
      timeline, 
      userId, 
      status = 'progress',
      currentStep = 0,
      analyzeId 
    } = body;

    // If analyzeId is provided, update existing record
    if (analyzeId) {
      const updateData: Partial<AnalyzeData> = {};
      
      if (companyName !== undefined) updateData.companyName = companyName;
      if (businessLine !== undefined) updateData.businessLine = businessLine;
      if (country !== undefined) updateData.country = country;
      if (useCase !== undefined) updateData.useCase = useCase;
      if (timeline !== undefined) updateData.timeline = timeline;
      if (status !== undefined) updateData.status = status;
      if (currentStep !== undefined) updateData.currentStep = currentStep;

      const analyze = await AnalyzeService.updateAnalyze(analyzeId, updateData);
      
      if (!analyze) {
        return NextResponse.json(
          { error: 'Analyze record not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: analyze
      });
    }

    // Create new record - only require at least one field to be filled
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const analyzeData: AnalyzeData = {
      companyName: companyName || '',
      businessLine: businessLine || '',
      country: country || '',
      useCase: useCase || '',
      timeline: timeline || '',
      userId,
      status,
      currentStep
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
    await connectDB();
    
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
    await connectDB();
    
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
