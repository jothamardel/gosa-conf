import { PDFData } from '@/lib/types';
import * as QRCode from 'qrcode';

export interface ImageData extends PDFData { }

export class ImageGeneratorService {
  /**
   * Generate image buffer using Canvas (runtime only)
   */
  static async generateImageBuffer(data: ImageData): Promise<Buffer> {
    try {
      // For now, use a simple SVG-based approach that's more build-friendly
      const svgContent = await this.generateSVGContent(data);

      // Convert SVG to buffer (in production, you might want to convert to PNG)
      const buffer = Buffer.from(svgContent, 'utf-8');
      console.log(`[IMAGE-GENERATOR] Successfully generated image for ${data.operationDetails.paymentReference}`);
      return buffer;

    } catch (error) {
      console.error('[IMAGE-GENERATOR] Failed to generate image:', error);
      // Fall back to simple text-based image
      return this.generateImageBufferFallback(data);
    }
  }

  /**
   * Generate SVG content for the confirmation
   */
  private static async generateSVGContent(data: ImageData): Promise<string> {
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    // Generate QR code as data URL
    let qrCodeDataURL = '';
    try {
      qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#16A34A',
          light: '#ffffff'
        }
      });
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
    }

    const svg = `
      <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .header { font-family: Arial, sans-serif; font-weight: bold; fill: #16A34A; }
            .title { font-family: Arial, sans-serif; font-weight: bold; fill: #1f2937; }
            .text { font-family: Arial, sans-serif; fill: #1f2937; }
            .section-title { font-family: Arial, sans-serif; font-weight: bold; fill: #16A34A; }
          </style>
        </defs>
        
        <!-- Background -->
        <rect width="800" height="1200" fill="#ffffff"/>
        
        <!-- Header -->
        <text x="400" y="60" text-anchor="middle" class="header" font-size="36">🎉 GOSA 2025 Convention</text>
        <text x="400" y="100" text-anchor="middle" class="header" font-size="24">For Light and Truth</text>
        
        <!-- Divider line -->
        <line x1="50" y1="130" x2="750" y2="130" stroke="#16A34A" stroke-width="3"/>
        
        <!-- Service title -->
        <text x="400" y="180" text-anchor="middle" class="title" font-size="28">${serviceTitle} Confirmation</text>
        
        <!-- User details -->
        <text x="50" y="230" class="text" font-size="20">Name: ${data.userDetails.name}</text>
        <text x="50" y="265" class="text" font-size="20">Email: ${data.userDetails.email}</text>
        <text x="50" y="300" class="text" font-size="20">Phone: ${data.userDetails.phone}</text>
        
        <!-- Payment details -->
        <text x="50" y="350" class="section-title" font-size="22">Payment Details</text>
        <text x="50" y="385" class="text" font-size="20">Amount: ₦${data.operationDetails.amount.toLocaleString()}</text>
        <text x="50" y="420" class="text" font-size="20">Reference: ${data.operationDetails.paymentReference}</text>
        <text x="50" y="455" class="text" font-size="20">Status: Confirmed ✅</text>
        <text x="50" y="490" class="text" font-size="20">Date: ${new Date(data.operationDetails.date).toLocaleDateString()}</text>
        
        <!-- QR Code -->
        <text x="400" y="540" text-anchor="middle" class="section-title" font-size="22">QR Code</text>
        ${qrCodeDataURL ? `<image x="300" y="560" width="200" height="200" href="${qrCodeDataURL}"/>` : `<text x="400" y="660" text-anchor="middle" class="text" font-size="18">${data.qrCodeData}</text>`}
        <text x="400" y="790" text-anchor="middle" class="text" font-size="16">Present this QR code at the event</text>
        
        <!-- Instructions -->
        <text x="50" y="840" class="section-title" font-size="20">Important Instructions:</text>
        <text x="50" y="870" class="text" font-size="18">• Save this image to your device</text>
        <text x="50" y="895" class="text" font-size="18">• Present the QR code when required</text>
        <text x="50" y="920" class="text" font-size="18">• Keep this document for your records</text>
        <text x="50" y="945" class="text" font-size="18">• Contact support@gosa.org for help</text>
        
        <!-- Footer -->
        <text x="400" y="1000" text-anchor="middle" class="section-title" font-size="18">GOSA 2025 Convention Team</text>
        <text x="400" y="1025" text-anchor="middle" class="section-title" font-size="18">www.gosa.events</text>
      </svg>
    `;

    return svg;
  }

  /**
   * Generate image and upload to Vercel Blob storage
   */
  static async generateAndUploadToBlob(data: ImageData): Promise<string> {
    const { ImageBlobService } = await import('./image-blob.service');

    try {
      // Generate image buffer
      const imageBuffer = await this.generateImageBuffer(data);

      // Generate blob filename
      const filename = ImageBlobService.generateBlobFilename(data.userDetails, data.operationDetails.type);

      // Upload to Vercel Blob storage
      const blobUrl = await ImageBlobService.uploadImageToBlob(imageBuffer, filename);

      console.log(`[IMAGE-GENERATOR] Successfully uploaded image to blob: ${filename}`);
      return blobUrl;
    } catch (error) {
      console.error('[IMAGE-GENERATOR] Failed to generate and upload image to blob:', error);

      // Use fallback mechanism
      const { ImageBlobService } = await import('./image-blob.service');
      return await ImageBlobService.handleBlobUploadError(error as Error, data);
    }
  }

  /**
   * Generate filename for image
   */
  static generateFilename(userDetails: { name: string }, serviceType: string): string {
    const timestamp = Date.now();
    const sanitizedName = userDetails.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const sanitizedServiceType = serviceType
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    return `gosa-2025-${sanitizedServiceType}-${sanitizedName}-${timestamp}.svg`;
  }

  /**
   * Get service title for display
   */
  private static getServiceTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'convention': 'Convention Registration',
      'dinner': 'Dinner Reservation',
      'accommodation': 'Accommodation Booking',
      'brochure': 'Brochure Order',
      'goodwill': 'Goodwill Message & Donation',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Fallback image generation (simplified version)
   */
  static async generateImageBufferFallback(data: ImageData): Promise<Buffer> {
    try {
      // Simple text-based fallback
      const fallbackContent = `
GOSA 2025 Convention - For Light and Truth

${this.getServiceTitle(data.operationDetails.type)} Confirmation

Name: ${data.userDetails.name}
Email: ${data.userDetails.email}
Phone: ${data.userDetails.phone}

Payment Details:
Amount: ₦${data.operationDetails.amount.toLocaleString()}
Reference: ${data.operationDetails.paymentReference}
Status: Confirmed ✅
Date: ${new Date(data.operationDetails.date).toLocaleDateString()}

QR Code: ${data.qrCodeData}

Important Instructions:
• Save this confirmation for your records
• Present the QR code when required
• Contact support@gosa.org for help

GOSA 2025 Convention Team
www.gosa.events
      `;

      return Buffer.from(fallbackContent, 'utf-8');
    } catch (error) {
      console.error('[IMAGE-GENERATOR] Fallback generation failed:', error);
      throw error;
    }
  }
}