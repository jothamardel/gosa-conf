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
   * Load GOSA logo as buffer
   */
  private static async loadLogoBuffer(): Promise<Buffer | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const logoPath = path.join(process.cwd(), 'public', 'images', 'gosa.png');

      if (fs.existsSync(logoPath)) {
        return fs.readFileSync(logoPath);
      } else {
        console.warn('GOSA logo not found at:', logoPath);
        return null;
      }
    } catch (error) {
      console.error('Error loading GOSA logo:', error);
      return null;
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

    // Load GOSA logo
    let logoBuffer: Buffer | null = null;
    try {
      logoBuffer = await this.loadLogoBuffer();
      if (logoBuffer) {
        // Resize logo to appropriate size
        logoBuffer = await sharp(logoBuffer)
          .resize(60, 60, { fit: 'contain' })
          .png()
          .toBuffer();
      }
    } catch (logoError) {
      console.error('Error processing GOSA logo:', logoError);
    }

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

    // Create modern receipt-style overlay with glassmorphism effects
    const textOverlay = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#F0FDF4"/>
            <stop offset="100%" style="stop-color:#ECFDF5"/>
          </linearGradient>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#16A34A"/>
            <stop offset="100%" style="stop-color:#15803D"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
        
        <!-- Main container -->
        <rect x="40" y="40" width="720" height="920" rx="20" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        
        <!-- Header -->
        <rect x="60" y="60" width="680" height="100" rx="12" fill="url(#headerGrad)"/>
        
        <!-- Header text (positioned for logo) -->
        <text x="150" y="95" font-family="Arial" font-size="22" font-weight="bold" fill="white">GOSA 2025 Convention</text>
        <text x="150" y="120" font-family="Arial" font-size="16" fill="rgba(255,255,255,0.9)">For Light and Truth</text>
        <text x="150" y="140" font-family="Arial" font-size="14" fill="rgba(255,255,255,0.8)">${this.escapeXML(serviceTitle)} Receipt</text>
        
        <!-- Amount hero section -->
        <rect x="80" y="190" width="640" height="80" rx="12" fill="rgba(255,255,255,0.95)" stroke="rgba(22,163,74,0.2)" stroke-width="1"/>
        <text x="400" y="215" text-anchor="middle" font-family="Arial" font-size="12" font-weight="600" fill="#6B7280">TRANSACTION AMOUNT</text>
        <text x="400" y="250" text-anchor="middle" font-family="Arial" font-size="36" font-weight="800" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
        
        <!-- Success badge -->
        <rect x="320" y="255" width="160" height="28" rx="14" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/>
        <circle cx="335" cy="269" r="5" fill="#16A34A"/>
        <text x="350" y="274" font-family="Arial" font-size="12" font-weight="600" fill="#166534">Successful</text>
        
        <!-- Personal Info Card -->
        <rect x="80" y="300" width="640" height="120" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
        <rect x="80" y="300" width="3" height="120" rx="1" fill="#16A34A"/>
        <text x="95" y="320" font-family="Arial" font-size="11" font-weight="700" fill="#374151">PERSONAL INFORMATION</text>
        
        <text x="95" y="345" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">NAME</text>
        <text x="95" y="365" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.name)}</text>
        
        <text x="400" y="345" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">EMAIL</text>
        <text x="400" y="365" font-family="Arial" font-size="12" font-weight="500" fill="#1F2937">${this.escapeXML(data.userDetails.email)}</text>
        
        <text x="95" y="390" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">PHONE</text>
        <text x="95" y="410" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.phone)}</text>
        
        <!-- Transaction Details -->
        <rect x="80" y="440" width="640" height="100" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
        <rect x="80" y="440" width="3" height="100" rx="1" fill="#F59E0B"/>
        <text x="95" y="460" font-family="Arial" font-size="11" font-weight="700" fill="#374151">TRANSACTION DETAILS</text>
        
        <text x="95" y="485" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">REFERENCE</text>
        <text x="95" y="505" font-family="Arial" font-size="11" font-weight="600" fill="#1F2937">${this.escapeXML(data.operationDetails.paymentReference)}</text>
        
        <text x="400" y="485" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">DATE</text>
        <text x="400" y="505" font-family="Arial" font-size="12" font-weight="600" fill="#1F2937">${new Date(data.operationDetails.date).toLocaleDateString()}</text>
        
        <text x="95" y="525" font-family="Arial" font-size="9" font-weight="600" fill="#6B7280">SERVICE</text>
        <text x="95" y="535" font-family="Arial" font-size="12" font-weight="600" fill="#1F2937">${this.escapeXML(serviceTitle)}</text>
        
        <!-- QR Code section -->
        <rect x="80" y="560" width="640" height="200" rx="12" fill="rgba(255,255,255,0.95)" stroke="rgba(22,163,74,0.3)" stroke-width="2" stroke-dasharray="6,3"/>
        <text x="400" y="585" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#16A34A">YOUR DIGITAL PASS</text>
        <text x="400" y="605" text-anchor="middle" font-family="Arial" font-size="10" fill="#6B7280">Scan this QR code at the event</text>
        
        <!-- QR placeholder -->
        <rect x="310" y="620" width="180" height="120" rx="8" fill="white" stroke="#E5E7EB" stroke-width="1"/>
        <text x="400" y="685" text-anchor="middle" font-family="Arial" font-size="11" fill="#6B7280">QR Code will appear here</text>
        
        <!-- Instructions -->
        <rect x="80" y="780" width="640" height="100" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
        <rect x="80" y="780" width="3" height="100" rx="1" fill="#16A34A"/>
        <text x="95" y="800" font-family="Arial" font-size="11" font-weight="700" fill="#374151">INSTRUCTIONS</text>
        <text x="95" y="820" font-family="Arial" font-size="11" fill="#374151">• Save this receipt to your device</text>
        <text x="95" y="840" font-family="Arial" font-size="11" fill="#374151">• Present QR code when required</text>
        <text x="95" y="860" font-family="Arial" font-size="11" fill="#374151">• Contact support@gosa.org for help</text>
        
        <!-- Footer -->
        <rect x="60" y="900" width="680" height="50" rx="12" fill="rgba(249,250,251,0.9)"/>
        <text x="400" y="920" text-anchor="middle" font-family="Arial" font-size="12" font-weight="600" fill="#16A34A">GOSA 2025 Convention Team</text>
        <text x="400" y="940" text-anchor="middle" font-family="Arial" font-size="10" fill="#6B7280">www.gosa.events • support@gosa.org</text>
      </svg>
    `;

    const compositeOperations: any[] = [
      {
        input: Buffer.from(textOverlay),
        top: 0,
        left: 0
      }
    ];

    // Add GOSA logo if available (positioned in header with white background)
    if (logoBuffer) {
      // Create white circle background for logo
      const logoWithBg = await sharp({
        create: {
          width: 80,
          height: 80,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.95 }
        }
      })
        .composite([{
          input: logoBuffer,
          top: 10,
          left: 10
        }])
        .png()
        .toBuffer();

      compositeOperations.push({
        input: logoWithBg,
        top: 70, // Position in header
        left: 70
      });
    }

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

    // Load and convert GOSA logo to base64 data URL
    let logoDataURL = '';
    try {
      const logoBuffer = await this.loadLogoBuffer();
      if (logoBuffer) {
        // Resize logo for SVG embedding
        const resizedLogo = await sharp(logoBuffer)
          .resize(50, 50, { fit: 'contain' })
          .png()
          .toBuffer();

        logoDataURL = `data:image/png;base64,${resizedLogo.toString('base64')}`;
      }
    } catch (logoError) {
      console.error('Error processing logo for SVG:', logoError);
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
    
    <!-- Glassmorphism filter -->
    <filter id="glass" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
      <feOffset dx="0" dy="2" result="offset"/>
      <feFlood flood-color="#000000" flood-opacity="0.1"/>
      <feComposite in2="offset" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
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
  
  <!-- Main receipt container with glassmorphism -->
  <rect x="40" y="60" width="720" height="1080" rx="24" fill="url(#cardGradient)" 
        stroke="rgba(255,255,255,0.3)" stroke-width="1" filter="url(#shadow)"/>
  
  <!-- Header section -->
  <rect x="60" y="80" width="680" height="120" rx="16" fill="url(#headerGradient)" filter="url(#glass)"/>
  
  <!-- GOSA Logo with white background circle -->
  ${logoDataURL ?
        `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
     <image x="85" y="105" width="70" height="70" href="${logoDataURL}"/>` :
        `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
     <text x="120" y="150" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">GOSA</text>`
      }
  
  <!-- Header text -->
  <text x="180" y="125" font-family="Arial" font-size="24" font-weight="700" fill="white">GOSA 2025 Convention</text>
  <text x="180" y="150" font-family="Arial" font-size="16" font-weight="500" fill="rgba(255,255,255,0.9)">For Light and Truth</text>
  <text x="180" y="175" font-family="Arial" font-size="14" font-weight="400" fill="rgba(255,255,255,0.8)">${this.escapeXML(serviceTitle)} Receipt</text>
  
  <!-- Transaction amount - hero section -->
  <rect x="80" y="240" width="640" height="100" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(22,163,74,0.2)" stroke-width="1" filter="url(#glass)"/>
  <text x="400" y="270" text-anchor="middle" font-family="Arial" font-size="14" font-weight="600" fill="#6B7280">TRANSACTION AMOUNT</text>
  <text x="400" y="310" text-anchor="middle" font-family="Arial" font-size="42" font-weight="800" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
  
  <!-- Success badge -->
  <rect x="320" y="320" width="160" height="32" rx="16" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/>
  <circle cx="340" cy="336" r="6" fill="#16A34A"/>
  <text x="355" y="341" font-family="Arial" font-size="14" font-weight="600" fill="#166534">Successful</text>
  
  <!-- Personal Information Card -->
  <rect x="80" y="380" width="640" height="140" rx="16" fill="rgba(255,255,255,0.9)" 
        stroke="rgba(229,231,235,0.5)" stroke-width="1" filter="url(#glass)"/>
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
        stroke="rgba(229,231,235,0.5)" stroke-width="1" filter="url(#glass)"/>
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
        stroke="rgba(22,163,74,0.3)" stroke-width="2" stroke-dasharray="8,4" filter="url(#glass)"/>
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
        stroke="rgba(229,231,235,0.5)" stroke-width="1" filter="url(#glass)"/>
  <rect x="80" y="980" width="4" height="120" rx="2" fill="#16A34A"/>
  <text x="100" y="1005" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">IMPORTANT INSTRUCTIONS</text>
  
  <text x="100" y="1030" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Save this receipt to your device for your records</text>
  <text x="100" y="1050" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Present the QR code when required at the event</text>
  <text x="100" y="1070" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Contact support@gosa.org for any assistance</text>
  
  <!-- Footer -->
  <rect x="60" y="1120" width="680" height="60" rx="16" fill="rgba(249,250,251,0.9)" filter="url(#glass)"/>
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