import { NextRequest, NextResponse } from 'next/server';
import { YamlService } from '../../../server/services/yamlService.server';
import { AWSS3Service } from '../../../../lib/aws-s3';

export async function POST(request: NextRequest) {
  try {
    // Check if S3 is configured
    if (!AWSS3Service.isConfigured()) {
      return NextResponse.json({ 
        success: false, 
        error: 'S3 service not configured' 
      }, { status: 500 });
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'yaml-files';

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // Validate file size
    const maxSize = YamlService.getMaxFileSize();
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` 
      }, { status: 400 });
    }

    // Validate file type
    if (!YamlService.isValidYamlFile(file.name, file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only YAML files (.yaml, .yml) are allowed.' 
      }, { status: 400 });
    }

    console.log(`📥 YAML Upload: Processing file: ${file.name}`);

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload and process YAML file using the service
    const uploadResult = await YamlService.uploadAndProcessYaml(
      fileBuffer,
      file.name,
      file.type || 'application/x-yaml',
      folder
    );

    if (!uploadResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: uploadResult.error 
      }, { status: 400 });
    }

    // Process the YAML for SalesMiner analysis
    const salesMinerProcessingResult = YamlService.processYamlForSalesMiner(
      uploadResult.processingResult?.parsedContent
    );

    console.log('✅ YAML Upload: File uploaded and processed successfully');

    return NextResponse.json({
      success: true,
      message: 'YAML file uploaded and processed successfully',
      data: {
        filename: file.name,
        originalName: file.name,
        size: file.size,
        publicUrl: uploadResult.url,
        s3Key: uploadResult.key,
        bucket: uploadResult.bucket,
        uploadTime: new Date().toISOString(),
        yamlContent: uploadResult.processingResult?.parsedContent,
        processingResult: uploadResult.processingResult,
        salesMinerProcessing: salesMinerProcessingResult,
      }
    });

  } catch (error) {
    console.error('❌ YAML Upload: Error processing file:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process YAML file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
