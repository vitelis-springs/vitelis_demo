import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Analyze from '../../../server/models/Analyze';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Parse the request body
    const body = await request.json();
    console.log('📥 Webhook Result: Received body:', body);
    
    const { executionId, data } = body;
    console.log('📥 Webhook Result: Parsed data:', { executionId, data });

    // Validate required fields
    if (!executionId || data === undefined) {
      console.log('❌ Webhook Result: Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: executionId and data'
      }, { status: 200 });
    }

    // Find and update the analyze record by executionId
    console.log('🔄 Webhook Result: Updating analyze record with:', {
      executionId: executionId.toString(),
      resultText: data,
      executionStatus: 'finished',
      status: 'finished'
    });
    
    // Find the record first
    const analyzeRecord = await Analyze.findOne({ executionId: executionId.toString() });

    if (!analyzeRecord) {
      return NextResponse.json({
        success: false,
        error: 'Analyze record not found with the provided executionId'
      }, { status: 200 });
    }

    console.log('🔄 Webhook Result: Found record before update:', analyzeRecord);

    // Update the fields
    analyzeRecord.resultText = data;
    analyzeRecord.executionStatus = 'finished';
    analyzeRecord.status = 'finished';

    // Save the updated record
    const updatedAnalyze = await analyzeRecord.save();

    console.log('🔄 Webhook Result: Save operation result:', updatedAnalyze);

    console.log(`✅ Webhook Result: Updated resultText for executionId: ${executionId}`);
    console.log('📤 Webhook Result: Final updated analyze record:', updatedAnalyze);
    console.log('📤 Webhook Result: resultText field value:', updatedAnalyze.resultText);
    console.log('📤 Webhook Result: All fields in updated record:', Object.keys(updatedAnalyze.toObject()));

    return NextResponse.json({
      success: true,
      message: 'Result updated successfully',
      data: {
        executionId: updatedAnalyze.executionId,
        resultText: updatedAnalyze.resultText,
        executionStatus: updatedAnalyze.executionStatus,
        status: updatedAnalyze.status
      }
    });

  } catch (error) {
    console.error('❌ Webhook result error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}
