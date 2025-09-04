'use client';

import React, { useState, useRef } from 'react';
import { Button, Upload as AntUpload, message, Image, Modal } from 'antd';
import { useUpload } from '../../hooks/useUpload';

// Import icons with fallbacks
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  maxSize?: number; // in MB
  accept?: string[];
  disabled?: boolean;
  showPreview?: boolean;
  placeholder?: string;
}

const { Dragger } = AntUpload;

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'uploads',
  maxSize = 10,
  accept = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  showPreview = true,
  placeholder = 'Click or drag image to upload',
}: ImageUploadProps) {
  // Validate props
  if (!accept || !Array.isArray(accept)) {
    console.error('ImageUpload: accept prop must be an array');
    return null;
  }
  const { uploadFile, isUploading } = useUpload();
  const [previewVisible, setPreviewVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      message.error(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Validate file type
    if (!accept.includes(file.type)) {
      message.error(`File type not supported. Allowed: ${accept.join(', ')}`);
      return false;
    }

    try {
      const result = await uploadFile(file, folder);
      if (result && onChange) {
        onChange(result.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }

    return false; // Prevent default upload behavior
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: accept.join(','),
    beforeUpload: handleUpload,
    showUploadList: false,
    disabled: disabled || isUploading,
  };

  const renderUploadArea = () => (
    <div
      style={{
        border: '2px dashed #d9d9d9',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        // background: '#fafafa',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <PlusOutlined style={{ fontSize: '24px', color: '#999', marginBottom: '8px' }} />
      <div style={{ color: '#666' }}>{placeholder}</div>
      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
        Max size: {maxSize}MB | Supported: {accept.map(type => type.split('/')[1]).join(', ')}
      </div>
    </div>
  );

  const renderImagePreview = () => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Image
        src={value}
        alt="Uploaded image"
        style={{
          width: '100px',
          height: '100px',
          objectFit: 'cover',
          borderRadius: '8px',
        }}
        preview={false}
      />
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          display: 'flex',
          gap: '4px',
        }}
      >
        {showPreview && (
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: 'none',
              minWidth: 'auto',
              height: '24px',
            }}
          />
        )}
        {onRemove && (
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={handleRemove}
            style={{
              background: 'rgba(255, 0, 0, 0.6)',
              color: 'white',
              border: 'none',
              minWidth: 'auto',
              height: '24px',
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Hidden file input for click handling */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
      />

      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {renderImagePreview()}
          <div>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              loading={isUploading}
            >
              Change Image
            </Button>
            {onRemove && (
              <Button
                type="text"
                danger
                              icon={<DeleteOutlined />}
              onClick={handleRemove}
              style={{ marginLeft: '8px' }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {renderUploadArea()}
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              loading={isUploading}
            >
              Select Image
            </Button>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="auto"
        centered
      >
        <Image
          src={value}
          alt="Image preview"
          style={{ maxWidth: '100%', maxHeight: '80vh' }}
        />
      </Modal>
    </div>
  );
}
