# PDF Blob Setup Instructions

## Current Status
The PDF system is currently using the existing PDF generation methods. To enable Vercel Blob storage and enhanced PDF delivery, follow these steps:

## Step 1: Install Dependencies

```bash
# Install Vercel Blob for file storage
npm install @vercel/blob

# Install Puppeteer for PDF generation
npm install puppeteer

# Install Puppeteer types for development
npm install --save-dev @types/puppeteer
```

## Step 2: Set Environment Variables

Add to your `.env` file:

```env
# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## Step 3: Get Vercel Blob Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard/stores)
2. Create a new Blob store or select existing one
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add it to your environment variables

## Step 4: Enable Blob Methods

Once dependencies are installed, update the webhook to use blob methods:

In `app/api/webhook/paystack/route.ts`, replace:

```typescript
// Current (fallback methods)
pdfResult = await PDFWhatsAppUtils.sendDinnerConfirmation(
  userDetails,
  record,
  qrCodeData
);
```

With:

```typescript
// Enhanced blob methods
pdfResult = await PDFWhatsAppUtils.sendDinnerConfirmationWithBlob(
  userDetails,
  record,
  qrCodeData
);
```

Do this for all service types:
- `sendConventionConfirmationWithBlob`
- `sendDinnerConfirmationWithBlob`
- `sendAccommodationConfirmationWithBlob`
- `sendBrochureConfirmationWithBlob`
- `sendGoodwillConfirmationWithBlob`
- `sendDonationConfirmationWithBlob`

## Step 5: Update Response Objects

Add blob-related fields back to the response objects:

```typescript
const result = {
  success: pdfResult?.success || false,
  serviceType,
  phoneNumber: internationalPhone,
  pdfGenerated: pdfResult?.pdfGenerated || false,
  whatsappSent: pdfResult?.whatsappSent || false,
  fallbackUsed: pdfResult?.fallbackUsed || false,
  blobUrl: pdfResult?.blobUrl,        // Add this back
  dbSaved: pdfResult?.dbSaved || false, // Add this back
  error: pdfResult?.error
};
```

## Step 6: Test the System

1. Make a test payment to trigger the webhook
2. Check that PDFs are generated and uploaded to Vercel Blob
3. Verify WhatsApp delivery works with blob URLs
4. Check database for saved PDF URLs

## Benefits of Blob Integration

Once enabled, you'll get:

- ✅ **Persistent PDF Storage**: PDFs stored securely in Vercel Blob
- ✅ **Database Integration**: PDF URLs saved to respective collections
- ✅ **Better Performance**: CDN-delivered PDFs with caching
- ✅ **Scalability**: No local file storage limitations
- ✅ **Professional URLs**: Clean, shareable PDF links
- ✅ **Monitoring**: Full tracking of PDF generation and delivery

## Current Functionality

Even without blob integration, the system currently provides:

- ✅ PDF generation with GOSA branding
- ✅ WhatsApp delivery via WASender API
- ✅ QR code integration
- ✅ Service-specific content
- ✅ Error handling and fallbacks
- ✅ Comprehensive logging

## Troubleshooting

If you encounter issues after installing dependencies:

1. **Clear TypeScript cache**: Delete `.next` folder and restart
2. **Restart development server**: `npm run dev`
3. **Check environment variables**: Ensure `BLOB_READ_WRITE_TOKEN` is set
4. **Verify Vercel Blob setup**: Test blob store access in Vercel dashboard

## Support

For issues with setup:
1. Check the installation logs for errors
2. Verify all environment variables are set
3. Test blob access with a simple upload
4. Review the comprehensive documentation in `docs/pdf-blob-integration.md`