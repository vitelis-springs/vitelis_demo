import { NextRequest, NextResponse } from 'next/server';
import { AWSS3Service } from '../../../lib/aws-s3';

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
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only images are allowed.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const result = await AWSS3Service.uploadFile(
      fileBuffer,
      file.name,
      file.type,
      folder
    );

    console.log('✅ Upload API: File uploaded successfully:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Upload API: Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload file' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if S3 is configured
    if (!AWSS3Service.isConfigured()) {
      return NextResponse.json({ 
        success: false, 
        error: 'S3 service not configured' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    const folder = searchParams.get('folder') || 'uploads';

    if (!fileName || !contentType) {
      return NextResponse.json({ 
        success: false, 
        error: 'fileName and contentType are required' 
      }, { status: 400 });
    }

    // Generate presigned URL for direct upload
    const result = await AWSS3Service.generatePresignedUrl(fileName, contentType, folder);

    console.log('✅ Upload API: Presigned URL generated:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Upload API: Error generating presigned URL:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate presigned URL' 
    }, { status: 500 });
  }
}
