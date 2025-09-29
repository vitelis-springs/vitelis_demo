import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../../../lib/mongodb';
import SalesMinerAnalyze from '../../../../../server/models/SalesMinerAnalyze';
import { YamlService } from '../../../../../server/services/yamlService.server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Connect to database
    await ensureDBConnection();

    // Get executionId from URL params
    const executionId = params.id;
    console.log('📥 SalesMiner Webhook Result: Processing executionId:', executionId);

    if (!executionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing executionId in URL params'
      }, { status: 400 });
    }

    // Parse form data to get YAML file
    const formData = await request.formData();
    const yamlFile = formData.get('file') as File;

    if (!yamlFile || yamlFile.size === 0) {
      return NextResponse.json({
        success: false,
        error: 'No YAML file provided'
      }, { status: 400 });
    }

    console.log('📥 SalesMiner Webhook Result: Processing YAML file:', yamlFile.name);

    // Validate YAML file
    if (!YamlService.isValidYamlFile(yamlFile.name, yamlFile.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid YAML file type. Only .yaml and .yml files are allowed.'
      }, { status: 400 });
    }

    // Convert file to buffer and upload to S3
    const fileBuffer = Buffer.from(await yamlFile.arrayBuffer());
    const uploadResult = await YamlService.uploadAndProcessYaml(
      fileBuffer,
      yamlFile.name,
      yamlFile.type || 'application/x-yaml',
      'salesminer-yaml-files'
    );

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to upload YAML file: ${uploadResult.error}`
      }, { status: 500 });
    }

    const yamlFileUrl = uploadResult.url;
    console.log('✅ SalesMiner Webhook Result: YAML file uploaded to S3:', yamlFileUrl);

    // Find and update the SalesMiner analyze record by executionId
    console.log('🔄 SalesMiner Webhook Result: Updating SalesMiner analyze record with yamlFile and status finished:', yamlFileUrl);
    
    // Find the record first
    const salesMinerAnalyzeRecord = await (SalesMinerAnalyze as any).findOne({ executionId: executionId.toString() });

    if (!salesMinerAnalyzeRecord) {
      return NextResponse.json({
        success: false,
        error: 'SalesMiner analyze record not found with the provided executionId'
      }, { status: 404 });
    }

    console.log('🔄 SalesMiner Webhook Result: Found record before update:', salesMinerAnalyzeRecord);

    // Update the yamlFile field and set status to finished
    salesMinerAnalyzeRecord.yamlFile = yamlFileUrl;
    salesMinerAnalyzeRecord.status = 'finished';
    salesMinerAnalyzeRecord.executionStatus = 'finished';

    // Save the updated record
    const updatedSalesMinerAnalyze = await salesMinerAnalyzeRecord.save();

    console.log('🔄 SalesMiner Webhook Result: Save operation result:', updatedSalesMinerAnalyze);

    console.log(`✅ SalesMiner Webhook Result: Updated yamlFile and status to finished for executionId: ${executionId}`);
    console.log('📤 SalesMiner Webhook Result: Final updated SalesMiner analyze record:', updatedSalesMinerAnalyze);
    console.log('📤 SalesMiner Webhook Result: yamlFile field value:', updatedSalesMinerAnalyze.yamlFile);
    console.log('📤 SalesMiner Webhook Result: status field value:', updatedSalesMinerAnalyze.status);
    console.log('📤 SalesMiner Webhook Result: executionStatus field value:', updatedSalesMinerAnalyze.executionStatus);

    return NextResponse.json({
      success: true,
      message: 'YAML file uploaded and analysis marked as finished',
      data: {
        executionId: updatedSalesMinerAnalyze.executionId,
        yamlFile: updatedSalesMinerAnalyze.yamlFile,
        status: updatedSalesMinerAnalyze.status,
        executionStatus: updatedSalesMinerAnalyze.executionStatus,
        s3Url: yamlFileUrl
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



