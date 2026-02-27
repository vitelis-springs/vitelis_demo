import { NextRequest, NextResponse } from 'next/server';
import { AWSS3Service } from '../../../../lib/aws-s3';

export async function POST(request: NextRequest) {
  try {
    if (!AWSS3Service.isConfigured()) {
      return NextResponse.json({ error: 'S3 service not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { key, expiresIn } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 });
    }

    const presignedUrl = await AWSS3Service.getPresignedUrl(key, expiresIn);

    return NextResponse.json({ presignedUrl, expiresIn: expiresIn ?? 3600 });
  } catch (error) {
    console.error('❌ Presigned URL: Error generating URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
