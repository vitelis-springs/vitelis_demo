import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.S3_ENDPOINT_URL ? { endpoint: process.env.S3_ENDPOINT_URL, forcePathStyle: true } : {}),
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

const PRESIGNED_TTL = parseInt(process.env.S3_PRESIGNED_TTL || '3600', 10);

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export class AWSS3Service {
  private static generateKey(originalName: string, folder: string = 'uploads'): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${folder}/${timestamp}-${randomString}.${extension}`;
  }

  private static buildUrl(key: string): string {
    if (process.env.S3_ENDPOINT_URL) {
      return `${process.env.S3_ENDPOINT_URL}/${BUCKET_NAME}/${key}`;
    }
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    const key = this.generateKey(originalName, folder);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000',
    });

    await s3Client.send(command);

    const url = this.buildUrl(key);
    console.log('✅ S3: File uploaded successfully:', { key, url });

    return { url, key, bucket: BUCKET_NAME };
  }

  static async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    await s3Client.send(command);
    console.log('✅ S3: File deleted successfully:', { key });
  }

  static async getPresignedUrl(key: string, expiresIn: number = PRESIGNED_TTL): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  static isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_REGION
    );
  }
}

export default AWSS3Service;