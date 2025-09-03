import { useState } from 'react';
import { message } from 'antd';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  bucket: string;
}

export const useUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a file directly to S3 via our API
   */
  const uploadFile = async (
    file: File,
    folder: string = 'uploads'
  ): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      message.success('File uploaded successfully!');
      return result.data;
    } catch (error) {
      console.error('Upload error:', error);
      message.error(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Get a presigned URL for direct upload to S3
   */
  const getPresignedUrl = async (
    fileName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<PresignedUrlResult | null> => {
    try {
      const params = new URLSearchParams({
        fileName,
        contentType,
        folder,
      });

      const response = await fetch(`/api/upload?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get upload URL');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      message.error('Failed to get upload URL');
      return null;
    }
  };

  /**
   * Upload file using presigned URL (direct to S3)
   */
  const uploadWithPresignedUrl = async (
    file: File,
    folder: string = 'uploads'
  ): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);

      // Get presigned URL
      const presignedResult = await getPresignedUrl(file.name, file.type, folder);
      if (!presignedResult) {
        throw new Error('Failed to get upload URL');
      }

      // Upload directly to S3
      const uploadResponse = await fetch(presignedResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3');
      }

      // Construct the final URL
      const url = `https://${presignedResult.bucket}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com/${presignedResult.key}`;

      const result: UploadResult = {
        url,
        key: presignedResult.key,
        bucket: presignedResult.bucket,
      };

      message.success('File uploaded successfully!');
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      message.error(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    uploadWithPresignedUrl,
    getPresignedUrl,
    isUploading,
  };
};
