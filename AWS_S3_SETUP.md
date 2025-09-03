# AWS S3 Image Upload Service

This project includes a complete AWS S3 service for uploading images and returning URLs.

## 🚀 Features

- **Direct S3 Uploads** - Upload images directly to AWS S3
- **Presigned URLs** - Generate presigned URLs for client-side uploads
- **Image Validation** - File size and type validation
- **React Components** - Ready-to-use image upload components
- **Automatic URL Generation** - Returns public URLs for uploaded images

## 🔧 Setup

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
```

### 2. AWS S3 Bucket Configuration

1. **Create S3 Bucket** in your AWS Console
2. **Set Bucket Policy** for public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

3. **Enable CORS** for your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 📁 File Structure

```
src/
├── lib/
│   └── aws-s3.ts          # AWS S3 service class
├── hooks/
│   └── useUpload.ts        # React hook for uploads
├── components/ui/
│   └── image-upload.tsx    # Reusable image upload component
└── app/api/
    └── upload/
        └── route.ts        # Upload API endpoints
```

## 🎯 Usage

### 1. Basic Upload Hook

```tsx
import { useUpload } from '../hooks/useUpload';

function MyComponent() {
  const { uploadFile, isUploading } = useUpload();

  const handleFileUpload = async (file: File) => {
    const result = await uploadFile(file, 'my-folder');
    if (result) {
      console.log('Uploaded URL:', result.url);
      console.log('S3 Key:', result.key);
    }
  };

  return (
    <input 
      type="file" 
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }}
    />
  );
}
```

### 2. Image Upload Component

```tsx
import ImageUpload from '../components/ui/image-upload';

function MyForm() {
  const [logoUrl, setLogoUrl] = useState('');

  return (
    <ImageUpload
      value={logoUrl}
      onChange={setLogoUrl}
      folder="company-logos"
      maxSize={5} // 5MB
      placeholder="Upload company logo"
    />
  );
}
```

### 3. Direct S3 Service

```tsx
import { AWSS3Service } from '../lib/aws-s3';

// Upload file
const result = await AWSS3Service.uploadFile(
  fileBuffer,
  'image.jpg',
  'image/jpeg',
  'uploads'
);

// Generate presigned URL
const presignedUrl = await AWSS3Service.generatePresignedUrl(
  'image.jpg',
  'image/jpeg',
  'uploads'
);

// Delete file
await AWSS3Service.deleteFile('uploads/123-image.jpg');
```

## 🔌 API Endpoints

### POST /api/upload
Upload a file to S3 via the server.

**Request:**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'uploads');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/uploads/123-image.jpg",
    "key": "uploads/123-image.jpg",
    "bucket": "your-bucket-name"
  }
}
```

### GET /api/upload
Get a presigned URL for direct S3 upload.

**Request:**
```
GET /api/upload?fileName=image.jpg&contentType=image/jpeg&folder=uploads
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "key": "uploads/123-image.jpg",
    "bucket": "your-bucket-name"
  }
}
```

## 🎨 Component Props

### ImageUpload Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current image URL |
| `onChange` | `(url: string) => void` | - | Called when image is uploaded |
| `onRemove` | `() => void` | - | Called when image is removed |
| `folder` | `string` | `'uploads'` | S3 folder path |
| `maxSize` | `number` | `10` | Max file size in MB |
| `accept` | `string[]` | `['image/*']` | Allowed file types |
| `disabled` | `boolean` | `false` | Disable upload |
| `showPreview` | `boolean` | `true` | Show preview button |
| `placeholder` | `string` | `'Click or drag image to upload'` | Upload area text |

## 🔒 Security Features

- **File Type Validation** - Only allows image files
- **File Size Limits** - Configurable maximum file size
- **Unique File Names** - Prevents filename conflicts
- **Public Read Access** - Images are publicly accessible
- **Caching Headers** - Optimized for web delivery

## 🚨 Error Handling

The service includes comprehensive error handling:

- **S3 Configuration Errors** - Checks for required environment variables
- **File Validation Errors** - Size and type validation
- **Upload Failures** - Network and S3 errors
- **User Feedback** - Success/error messages via Ant Design

## 📱 Mobile Support

- **Touch-friendly** upload areas
- **Responsive design** for all screen sizes
- **Drag & drop** support for desktop
- **File picker** for mobile devices

## 🔄 Performance

- **Direct S3 uploads** - No server storage needed
- **CDN ready** - S3 URLs work with CloudFront
- **Lazy loading** - Images load only when needed
- **Optimized thumbnails** - Preview images are optimized

## 🧪 Testing

Test the service with:

1. **Valid images** (JPEG, PNG, GIF, WebP)
2. **File size limits** (try files > 10MB)
3. **Invalid file types** (try non-image files)
4. **Network errors** (disconnect internet)
5. **S3 errors** (invalid credentials)

## 🆘 Troubleshooting

### Common Issues

1. **"S3 service not configured"** - Check environment variables
2. **"Access denied"** - Verify S3 bucket permissions
3. **"Invalid file type"** - Check file extension and MIME type
4. **"File too large"** - Reduce file size or increase limit

### Debug Mode

Enable debug logging by checking console output:
- ✅ S3: File uploaded successfully
- ❌ S3: Error uploading file
- 🔍 Upload API: File uploaded successfully
