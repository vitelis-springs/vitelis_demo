import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Analyze from '../../../server/models/Analyze';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Parse the request body
    const body = await request.json();
    const { executionId, step } = body;

    // Validate required fields
    if (!executionId || step === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: executionId and step'
      }, { status: 200 });
    }

    // Validate step is a number
    if (typeof step !== 'number' || step < 0) {
      return NextResponse.json({
        success: false,
        error: 'Step must be a non-negative number'
      }, { status: 200 });
    }

    // Find and update the analyze record by executionId
    const updatedAnalyze = await Analyze.findOneAndUpdate(
      { executionId: executionId.toString() },
      { 
        executionStep: step,
        executionStatus: step > 0 ? 'inProgress' : 'started'
      },
      { 
        new: true, // Return the updated document
        runValidators: true 
      }
    );

    if (!updatedAnalyze) {
      return NextResponse.json({
        success: false,
        error: 'Analyze record not found with the provided executionId'
      }, { status: 200 });
    }

    console.log(`✅ Webhook: Updated executionStep to ${step} for executionId: ${executionId}`);

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        executionId: updatedAnalyze.executionId,
        executionStep: updatedAnalyze.executionStep,
        executionStatus: updatedAnalyze.executionStatus
      }
    });

  } catch (error) {
    console.error('❌ Webhook progress error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}
