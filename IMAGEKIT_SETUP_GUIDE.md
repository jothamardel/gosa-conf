# 🚀 ImageKit Setup Guide for GOSA Convention System

## ✅ Current Status

Your ImageKit integration is **90% complete**! Here's what's already configured:

### 📋 What's Already Done:
- ✅ ImageKit SDK installed (`@imagekit/next`)
- ✅ Public Key configured: `public_jsrzY4E4aieuqJC6kXRjFN4ThpM=`
- ✅ URL Endpoint configured: `https://ik.imagekit.io/zy6mjyaq3`
- ✅ Storage provider set to ImageKit
- ✅ All services and components created
- ✅ API routes implemented
- ✅ Demo page ready at `/admin/imagekit-demo`

## 🔑 Final Step: Add Your Private Key

You only need to add your **ImageKit Private Key** to complete the setup:

### 1. Get Your Private Key
1. Go to [ImageKit Dashboard](https://imagekit.io/dashboard)
2. Navigate to **Developer** → **API Keys**
3. Copy your **Private Key**

### 2. Add to Environment File
Open your `.env` file and replace the placeholder:

```bash
# Replace this line:
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxx

# With your actual private key:
IMAGEKIT_PRIVATE_KEY=private_your_actual_key_here
```

## 🧪 Test the Integration

### Option 1: Use the Demo Page
1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/admin/imagekit-demo`
3. Test file uploads and see the results

### Option 2: Run the Test Script
```bash
# Update the private key in test-imagekit.js first
node test-imagekit.js
```

## 🔧 Usage Examples

### Server-Side Upload (in your API routes)
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

console.log('File URL:', result.url);
```

### Client-Side Upload (in your React components)
```tsx
import { useImageKitUpload } from '@/lib/hooks/useImageKitUpload';

function MyComponent() {
  const { uploadFile, uploading, progress } = useImageKitUpload();

  const handleUpload = async (file: File) => {
    const result = await uploadFile(file, {
      uploadType: 'pdf-receipt',
      folder: '/gosa-convention/receipts',
      userDetails: {
        name: 'User Name',
        email: 'user@example.com',
        type: 'registration'
      }
    });
    
    if (result) {
      console.log('Upload successful:', result.url);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {uploading && <div>Progress: {progress}%</div>}
    </div>
  );
}
```

## 📁 File Organization

Your files will be organized in ImageKit as:

```
/gosa-convention/
├── receipts/          # PDF receipts (registration, dinner, etc.)
├── images/            # Image receipts and photos
├── badges/            # Convention badges
├── demo/              # Demo/test uploads
└── general/           # Other files
```

## 🏷️ Automatic Tagging

Files are automatically tagged with:
- Service type: `registration`, `dinner`, `accommodation`, etc.
- File type: `pdf`, `image`, `badge`
- Convention: `gosa-2025`
- User identifiers when provided

## 🔄 Provider Switching

You can switch between storage providers anytime:

```bash
# Use ImageKit (recommended)
STORAGE_PROVIDER=imagekit

# Use Vercel Blob (fallback)
STORAGE_PROVIDER=vercel
```

The system automatically falls back to Vercel Blob if ImageKit fails.

## 🎯 Benefits You'll Get

### Cost Savings
- ImageKit often more cost-effective than Vercel Blob
- Pay-as-you-use pricing model
- Free tier available

### Performance
- Global CDN with 200+ locations
- Automatic image optimization
- WebP/AVIF format conversion
- Lazy loading support

### Features
- Real-time image transformations
- Automatic quality optimization
- Responsive image delivery
- Advanced analytics

### Developer Experience
- Simple API integration
- Comprehensive documentation
- Real-time upload progress
- Error handling and fallbacks

## 🚨 Important Notes

1. **Keep your private key secure** - Never commit it to version control
2. **Test thoroughly** - Use the demo page to verify everything works
3. **Monitor usage** - Check your ImageKit dashboard regularly
4. **Backup strategy** - Consider keeping Vercel Blob as fallback

## 🆘 Troubleshooting

### Common Issues:

**Authentication Failed**
- Check your private key is correct
- Verify all environment variables are set
- Restart your development server

**Upload Timeout**
- Check file size limits (default: 10MB)
- Verify network connectivity
- Check ImageKit quota limits

**File Not Found**
- Verify the file path is correct
- Check folder permissions in ImageKit
- Ensure file wasn't deleted

### Getting Help:
- Check the console for detailed error messages
- Visit ImageKit documentation: https://docs.imagekit.io/
- Test with the demo page first

## 🎉 You're Almost Done!

Just add your private key and you'll have a fully functional ImageKit integration that's more powerful and cost-effective than Vercel Blob!

**Next Steps:**
1. Add private key to `.env`
2. Test at `/admin/imagekit-demo`
3. Start using in your application
4. Monitor usage in ImageKit dashboard