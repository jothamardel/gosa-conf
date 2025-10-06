# ImageKit Integration Guide

This document provides comprehensive information about the ImageKit integration implemented as an alternative to Vercel Blob storage.

## Overview

The ImageKit integration provides:
- **File Upload Management**: Server-side and client-side upload capabilities
- **Image Optimization**: Automatic image optimization and transformation
- **CDN Delivery**: Fast global content delivery
- **Storage Management**: Organized file storage with folders and tags
- **Fallback Support**: Automatic fallback to Vercel Blob if ImageKit fails

## Architecture

### Core Components

1. **ImageKitService** (`lib/services/imagekit.service.ts`)
   - Core ImageKit SDK wrapper
   - Handles authentication and file operations
   - Provides upload, delete, and URL generation methods

2. **StorageService** (`lib/services/storage.service.ts`)
   - Unified storage interface
   - Supports both ImageKit and Vercel Blob
   - Automatic provider switching and fallback

3. **ImageKitUploader** (`components/upload/ImageKitUploader.tsx`)
   - React component for file uploads
   - Drag-and-drop interface
   - Progress tracking and error handling

4. **useImageKitUpload** (`lib/hooks/useImageKitUpload.ts`)
   - React hook for upload functionality
   - State management and progress tracking
   - Authentication parameter generation

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Storage Provider Selection
STORAGE_PROVIDER=imagekit
```

### 2. ImageKit Account Setup

1. Create an account at [ImageKit.io](https://imagekit.io)
2. Get your credentials from the Developer section:
   - Public Key
   - Private Key
   - URL Endpoint
3. Configure your ImageKit settings:
   - Enable file upload
   - Set up folder structure
   - Configure transformation presets

### 3. Folder Structure

The integration uses the following folder structure:

```
/gosa-convention/
├── receipts/          # PDF receipts
├── images/            # Image receipts
├── badges/            # Convention badges
├── demo/              # Demo uploads
└── general/           # General uploads
```

## API Endpoints

### Authentication
- `GET /api/v1/imagekit/auth` - Generate authentication parameters for client-side uploads

### File Operations
- `POST /api/v1/imagekit/upload` - Upload files to ImageKit
- `DELETE /api/v1/imagekit/upload?fileId=xxx` - Delete files
- `GET /api/v1/imagekit/upload?action=list` - List files
- `GET /api/v1/imagekit/upload?action=stats` - Get usage statistics

## Usage Examples

### Server-Side Upload

```typescript
import StorageService from '@/lib/services/storage.service';

// Upload a PDF receipt
const result = await StorageService.uploadPDFReceipt(
  pdfBuffer,
  'receipt-filename',
  {
    name: 'John Doe',
    email: 'john@example.com',
    type: 'registration'
  }
);

console.log('Upload URL:', result.url);
```

### Client-Side Upload Component

```tsx
import ImageKitUploader from '@/components/upload/ImageKitUploader';

function MyUploadForm() {
  const handleUploadComplete = (results) => {
    console.log('Upload complete:', results);
  };

  return (
    <ImageKitUploader
      uploadType="pdf-receipt"
      folder="/gosa-convention/receipts"
      tags={['receipt', 'registration']}
      acceptedFileTypes={['application/pdf']}
      maxFiles={1}
      userDetails={{
        name: 'John Doe',
        email: 'john@example.com',
        type: 'registration'
      }}
      onUploadComplete={handleUploadComplete}
    />
  );
}
```

### Using the Upload Hook

```tsx
import { useImageKitUpload } from '@/lib/hooks/useImageKitUpload';

function CustomUploader() {
  const { uploadFile, uploading, progress, error } = useImageKitUpload();

  const handleFileSelect = async (file: File) => {
    const result = await uploadFile(file, {
      uploadType: 'general',
      folder: '/gosa-convention/demo',
      tags: ['demo', 'test']
    });
    
    if (result) {
      console.log('Upload successful:', result.url);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {uploading && <div>Progress: {progress}%</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Integration with Existing Services

### PDF Generator Service

The PDF generator now supports uploading generated PDFs:

```typescript
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';

// Generate and upload PDF
const result = await PDFGeneratorService.generateAndUploadPDF(pdfData);
console.log('PDF URL:', result.downloadUrl);
```

### WhatsApp Services

Both WhatsApp PDF and Image services now use the unified storage service:

```typescript
// Services automatically use the configured storage provider
// No code changes needed - they use StorageService internally
```

## File Management

### Upload Types

The system supports several upload types:

1. **general** - General file uploads
2. **pdf-receipt** - PDF receipts with specific tagging
3. **image-receipt** - Image receipts with optimization
4. **badge** - Convention badges with high-quality settings

### Tagging System

Files are automatically tagged for organization:
- Service type (registration, dinner, accommodation, etc.)
- File type (pdf, image, badge)
- Convention year (gosa-2025)
- Custom tags based on upload type

### URL Generation

Generate optimized URLs with transformations:

```typescript
import StorageService from '@/lib/services/storage.service';

// Generate thumbnail
const thumbnailUrl = StorageService.generateURL('/path/to/image.jpg', {
  width: 300,
  height: 200,
  quality: 80,
  format: 'webp'
});
```

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors** - Automatic retry with exponential backoff
2. **Authentication Errors** - Clear error messages and troubleshooting
3. **File Size Errors** - Validation before upload
4. **Storage Quota** - Graceful handling of quota limits
5. **Fallback Support** - Automatic fallback to Vercel Blob

## Monitoring and Logging

### Upload Tracking

All uploads are logged with:
- File details (name, size, type)
- User information
- Upload duration
- Success/failure status
- Error details if applicable

### Usage Statistics

Monitor your ImageKit usage:

```typescript
// Get usage statistics
const stats = await fetch('/api/v1/imagekit/upload?action=stats');
const data = await stats.json();
console.log('Storage usage:', data);
```

## Performance Optimization

### Caching Strategy

- **CDN Caching** - Files served from global CDN
- **Browser Caching** - Optimized cache headers
- **Transformation Caching** - Cached image transformations

### Image Optimization

- **Automatic Format Selection** - WebP/AVIF when supported
- **Quality Optimization** - Intelligent quality adjustment
- **Responsive Images** - Multiple sizes for different devices

## Security Features

### Access Control

- **Private Files** - Support for private file uploads
- **Signed URLs** - Temporary access URLs for sensitive content
- **Authentication** - Secure authentication for uploads

### File Validation

- **File Type Validation** - Server-side MIME type checking
- **Size Limits** - Configurable file size limits
- **Malware Scanning** - ImageKit's built-in security scanning

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check environment variables
   - Verify ImageKit credentials
   - Ensure URL endpoint is correct

2. **Upload Timeout**
   - Check file size limits
   - Verify network connectivity
   - Review ImageKit quota

3. **File Not Found**
   - Verify file path
   - Check folder permissions
   - Ensure file wasn't deleted

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will provide detailed logs for troubleshooting.

## Migration from Vercel Blob

To migrate from Vercel Blob to ImageKit:

1. Set up ImageKit account and credentials
2. Update environment variables
3. Set `STORAGE_PROVIDER=imagekit`
4. Test uploads using the demo page
5. Monitor for any issues

The system will automatically use ImageKit for new uploads while existing Vercel Blob URLs continue to work.

## Demo and Testing

Visit `/admin/imagekit-demo` to test the integration:

- Upload different file types
- Test error handling
- View upload results
- Check storage statistics

## Support and Resources

- [ImageKit Documentation](https://docs.imagekit.io/)
- [ImageKit React SDK](https://github.com/imagekit-developer/imagekit-react)
- [ImageKit Node.js SDK](https://github.com/imagekit-developer/imagekit-nodejs)

For issues specific to this integration, check the console logs and error messages for detailed troubleshooting information.