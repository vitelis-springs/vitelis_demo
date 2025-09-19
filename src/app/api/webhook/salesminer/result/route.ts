import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../../lib/mongodb';
import SalesMinerAnalyze from '../../../../server/models/SalesMinerAnalyze';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await ensureDBConnection();

    // Parse the request body
    const body = await request.json();
    console.log('📥 SalesMiner Webhook Result: Received body:', body);
    
    const { executionId, data, summary, improvementLeverages, headToHead, sources } = body;
    console.log('📥 SalesMiner Webhook Result: Parsed data:', { executionId, data, summary, improvementLeverages, headToHead, sources });

    // Validate required fields
    if (!executionId || data === undefined) {
      console.log('❌ SalesMiner Webhook Result: Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: executionId and data'
      }, { status: 200 });
    }

    // Find and update the SalesMiner analyze record by executionId
    console.log('🔄 SalesMiner Webhook Result: Updating SalesMiner analyze record with:', {
      executionId: executionId.toString(),
      resultText: data,
      summary,
      improvementLeverages,
      headToHead,
      sources,
      executionStatus: 'finished',
      status: 'finished'
    });
    
    // Find the record first
    const salesMinerAnalyzeRecord = await (SalesMinerAnalyze as any).findOne({ executionId: executionId.toString() });

    if (!salesMinerAnalyzeRecord) {
      return NextResponse.json({
        success: false,
        error: 'SalesMiner analyze record not found with the provided executionId'
      }, { status: 200 });
    }

    console.log('🔄 SalesMiner Webhook Result: Found record before update:', salesMinerAnalyzeRecord);

    // Update the fields
    salesMinerAnalyzeRecord.resultText = data;
    salesMinerAnalyzeRecord.summary = summary;
    salesMinerAnalyzeRecord.improvementLeverages = improvementLeverages;
    salesMinerAnalyzeRecord.headToHead = headToHead;
    salesMinerAnalyzeRecord.sources = sources;
    salesMinerAnalyzeRecord.executionStatus = 'finished';
    salesMinerAnalyzeRecord.status = 'finished';

    // Save the updated record
    const updatedSalesMinerAnalyze = await salesMinerAnalyzeRecord.save();

    console.log('🔄 SalesMiner Webhook Result: Save operation result:', updatedSalesMinerAnalyze);

    console.log(`✅ SalesMiner Webhook Result: Updated resultText for executionId: ${executionId}`);
    console.log('📤 SalesMiner Webhook Result: Final updated SalesMiner analyze record:', updatedSalesMinerAnalyze);
    console.log('📤 SalesMiner Webhook Result: resultText field value:', updatedSalesMinerAnalyze.resultText);
    console.log('📤 SalesMiner Webhook Result: All fields in updated record:', Object.keys(updatedSalesMinerAnalyze.toObject()));

    return NextResponse.json({
      success: true,
      message: 'SalesMiner result updated successfully',
      data: {
        executionId: updatedSalesMinerAnalyze.executionId,
        resultText: updatedSalesMinerAnalyze.resultText,
        summary: updatedSalesMinerAnalyze.summary,
        improvementLeverages: updatedSalesMinerAnalyze.improvementLeverages,
        headToHead: updatedSalesMinerAnalyze.headToHead,
        sources: updatedSalesMinerAnalyze.sources,
        executionStatus: updatedSalesMinerAnalyze.executionStatus,
        status: updatedSalesMinerAnalyze.status
      }
    });

  } catch (error) {
    console.error('❌ SalesMiner webhook result error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}



