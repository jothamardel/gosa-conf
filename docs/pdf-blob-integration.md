# PDF Blob Integration Guide

## Overview

The GOSA Convention Management System now includes comprehensive PDF generation and delivery via WhatsApp using Vercel Blob storage. This system automatically generates professional PDF confirmations for all services and delivers them to users via WhatsApp.

## Features

### 🎯 Core Functionality
- **Automatic PDF Generation**: Professional PDFs with GOSA branding and QR codes
- **Vercel Blob Storage**: Secure, scalable file storage with public URLs
- **WhatsApp Delivery**: Direct document delivery via WASender API
- **Database Integration**: PDF URLs saved to respective service collections
- **Fallback System**: Text message with PDF link if document delivery fails
- **Comprehensive Logging**: Full monitoring and error tracking

### 📄 PDF Features
- **GOSA Branding**: Official logo, colors, and styling
- **QR Code Integration**: Unique QR codes for verification
- **Service-Specific Content**: Tailored information for each service type
- **Professional Layout**: Clean, responsive design optimized for mobile viewing
- **Secure Access**: Public URLs with proper access controls

### 🔄 Service Support
- Convention Registration
- Dinner Reservations
- Accommodation Bookings
- Brochure Orders
- Goodwill Messages & Donations
- Direct Donations

## Installation

### 1. Install Dependencies

```bash
# Run the installation script
./install-pdf-dependencies.sh

# Or install manually
npm install @vercel/blob puppeteer
npm install --save-dev @types/puppeteer
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Existing variables (ensure these are set)
NEXTAUTH_URL=https://your-domain.com
WASENDER_API_KEY=your_wasender_api_key
```

### 3. Get Vercel Blob Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard/stores)
2. Create a new Blob store or use existing
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add to your environment variables

## Usage

### Automatic PDF Generation (Webhook)

PDFs are automatically generated and sent when payments are confirmed via the Paystack webhook:

```typescript
// In webhook handler - automatically called
const pdfResult = await PDFWhatsAppUtils.sendConventionConfirmationWithBlob(
  userDetails,
  conventionRecord,
  qrCodeData
);
```

### Manual PDF Generation

```typescript
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';

// Generate and send PDF for any service
const result = await PDFWhatsAppUtils.generateUploadAndSendPDF(
  'convention', // Service type
  userDetails,  // User information
  record,       // Service record
  qrCodeData    // QR code data
);

console.log('PDF Result:', {
  success: result.success,
  pdfGenerated: result.pdfGenerated,
  whatsappSent: result.whatsappSent,
  blobUrl: result.blobUrl,
  dbSaved: result.dbSaved
});
```

### Retrieve PDF Information

```typescript
// Get PDF URL from database
const pdfInfo = await PDFWhatsAppUtils.getPDFUrlFromDatabase(
  'convention',
  'payment_reference_123'
);

if (pdfInfo && pdfInfo.pdfUrl) {
  console.log('PDF URL:', pdfInfo.pdfUrl);
  console.log('Generated:', pdfInfo.pdfGeneratedAt);
}
```

## API Endpoints

### Get PDF Information

```http
GET /api/v1/pdf/info?ref=payment_reference&type=convention
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentReference": "payment_reference_123",
    "serviceType": "convention",
    "pdfUrl": "https://blob.vercel-storage.com/...",
    "pdfFilename": "GOSA_2025_Convention_John_Doe_REG001.pdf",
    "pdfGeneratedAt": "2025-01-15T10:30:00.000Z",
    "isAvailable": true
  }
}
```

### Resend PDF

```http
POST /api/v1/pdf/resend
Content-Type: application/json

{
  "paymentReference": "payment_reference_123",
  "serviceType": "convention",
  "phoneNumber": "+2348123456789",
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF resent successfully",
  "data": {
    "paymentReference": "payment_reference_123",
    "serviceType": "convention",
    "pdfUrl": "https://blob.vercel-storage.com/...",
    "resent": true,
    "messageId": "msg_123"
  }
}
```

### Download PDF (Existing)

```http
GET /api/v1/pdf/download?ref=payment_reference&format=pdf
```

## Database Schema Updates

The following fields are automatically added to service collections when PDFs are generated:

```typescript
interface PDFFields {
  pdfUrl?: string;           // Vercel Blob URL
  pdfFilename?: string;      // Generated filename
  pdfGeneratedAt?: Date;     // Generation timestamp
}
```

**Collections Updated:**
- `conventionregistrations`
- `dinnerreservations`
- `accommodations`
- `conventionbrochures`
- `goodwillmessages`
- `donations`

## WhatsApp Message Templates

### Convention Registration
```
🎉 Hello John Doe!

Your Convention Registration has been confirmed! 

📄 Please find your official confirmation document attached.

📋 **Details:**
• Service: Convention Registration
• Reference: PAY123456
• Status: Confirmed ✅

📱 **Important:**
• Save this document to your device
• Present the QR code for verification when needed
• Keep this for your records

🏛️ **GOSA 2025 Convention**
"For Light and Truth"

Thank you for your participation! 🙏

Need help? Contact our support team.
```

### Fallback Message (if document delivery fails)
```
[Same message as above]

📄 Download your PDF: https://blob.vercel-storage.com/...
```

## PDF Content Structure

### Header Section
- GOSA logo (from `/public/images/gosa.png`)
- Convention title and tagline
- Professional gradient background

### Personal Information
- Full name, email, phone number
- Registration ID
- Grid layout for easy reading

### Service Details
- Service type and description
- Amount paid (formatted in Naira)
- Payment reference and date
- Confirmation status

### Service-Specific Content
- **Convention**: Accommodation details, guest count, schedule
- **Dinner**: Guest information, dietary requirements, event details
- **Accommodation**: Room type, check-in/out dates, confirmation code
- **Brochure**: Quantity, delivery information, order type
- **Goodwill**: Message content, donation details
- **Donation**: Purpose, attribution, receipt information

### QR Code Section
- High-quality QR code for verification
- Usage instructions
- Backup text code

### Footer
- Contact information
- Generation timestamp
- Professional styling

## Error Handling

### PDF Generation Errors
- Browser launch failures
- HTML rendering issues
- Network connectivity problems
- Resource limitations

### Blob Upload Errors
- Authentication failures
- File size limitations
- Network timeouts
- Storage quota issues

### WhatsApp Delivery Errors
- Invalid phone numbers
- API rate limiting
- Document size restrictions
- Network failures

### Fallback Mechanisms
1. **Document Delivery Fails**: Send text message with PDF link
2. **Text Message Fails**: Log error for manual intervention
3. **PDF Generation Fails**: Retry with exponential backoff
4. **Blob Upload Fails**: Use alternative storage or local serving

## Monitoring and Logging

### Key Metrics Tracked
- PDF generation success rate
- Blob upload success rate
- WhatsApp delivery success rate
- Average processing time
- Error rates by category

### Log Events
- `generation/blob_upload_start`
- `generation/blob_upload_complete`
- `generation/blob_upload_failed`
- `delivery/whatsapp_document_sent`
- `delivery/whatsapp_fallback_used`

### Performance Monitoring
```typescript
// Access monitoring data
const metrics = PDFLoggerService.getMetrics();
const performanceStats = PDFLoggerService.getPerformanceStats();
```

## Troubleshooting

### Common Issues

#### 1. PDF Generation Fails
```bash
# Check Puppeteer installation
npm list puppeteer

# Reinstall if needed
npm uninstall puppeteer
npm install puppeteer
```

#### 2. Blob Upload Fails
```bash
# Verify environment variable
echo $BLOB_READ_WRITE_TOKEN

# Check Vercel Blob dashboard for quota
```

#### 3. WhatsApp Delivery Fails
```bash
# Check WASender API status
curl -X GET "https://api.wasender.com/status" \
  -H "Authorization: Bearer $WASENDER_API_KEY"
```

#### 4. Logo Not Loading
- Ensure `/public/images/gosa.png` exists
- Check file permissions
- Verify NEXTAUTH_URL is set correctly

### Debug Mode

Enable detailed logging:

```typescript
// In your environment
DEBUG=pdf:*

// Or in code
PDFLoggerService.logEvent({
  level: 'debug',
  operation: 'generation',
  action: 'debug_info',
  // ... other fields
});
```

## Performance Optimization

### PDF Generation
- Template caching for repeated generations
- Optimized Puppeteer settings for serverless
- Efficient HTML rendering
- Resource cleanup

### Blob Storage
- Automatic file compression
- Optimized upload settings
- CDN distribution
- Cache headers

### WhatsApp Delivery
- Batch processing for multiple recipients
- Rate limiting compliance
- Connection pooling
- Retry logic with exponential backoff

## Security Considerations

### PDF Access
- Public URLs but unpredictable filenames
- No sensitive data in URLs
- Time-based access patterns monitoring

### Data Protection
- Phone number masking in logs
- IP address partial masking
- Secure environment variable handling

### API Security
- Request validation
- Rate limiting
- Error message sanitization
- Access logging

## Best Practices

### Development
1. Test PDF generation locally before deployment
2. Use environment-specific Blob stores
3. Monitor storage usage and costs
4. Implement proper error boundaries

### Production
1. Set up monitoring alerts
2. Regular cleanup of old PDFs
3. Monitor WhatsApp API quotas
4. Backup critical PDF data

### Maintenance
1. Regular dependency updates
2. Performance monitoring
3. Log analysis and optimization
4. User feedback integration

## Support

### Getting Help
- Check logs in monitoring dashboard
- Review error patterns in PDFLoggerService
- Test individual components in isolation
- Contact development team with specific error messages

### Reporting Issues
Include the following information:
- Payment reference
- Service type
- Error messages from logs
- Timestamp of issue
- User phone number (masked)

This PDF Blob integration provides a robust, scalable solution for document generation and delivery in the GOSA Convention Management System.