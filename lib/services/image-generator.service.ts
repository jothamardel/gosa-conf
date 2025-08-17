import { PDFData } from '@/lib/types';
import * as QRCode from 'qrcode';

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
   * Generate image buffer - converts SVG to PNG for WhatsApp compatibility
   */
  static async generateImageBuffer(data: ImageData): Promise<Buffer> {
    try {
      console.log(`[IMAGE-GENERATOR] Generating image for ${data.operationDetails.paymentReference}`);

      // Generate SVG content first
      const svgContent = await this.generateSVGContent(data);

      // Try to convert SVG to PNG for better WhatsApp compatibility
      try {
        // Check if we're in a production environment where Sharp might not be available
        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        // Dynamic import for Sharp to handle production environment issues
        let sharp: any = null;
        let sharpAvailable = false;

        try {
          sharp = require('sharp');
          // Test if Sharp actually works by creating a simple buffer
          await sharp({
            create: {
              width: 1,
              height: 1,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
          }).png().toBuffer();
          sharpAvailable = true;
          console.log('[IMAGE-GENERATOR] Sharp is available and working');
        } catch (sharpError) {
          console.warn('[IMAGE-GENERATOR] Sharp not available or not working:', sharpError.message);
          sharpAvailable = false;
        }

        if (sharpAvailable && sharp) {
          console.log('[IMAGE-GENERATOR] Converting SVG to PNG using Sharp');
          const pngBuffer = await sharp(Buffer.from(svgContent))
            .png({
              quality: 95,
              compressionLevel: 6,
              progressive: false
            })
            .resize(800, 1200, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toBuffer();

          console.log(`[IMAGE-GENERATOR] Successfully converted to PNG (${pngBuffer.length} bytes)`);
          return pngBuffer;
        } else {
          // Fallback to optimized SVG if Sharp is not available
          console.log('[IMAGE-GENERATOR] Using optimized SVG format (Sharp not available)');

          // Create a more WhatsApp-compatible SVG
          const optimizedSvg = this.optimizeSVGForWhatsApp(svgContent);
          return Buffer.from(optimizedSvg, 'utf-8');
        }
      } catch (conversionError) {
        console.warn('[IMAGE-GENERATOR] PNG conversion failed, using SVG:', conversionError);
        return Buffer.from(svgContent, 'utf-8');
      }

    } catch (error) {
      console.error('[IMAGE-GENERATOR] Failed to generate image:', error);
      // Ultimate fallback to simple text
      return this.generateTextFallback(data);
    }
  }

  /**
   * Load GOSA logo as buffer with multiple fallback paths
   */
  private static async loadLogoBuffer(): Promise<Buffer | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Try multiple possible logo paths for different environments
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'images', 'gosa.png'),
        path.join(process.cwd(), 'public', 'gosa.png'),
        path.join(__dirname, '..', '..', 'public', 'images', 'gosa.png'),
        path.join(__dirname, '..', '..', 'public', 'gosa.png'),
        './public/images/gosa.png',
        './public/gosa.png'
      ];

      for (const logoPath of possiblePaths) {
        try {
          if (fs.existsSync(logoPath)) {
            console.log('[IMAGE-GENERATOR] Found GOSA logo at:', logoPath);
            return fs.readFileSync(logoPath);
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }

      console.warn('[IMAGE-GENERATOR] GOSA logo not found in any of the expected paths, using fallback');

      // Return a simple base64 encoded placeholder logo
      // This is a minimal 50x50 green circle with "GOSA" text as fallback
      const fallbackLogoSvg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="24" fill="#16A34A" stroke="#15803D" stroke-width="2"/>
        <text x="25" y="30" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="white">GOSA</text>
      </svg>`;

      return Buffer.from(fallbackLogoSvg, 'utf-8');
    } catch (error) {
      console.error('[IMAGE-GENERATOR] Error loading GOSA logo:', error);
      return null;
    }
  }

  /**
   * Generate text-based fallback when all else fails
   */
  private static generateTextFallback(data: ImageData): Buffer {
    try {
      const serviceTitle = this.getServiceTitle(data.operationDetails.type);

      const fallbackContent = `
GOSA 2025 Convention - For Light and Truth

${serviceTitle} Confirmation

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
      console.error('[IMAGE-GENERATOR] Text fallback generation failed:', error);
      // Return minimal fallback
      return Buffer.from('GOSA 2025 Convention - Payment Confirmed', 'utf-8');
    }
  }

  /**
   * Generate modern SVG receipt without Sharp dependencies
   */
  private static async generateSVGContent(data: ImageData): Promise<string> {
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    // Generate QR code as data URL
    let qrCodeDataURL = '';
    try {
      qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
        width: 180,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#16A34A',
          light: '#ffffff'
        }
      }) as string;
    } catch (qrError) {
      console.error('[IMAGE-GENERATOR] QR code generation failed:', qrError);
    }

    // Load GOSA logo as base64 (no Sharp resizing)
    let logoDataURL = '';
    let logoIsSVG = false;
    try {
      const logoBuffer = await this.loadLogoBuffer();
      if (logoBuffer) {
        // Check if the logo buffer is SVG or PNG
        const bufferStart = logoBuffer.toString('utf8', 0, Math.min(100, logoBuffer.length));
        logoIsSVG = bufferStart.includes('<svg');

        if (logoIsSVG) {
          logoDataURL = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
          console.log('[IMAGE-GENERATOR] Using SVG fallback logo');
        } else {
          logoDataURL = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          console.log('[IMAGE-GENERATOR] Using PNG logo');
        }
      }
    } catch (logoError) {
      console.error('[IMAGE-GENERATOR] Error processing logo:', logoError);
    }

    // Modern glassmorphism receipt design
    const svg = `<svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradients for modern design -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F0FDF4;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ECFDF5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F7FEF0;stop-opacity:1" />
    </linearGradient>
    
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#16A34A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#15803D;stop-opacity:1" />
    </linearGradient>
    
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.95" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0.85" />
    </linearGradient>
    
    <!-- Drop shadow filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.1"/>
    </filter>
  </defs>
  
  <!-- Background with subtle gradient -->
  <rect width="800" height="1200" fill="url(#bgGradient)"/>
  
  <!-- Decorative background elements -->
  <circle cx="100" cy="100" r="60" fill="#16A34A" opacity="0.05"/>
  <circle cx="700" cy="200" r="40" fill="#F59E0B" opacity="0.05"/>
  <circle cx="150" cy="800" r="80" fill="#16A34A" opacity="0.03"/>
  <circle cx="650" cy="900" r="50" fill="#F59E0B" opacity="0.03"/>
  
  <!-- Main receipt container -->
  <rect x="40" y="60" width="720" height="1080" rx="24" fill="url(#cardGradient)" 
        stroke="rgba(255,255,255,0.3)" stroke-width="1" filter="url(#shadow)"/>
  
  <!-- Header section -->
  <rect x="60" y="80" width="680" height="120" rx="16" fill="url(#headerGradient)"/>
  
  <!-- GOSA Logo with white background circle -->
  ${logoDataURL ?
        `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
     <image x="95" y="115" width="50" height="50" href="${logoDataURL}"/>` :
        `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
     <text x="120" y="150" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">GOSA</text>`
      }
  
  <!-- Header text -->
  <text x="180" y="125" font-family="Arial" font-size="24" font-weight="700" fill="white">GOSA 2025 Convention</text>
  <text x="180" y="150" font-family="Arial" font-size="16" font-weight="500" fill="rgba(255,255,255,0.9)">For Light and Truth</text>
  <text x="180" y="175" font-family="Arial" font-size="14" font-weight="400" fill="rgba(255,255,255,0.8)">${this.escapeXML(serviceTitle)} Receipt</text>
  
  <!-- Transaction amount - hero section -->
  <rect x="80" y="240" width="640" height="100" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(22,163,74,0.2)" stroke-width="1"/>
  <text x="400" y="270" text-anchor="middle" font-family="Arial" font-size="14" font-weight="600" fill="#6B7280">TRANSACTION AMOUNT</text>
  <text x="400" y="310" text-anchor="middle" font-family="Arial" font-size="42" font-weight="800" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
  
  <!-- Success badge -->
  <rect x="320" y="320" width="160" height="32" rx="16" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/>
  <circle cx="340" cy="336" r="6" fill="#16A34A"/>
  <text x="355" y="341" font-family="Arial" font-size="14" font-weight="600" fill="#166534">Successful</text>
  
  <!-- Personal Information Card -->
  <rect x="80" y="380" width="640" height="140" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  <rect x="80" y="380" width="4" height="140" rx="2" fill="#16A34A"/>
  <text x="100" y="405" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">PERSONAL INFORMATION</text>
  
  <!-- Two column layout for personal info -->
  <text x="100" y="435" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">FULL NAME</text>
  <text x="100" y="455" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.name)}</text>
  
  <text x="420" y="435" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">EMAIL ADDRESS</text>
  <text x="420" y="455" font-family="Arial" font-size="14" font-weight="500" fill="#1F2937">${this.escapeXML(data.userDetails.email)}</text>
  
  <text x="100" y="485" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PHONE NUMBER</text>
  <text x="100" y="505" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.phone)}</text>
  
  <!-- Transaction Details Card -->
  <rect x="80" y="540" width="640" height="160" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  <rect x="80" y="540" width="4" height="160" rx="2" fill="#F59E0B"/>
  <text x="100" y="565" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">TRANSACTION DETAILS</text>
  
  <text x="100" y="595" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PAYMENT REFERENCE</text>
  <text x="100" y="615" font-family="Arial" font-size="13" font-weight="600" fill="#1F2937">${this.escapeXML(data.operationDetails.paymentReference)}</text>
  
  <text x="420" y="595" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">DATE &amp; TIME</text>
  <text x="420" y="615" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${new Date(data.operationDetails.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</text>
  
  <text x="100" y="645" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">SERVICE TYPE</text>
  <text x="100" y="665" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${this.escapeXML(serviceTitle)}</text>
  
  <text x="420" y="645" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PAYMENT METHOD</text>
  <text x="420" y="665" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">Online Transfer</text>
  
  <!-- QR Code Section with modern design -->
  <rect x="80" y="720" width="640" height="240" rx="16" fill="rgba(255,255,255,0.95)" 
        stroke="rgba(22,163,74,0.3)" stroke-width="2" stroke-dasharray="8,4"/>
  <text x="400" y="750" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#16A34A">YOUR DIGITAL PASS</text>
  <text x="400" y="770" text-anchor="middle" font-family="Arial" font-size="12" font-weight="400" fill="#6B7280">Scan this QR code at the event</text>
  
  <!-- QR Code with subtle shadow -->
  ${qrCodeDataURL ?
        `<rect x="310" y="785" width="180" height="180" rx="12" fill="white" filter="url(#shadow)"/>
     <image x="310" y="785" width="180" height="180" href="${qrCodeDataURL}"/>` :
        `<rect x="310" y="785" width="180" height="180" rx="12" fill="white" stroke="#E5E7EB" stroke-width="1"/>
     <text x="400" y="885" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B7280">QR Code</text>`
      }
  
  <!-- Instructions Card -->
  <rect x="80" y="980" width="640" height="120" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  <rect x="80" y="980" width="4" height="120" rx="2" fill="#16A34A"/>
  <text x="100" y="1005" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">IMPORTANT INSTRUCTIONS</text>
  
  <text x="100" y="1030" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Save this receipt to your device for your records</text>
  <text x="100" y="1050" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Present the QR code when required at the event</text>
  <text x="100" y="1070" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Contact support@gosa.org for any assistance</text>
  
  <!-- Footer -->
  <rect x="60" y="1120" width="680" height="60" rx="16" fill="rgba(249,250,251,0.9)"/>
  <text x="400" y="1140" text-anchor="middle" font-family="Arial" font-size="14" font-weight="600" fill="#16A34A">GOSA 2025 Convention Team</text>
  <text x="400" y="1160" text-anchor="middle" font-family="Arial" font-size="12" font-weight="400" fill="#6B7280">www.gosa.events • support@gosa.org</text>
  
  <!-- Decorative elements -->
  <circle cx="720" cy="120" r="3" fill="rgba(245,158,11,0.6)"/>
  <circle cx="100" cy="1150" r="2" fill="rgba(22,163,74,0.4)"/>
</svg>`;

    return svg;
  }

  /**
   * Generate image and upload to Vercel Blob storage
   */
  static async generateAndUploadToBlob(data: ImageData): Promise<string> {
    try {
      const { ImageBlobService } = await import('./image-blob.service');

      // Generate image buffer
      const imageBuffer = await this.generateImageBuffer(data);

      // Determine the correct file extension based on content
      const isPNG = imageBuffer.length >= 8 &&
        imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 &&
        imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;

      const isSVG = imageBuffer.toString('utf8', 0, Math.min(100, imageBuffer.length)).includes('<svg');

      // Generate blob filename with correct extension
      const baseFilename = ImageBlobService.generateBlobFilename(data.userDetails, data.operationDetails.type);
      const filename = isPNG ? baseFilename.replace(/\.(svg|png)$/, '.png') :
        isSVG ? baseFilename.replace(/\.(svg|png)$/, '.svg') :
          baseFilename;

      console.log(`[IMAGE-GENERATOR] Generated ${isPNG ? 'PNG' : isSVG ? 'SVG' : 'unknown'} image (${imageBuffer.length} bytes)`);

      // Upload to Vercel Blob storage
      const blobUrl = await ImageBlobService.uploadImageToBlob(imageBuffer, filename);

      console.log(`[IMAGE-GENERATOR] Successfully uploaded image to blob: ${filename}`);
      return blobUrl;
    } catch (error) {
      console.error('[IMAGE-GENERATOR] Failed to generate and upload image to blob:', error);

      try {
        const { ImageBlobService } = await import('./image-blob.service');
        return await ImageBlobService.handleBlobUploadError(error as Error, data);
      } catch (fallbackError) {
        console.error('[IMAGE-GENERATOR] Fallback also failed:', fallbackError);
        throw new Error('Image generation and all fallbacks failed');
      }
    }
  }

  /**
   * Generate filename for image (PNG preferred for WhatsApp compatibility)
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

    // Use PNG extension for better WhatsApp compatibility
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
      'goodwill': 'Goodwill Message & Donation',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Optimize SVG for better WhatsApp compatibility
   */
  private static optimizeSVGForWhatsApp(svgContent: string): string {
    // Add XML declaration and ensure proper encoding
    let optimizedSvg = svgContent;

    if (!optimizedSvg.startsWith('<?xml')) {
      optimizedSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + optimizedSvg;
    }

    // Ensure proper namespace declarations
    if (!optimizedSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
      optimizedSvg = optimizedSvg.replace(
        '<svg',
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }

    // Add viewBox if not present for better scaling
    if (!optimizedSvg.includes('viewBox=')) {
      optimizedSvg = optimizedSvg.replace(
        'width="800" height="1200"',
        'width="800" height="1200" viewBox="0 0 800 1200"'
      );
    }

    console.log('[IMAGE-GENERATOR] Optimized SVG for WhatsApp compatibility');
    return optimizedSvg;
  }

  /**
   * Legacy fallback method for compatibility
   */
  static async generateImageBufferFallback(data: ImageData): Promise<Buffer> {
    return this.generateTextFallback(data);
  }
}