import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../../lib/mongodb';
import SalesMinerAnalyze from '../../../../server/models/SalesMinerAnalyze';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await ensureDBConnection();

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

    // Find and update the SalesMiner analyze record by executionId
    const updatedSalesMinerAnalyze = await SalesMinerAnalyze.findOneAndUpdate(
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

    if (!updatedSalesMinerAnalyze) {
      return NextResponse.json({
        success: false,
        error: 'SalesMiner analyze record not found with the provided executionId'
      }, { status: 200 });
    }

    console.log(`✅ SalesMiner Webhook: Updated executionStep to ${step} for executionId: ${executionId}`);

    return NextResponse.json({
      success: true,
      message: 'SalesMiner progress updated successfully',
      data: {
        executionId: updatedSalesMinerAnalyze.executionId,
        executionStep: updatedSalesMinerAnalyze.executionStep,
        executionStatus: updatedSalesMinerAnalyze.executionStatus
      }
    });

  } catch (error) {
    console.error('❌ SalesMiner webhook progress error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}



