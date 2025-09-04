import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export class AWSS3Service {
  /**
   * Generate a unique key for the uploaded file
   */
  private static generateKey(originalName: string, folder: string = 'uploads'): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${folder}/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Upload a file buffer to S3
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    try {
      const key = this.generateKey(originalName, folder);
      
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000', // Cache for 1 year
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      
      console.log('✅ S3: File uploaded successfully:', { key, url });
      
      return {
        url,
        key,
        bucket: BUCKET_NAME,
      };
    } catch (error) {
      console.error('❌ S3: Error uploading file:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      
      console.log('✅ S3: File deleted successfully:', { key });
    } catch (error) {
      console.error('❌ S3: Error deleting file:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Check if S3 is properly configured
   */
  static isConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && 
              process.env.AWS_SECRET_ACCESS_KEY && 
              process.env.AWS_S3_BUCKET && 
              process.env.AWS_REGION);
  }
}

export default AWSS3Service;
