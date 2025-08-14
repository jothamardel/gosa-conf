import { PDFData } from '@/lib/types';
import * as QRCode from 'qrcode';
import sharp from 'sharp';

export interface ImageData extends PDFData { }

export class ImageGeneratorService {
  /**
   * Escape XML/SVG special characters
   */
  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate PNG image buffer with embedded QR code
   */
  static async generateImageBuffer(data: ImageData): Promise<Buffer> {
    try {
      // Generate SVG content first
      const svgContent = await this.generateSVGContent(data);

      try {
        // Try to convert SVG to PNG using Sharp with better settings
        const pngBuffer = await sharp(Buffer.from(svgContent))
          .png({
            quality: 95,
            compressionLevel: 6,
            progressive: false
          })
          .resize(800, 1000, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toBuffer();

        console.log(`[IMAGE-GENERATOR] Successfully generated PNG image using Sharp for ${data.operationDetails.paymentReference}`);
        return pngBuffer;
      } catch (sharpError) {
        console.warn('[IMAGE-GENERATOR] Sharp conversion failed, trying alternative approach:', sharpError);

        // Try a simpler approach - create a basic image
        try {
          const simpleImageBuffer = await this.generateSimpleImageBuffer(data);
          console.log(`[IMAGE-GENERATOR] Successfully generated simple image for ${data.operationDetails.paymentReference}`);
          return simpleImageBuffer;
        } catch (simpleError) {
          console.warn('[IMAGE-GENERATOR] Simple image generation failed, using text fallback:', simpleError);
          return this.generateImageBufferFallback(data);
        }
      }

    } catch (error) {
      console.error('[IMAGE-GENERATOR] Failed to generate image:', error);
      // Fall back to simple text-based image
      return this.generateImageBufferFallback(data);
    }
  }

  /**
   * Generate a simple image buffer using Sharp directly
   */
  private static async generateSimpleImageBuffer(data: ImageData): Promise<Buffer> {
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    // Create a simple image with text overlay
    const width = 800;
    const height = 1000;

    // Create base image
    const baseImage = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });

    // Generate QR code as PNG buffer
    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(data.qrCodeData, {
        type: 'png',
        width: 200,
        margin: 2,
        color: {
          dark: '#16A34A',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      console.error('QR code buffer generation failed:', qrError);
    }

    // Create SVG overlay with text
    const textOverlay = `
      <svg width="${width}" height="${height}">
        <!-- Header background -->
        <rect width="${width}" height="100" fill="#16A34A"/>
        
        <!-- Header text -->
        <text x="50" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="white">GOSA 2025 Convention</text>
        <text x="50" y="70" font-family="Arial" font-size="18" fill="white">${this.escapeXML(serviceTitle)} Confirmation</text>
        
        <!-- User details -->
        <text x="50" y="150" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">Personal Information</text>
        <text x="50" y="180" font-family="Arial" font-size="14" fill="#333">Name: ${this.escapeXML(data.userDetails.name)}</text>
        <text x="50" y="200" font-family="Arial" font-size="14" fill="#333">Email: ${this.escapeXML(data.userDetails.email)}</text>
        <text x="50" y="220" font-family="Arial" font-size="14" fill="#333">Phone: ${this.escapeXML(data.userDetails.phone)}</text>
        
        <!-- Transaction details -->
        <text x="50" y="280" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">Transaction Details</text>
        <text x="50" y="310" font-family="Arial" font-size="24" font-weight="bold" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
        <text x="50" y="340" font-family="Arial" font-size="14" fill="#333">Reference: ${this.escapeXML(data.operationDetails.paymentReference)}</text>
        <text x="50" y="360" font-family="Arial" font-size="14" fill="#333">Status: Confirmed ✅</text>
        <text x="50" y="380" font-family="Arial" font-size="14" fill="#333">Date: ${new Date(data.operationDetails.date).toLocaleDateString()}</text>
        
        <!-- QR Code section -->
        <text x="50" y="450" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">Your Digital Pass</text>
        <rect x="300" y="470" width="200" height="200" fill="none" stroke="#16A34A" stroke-width="2" stroke-dasharray="5,5"/>
        <text x="400" y="580" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">QR Code will appear here</text>
        
        <!-- Instructions -->
        <text x="50" y="720" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">Instructions</text>
        <text x="50" y="750" font-family="Arial" font-size="14" fill="#333">• Save this image to your device</text>
        <text x="50" y="770" font-family="Arial" font-size="14" fill="#333">• Present the QR code when required</text>
        <text x="50" y="790" font-family="Arial" font-size="14" fill="#333">• Contact support@gosa.events for help</text>
        
        <!-- Footer -->
        <text x="400" y="900" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">GOSA 2025 Convention Team</text>
        <text x="400" y="920" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">www.gosa.events</text>
      </svg>
    `;

    const compositeOperations: any[] = [
      {
        input: Buffer.from(textOverlay),
        top: 0,
        left: 0
      }
    ];

    // Add QR code if available
    if (qrBuffer) {
      compositeOperations.push({
        input: qrBuffer,
        top: 470,
        left: 300
      });
    }

    return baseImage
      .composite(compositeOperations)
      .png({ quality: 95 })
      .toBuffer();
  }

  /**
   * Generate SVG content for the confirmation
   */
  private static async generateSVGContent(data: ImageData): Promise<string> {
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    // Generate QR code as data URL with high quality settings
    let qrCodeDataURL = '';
    try {
      qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#16A34A',
          light: '#ffffff'
        }
      }) as string;
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
    }

    // Simplified SVG structure for better compatibility
    const svg = `<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#16A34A"/>
      <stop offset="100%" style="stop-color:#F59E0B"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="1000" fill="#ffffff"/>
  
  <!-- Header -->
  <rect width="800" height="100" fill="url(#headerGrad)"/>
  <circle cx="70" cy="50" r="20" fill="white"/>
  <text x="70" y="57" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#16A34A">GOSA</text>
  <text x="110" y="57" font-family="Arial" font-size="18" font-weight="600" fill="white">GOSA 2025 Convention</text>
  <text x="750" y="57" text-anchor="end" font-family="Arial" font-size="20" font-weight="600" fill="white">${this.escapeXML(serviceTitle)} Details</text>
  
  <!-- Personal Info Card -->
  <rect x="30" y="130" width="740" height="140" fill="white" stroke="#E5E7EB" stroke-width="1" rx="8"/>
  <rect x="30" y="130" width="4" height="140" fill="#16A34A"/>
  <text x="50" y="155" font-family="Arial" font-size="12" font-weight="600" fill="#6B7280">PERSONAL INFORMATION</text>
  
  <text x="50" y="180" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">FULL NAME</text>
  <text x="50" y="200" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.name)}</text>
  
  <text x="420" y="180" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">EMAIL</text>
  <text x="420" y="200" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.email)}</text>
  
  <text x="50" y="230" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PHONE</text>
  <text x="50" y="250" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.phone)}</text>
  
  <!-- Transaction Details Card -->
  <rect x="30" y="290" width="740" height="160" fill="white" stroke="#E5E7EB" stroke-width="1" rx="8"/>
  <rect x="30" y="290" width="4" height="160" fill="#16A34A"/>
  <text x="50" y="315" font-family="Arial" font-size="12" font-weight="600" fill="#6B7280">TRANSACTION DETAILS</text>
  
  <text x="50" y="340" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">AMOUNT</text>
  <text x="50" y="365" font-family="Arial" font-size="28" font-weight="700" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
  
  <!-- Status Badge -->
  <rect x="50" y="380" width="100" height="25" fill="#DCFCE7" rx="12"/>
  <text x="100" y="397" text-anchor="middle" font-family="Arial" font-size="12" font-weight="600" fill="#166534">✓ Successful</text>
  
  <text x="420" y="340" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">REFERENCE</text>
  <text x="420" y="360" font-family="Arial" font-size="12" font-weight="600" fill="#1F2937">${this.escapeXML(data.operationDetails.paymentReference)}</text>
  
  <text x="420" y="385" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">DATE</text>
  <text x="420" y="405" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${new Date(data.operationDetails.date).toLocaleDateString()}</text>
  
  <!-- QR Code Section -->
  <rect x="30" y="470" width="740" height="220" fill="white" stroke="#16A34A" stroke-width="2" stroke-dasharray="8,4" rx="8"/>
  <text x="400" y="495" text-anchor="middle" font-family="Arial" font-size="12" font-weight="600" fill="#6B7280">YOUR DIGITAL PASS</text>
  
  ${qrCodeDataURL ? `<image x="300" y="510" width="200" height="200" href="${qrCodeDataURL}"/>` : `<text x="400" y="620" text-anchor="middle" font-family="Arial" font-size="14" fill="#1F2937">${this.escapeXML(data.qrCodeData.substring(0, 50))}...</text>`}
  
  <!-- Instructions -->
  <rect x="30" y="710" width="740" height="120" fill="white" stroke="#E5E7EB" stroke-width="1" rx="8"/>
  <rect x="30" y="710" width="4" height="120" fill="#16A34A"/>
  <text x="50" y="735" font-family="Arial" font-size="12" font-weight="600" fill="#6B7280">INSTRUCTIONS</text>
  <text x="50" y="755" font-family="Arial" font-size="14" fill="#1F2937">• Save this image to your device</text>
  <text x="50" y="775" font-family="Arial" font-size="14" fill="#1F2937">• Present QR code when required</text>
  <text x="50" y="795" font-family="Arial" font-size="14" fill="#1F2937">• Contact support@gosa.events for help</text>
  
  <!-- Footer -->
  <rect x="0" y="850" width="800" height="150" fill="#F9FAFB"/>
  <line x1="0" y1="850" x2="800" y2="850" stroke="#E5E7EB"/>
  <text x="400" y="875" text-anchor="middle" font-family="Arial" font-size="16" font-weight="600" fill="#16A34A">GOSA 2025 Convention - For Light and Truth</text>
  <text x="400" y="895" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B7280">support@gosa.events | www.gosa.events</text>
  <text x="400" y="915" text-anchor="middle" font-family="Arial" font-size="10" fill="#9CA3AF">Generated: ${new Date().toLocaleDateString()}</text>
</svg>`;

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

    // Always use PNG format for better WhatsApp compatibility
    return `gosa-2025-${sanitizedServiceType}-${sanitizedName}-${timestamp}.png`;
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
      'goodwill': 'Goodwill Message &amp; Donation',
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
• Contact support@gosa.events for help

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