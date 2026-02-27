import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.S3_ENDPOINT_URL
    ? { endpoint: process.env.S3_ENDPOINT_URL, forcePathStyle: true }
    : {}),
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    const contentType = response.ContentType || 'application/octet-stream';
    const bytes = await response.Body.transformToByteArray();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('❌ S3 proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch object' }, { status: 500 });
  }
}
