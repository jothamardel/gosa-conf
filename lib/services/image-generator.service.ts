import { PDFData } from '@/lib/types';
import * as QRCode from 'qrcode';

export interface ImageData extends PDFData { }

export class ImageGeneratorService {
  /**
   * Escape XML/SVG special characters
   */
  // private static escapeXML(text: string): string {
  //   return text
  //     .replace(/&/g, '&amp;')
  //     .replace(/</g, '&lt;')
  //     .replace(/>/g, '&gt;')
  //     .replace(/"/g, '&quot;')
  //     .replace(/'/g, '&#39;');
  // }



  /**
 * Generate image buffer - optimized for Vercel serverless deployment
 */
  static async generateImageBuffer(data: ImageData): Promise<Buffer> {
    try {
      console.log(`[IMAGE-GENERATOR] Generating image for ${data.operationDetails.paymentReference}`);

      // Check if we're on Vercel
      const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

      if (isVercel) {
        console.log('[IMAGE-GENERATOR] Running on Vercel, using canvas-based generation');
        return await this.generateCanvasImage(data);
      } else {
        // Try Sharp for local development
        try {
          const sharp = require('sharp');
          const svgContent = await this.generateSVGContent(data);

          const pngBuffer = await sharp(Buffer.from(svgContent))
            .png({ quality: 90, compressionLevel: 6 })
            .resize(800, 1200, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();

          console.log(`[IMAGE-GENERATOR] Sharp conversion successful (${pngBuffer.length} bytes)`);
          return pngBuffer;
        } catch (sharpError) {
          console.warn('[IMAGE-GENERATOR] Sharp failed, falling back to canvas:', sharpError);
          return await this.generateCanvasImage(data);
        }
      }

    } catch (error) {
      console.error('[IMAGE-GENERATOR] Critical error:', error);
      return this.generateTextFallback(data);
    }
  }

  /**
   * Generate image using Canvas API - works reliably on Vercel
   */
  private static async generateCanvasImage(data: ImageData): Promise<Buffer> {
    try {
      const { createCanvas, loadImage, registerFont } = require('canvas');

      // Create canvas
      const width = 800;
      const height = 1200;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Set background
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(0, 0, width, height);

      // Main container
      ctx.fillStyle = 'white';
      ctx.fillRect(40, 40, 720, 1120);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, 720, 1120);

      // Header background
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(60, 60, 680, 100);

      // Logo circle
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(120, 110, 30, 0, 2 * Math.PI);
      ctx.fill();

      // Load and draw logo if available
      try {
        const logoBuffer = await this.loadLogoBuffer();
        if (logoBuffer) {
          const logoImage = await loadImage(logoBuffer);
          ctx.drawImage(logoImage, 95, 85, 50, 50);
        } else {
          // Fallback logo text
          ctx.fillStyle = '#16A34A';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('GOSA', 120, 118);
        }
      } catch (logoError) {
        console.warn('[IMAGE-GENERATOR] Logo loading failed:', logoError);
        // Draw fallback
        ctx.fillStyle = '#16A34A';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GOSA', 120, 118);
      }

      // Header text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('GOSA 2025 Convention', 170, 95);
      ctx.font = '16px Arial';
      ctx.fillText('Payment Receipt', 170, 115);
      ctx.font = '14px Arial';
      ctx.fillText(this.getServiceTitle(data.operationDetails.type), 170, 135);

      // Amount section
      ctx.fillStyle = '#F0FDF4';
      ctx.fillRect(80, 200, 640, 80);
      ctx.strokeStyle = '#16A34A';
      ctx.strokeRect(80, 200, 640, 80);

      ctx.fillStyle = '#6B7280';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('AMOUNT PAID', 400, 225);

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(`₦${data.operationDetails.amount.toLocaleString()}`, 400, 260);

      // Success indicator
      ctx.fillStyle = '#DCFCE7';
      ctx.fillRect(350, 275, 100, 25);
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(365, 287, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Successful', 375, 292);

      // Personal details section
      ctx.fillStyle = '#FAFAFA';
      ctx.fillRect(80, 320, 640, 120);
      ctx.strokeStyle = '#E5E7EB';
      ctx.strokeRect(80, 320, 640, 120);

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('PERSONAL INFORMATION', 100, 345);

      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial';
      ctx.fillText('Name:', 100, 365);
      ctx.font = '14px Arial';
      ctx.fillText(this.truncateText(data.userDetails.name, 35), 100, 380);

      ctx.font = '11px Arial';
      ctx.fillText('Email:', 100, 400);
      ctx.font = '12px Arial';
      ctx.fillText(this.truncateText(data.userDetails.email, 40), 100, 415);

      ctx.font = '11px Arial';
      ctx.fillText('Phone:', 420, 365);
      ctx.font = '14px Arial';
      ctx.fillText(data.userDetails.phone, 420, 380);

      // Transaction details
      ctx.fillStyle = '#FAFAFA';
      ctx.fillRect(80, 460, 640, 140);
      ctx.strokeStyle = '#E5E7EB';
      ctx.strokeRect(80, 460, 640, 140);

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('TRANSACTION DETAILS', 100, 485);

      const details = [
        { label: 'Reference:', value: this.truncateText(data.operationDetails.paymentReference, 25), x: 100, y: 510 },
        { label: 'Date:', value: new Date(data.operationDetails.date).toLocaleDateString(), x: 100, y: 545 },
        { label: 'Service:', value: this.truncateText(this.getServiceTitle(data.operationDetails.type), 25), x: 420, y: 510 },
        { label: 'Method:', value: 'Online Payment', x: 420, y: 545 }
      ];

      details.forEach(detail => {
        ctx.fillStyle = '#6B7280';
        ctx.font = '11px Arial';
        ctx.fillText(detail.label, detail.x, detail.y);
        ctx.fillStyle = '#374151';
        ctx.font = '12px Arial';
        ctx.fillText(detail.value, detail.x, detail.y + 15);
      });

      // QR Code section
      ctx.fillStyle = 'white';
      ctx.fillRect(80, 620, 640, 200);
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 620, 640, 200);

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Event Access QR Code', 400, 645);

      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.fillText('Present this at the event', 400, 665);

      // Generate and draw QR code
      try {
        const qrCodeBuffer = await this.generateQRCodeBuffer(data.qrCodeData);
        if (qrCodeBuffer) {
          const qrImage = await loadImage(qrCodeBuffer);
          ctx.drawImage(qrImage, 320, 680, 160, 160);
        } else {
          // QR code fallback
          ctx.fillStyle = '#F3F4F6';
          ctx.fillRect(320, 680, 160, 160);
          ctx.strokeStyle = '#D1D5DB';
          ctx.strokeRect(320, 680, 160, 160);
          ctx.fillStyle = '#6B7280';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('QR Code', 400, 770);
        }
      } catch (qrError) {
        console.warn('[IMAGE-GENERATOR] QR code generation failed:', qrError);
        // Draw QR placeholder
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(320, 680, 160, 160);
        ctx.strokeStyle = '#D1D5DB';
        ctx.strokeRect(320, 680, 160, 160);
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 400, 770);
      }

      // Instructions
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(80, 840, 640, 100);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, 840, 640, 100);

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('IMPORTANT NOTES:', 100, 865);

      const instructions = [
        '• Save this receipt for your records',
        '• Show QR code at event registration',
        '• Contact support@gosa.org for help'
      ];

      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      instructions.forEach((instruction, index) => {
        ctx.fillText(instruction, 100, 885 + (index * 20));
      });

      // Footer
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(60, 960, 680, 80);

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GOSA 2025 Convention', 400, 985);

      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.fillText('www.gosa.events', 400, 1005);
      ctx.fillText(`Generated on ${new Date().toLocaleDateString()}`, 400, 1020);

      // Convert to PNG buffer
      return canvas.toBuffer('image/png');

    } catch (canvasError) {
      console.error('[IMAGE-GENERATOR] Canvas generation failed:', canvasError);
      throw canvasError;
    }
  }

  /**
   * Generate QR code as buffer for canvas
   */
  private static async generateQRCodeBuffer(qrData: string): Promise<Buffer | null> {
    try {
      const QRCode = require('qrcode');
      return await QRCode.toBuffer(qrData, {
        width: 160,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#16A34A',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('[IMAGE-GENERATOR] QR code buffer generation failed:', error);
      return null;
    }
  }

  /**
   * Load logo buffer with proper error handling
   */
  private static async loadLogoBuffer(): Promise<Buffer | null> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Try multiple possible logo locations
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'logo.png'),
        path.join(process.cwd(), 'assets', 'logo.png'),
        path.join(process.cwd(), 'public', 'images', 'logo.png'),
        path.join(__dirname, '..', 'assets', 'logo.png')
      ];

      for (const logoPath of possiblePaths) {
        try {
          const buffer = await fs.readFile(logoPath);
          console.log(`[IMAGE-GENERATOR] Logo loaded from: ${logoPath}`);
          return buffer;
        } catch (error) {
          continue; // Try next path
        }
      }

      console.warn('[IMAGE-GENERATOR] No logo found in any expected location');
      return null;
    } catch (error) {
      console.error('[IMAGE-GENERATOR] Logo loading error:', error);
      return null;
    }
  }

  /**
   * Generate fallback SVG for environments where Canvas fails
   */
  private static async generateSVGContent(data: ImageData): Promise<string> {
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);
    const formattedDate = new Date(data.operationDetails.date).toLocaleDateString();

    return `<svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="1200" fill="#F9FAFB"/>
  <rect x="40" y="40" width="720" height="1120" rx="20" fill="white" stroke="#E5E7EB"/>
  <rect x="60" y="60" width="680" height="100" rx="15" fill="#16A34A"/>
  
  <circle cx="120" cy="110" r="30" fill="white"/>
  <text x="120" y="118" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#16A34A">GOSA</text>
  
  <text x="170" y="95" font-family="Arial" font-size="24" font-weight="bold" fill="white">GOSA 2025 Convention</text>
  <text x="170" y="115" font-family="Arial" font-size="16" fill="white">Payment Receipt</text>
  <text x="170" y="135" font-family="Arial" font-size="14" fill="white">${this.escapeXML(serviceTitle)}</text>
  
  <rect x="80" y="200" width="640" height="80" rx="10" fill="#F0FDF4" stroke="#16A34A"/>
  <text x="400" y="225" text-anchor="middle" font-family="Arial" font-size="11" fill="#6B7280">AMOUNT PAID</text>
  <text x="400" y="260" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>
  
  <rect x="350" y="275" width="100" height="25" rx="12" fill="#DCFCE7"/>
  <circle cx="365" cy="287" r="4" fill="#16A34A"/>
  <text x="375" y="292" font-family="Arial" font-size="14" font-weight="bold" fill="#16A34A">Successful</text>
  
  <rect x="80" y="320" width="640" height="120" rx="10" fill="#FAFAFA" stroke="#E5E7EB"/>
  <text x="100" y="345" font-family="Arial" font-size="11" font-weight="bold" fill="#6B7280">PERSONAL INFORMATION</text>
  <text x="100" y="365" font-family="Arial" font-size="11" fill="#6B7280">Name:</text>
  <text x="100" y="380" font-family="Arial" font-size="14" fill="#374151">${this.escapeXML(this.truncateText(data.userDetails.name, 35))}</text>
  <text x="100" y="400" font-family="Arial" font-size="11" fill="#6B7280">Email:</text>
  <text x="100" y="415" font-family="Arial" font-size="12" fill="#374151">${this.escapeXML(this.truncateText(data.userDetails.email, 40))}</text>
  <text x="420" y="365" font-family="Arial" font-size="11" fill="#6B7280">Phone:</text>
  <text x="420" y="380" font-family="Arial" font-size="14" fill="#374151">${this.escapeXML(data.userDetails.phone)}</text>
  
  <rect x="80" y="620" width="640" height="200" rx="10" fill="white" stroke="#16A34A" stroke-width="2"/>
  <text x="400" y="645" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#16A34A">Event Access QR Code</text>
  <text x="400" y="665" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">Present this at the event</text>
  <rect x="320" y="680" width="160" height="160" rx="8" fill="#F3F4F6" stroke="#D1D5DB"/>
  <text x="400" y="770" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B7280">QR Code Available in PNG version</text>
</svg>`;
  }

  /**
   * Helper methods
   */
  private static truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private static escapeXML(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static generateTextFallback(data: ImageData): Buffer {
    const fallbackText = `GOSA 2025 CONVENTION RECEIPT\n\nPayment Reference: ${data.operationDetails.paymentReference}\nAmount: ₦${data.operationDetails.amount.toLocaleString()}\nName: ${data.userDetails.name}\nEmail: ${data.userDetails.email}\nPhone: ${data.userDetails.phone}\nDate: ${new Date(data.operationDetails.date).toLocaleDateString()}\n\nStatus: SUCCESSFUL\n\nContact: support@gosa.org`;
    return Buffer.from(fallbackText, 'utf-8');
  }

  //   /**
  //    * Generate image buffer - converts SVG to PNG for WhatsApp compatibility
  //    */
  //   static async generateImageBuffer(data: ImageData): Promise<Buffer> {
  //     try {
  //       console.log(`[IMAGE-GENERATOR] Generating image for ${data.operationDetails.paymentReference}`);

  //       // Generate SVG content first
  //       const svgContent = await this.generateSVGContent(data);

  //       // Try to convert SVG to PNG for better WhatsApp compatibility
  //       try {
  //         // Check if we're in a production environment where Sharp might not be available
  //         const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  //         // Dynamic import for Sharp to handle production environment issues
  //         let sharp: any = null;
  //         let sharpAvailable = false;

  //         try {
  //           sharp = require('sharp');
  //           // Test if Sharp actually works by creating a simple buffer
  //           await sharp({
  //             create: {
  //               width: 1,
  //               height: 1,
  //               channels: 4,
  //               background: { r: 255, g: 255, b: 255, alpha: 1 }
  //             }
  //           }).png().toBuffer();
  //           sharpAvailable = true;
  //           console.log('[IMAGE-GENERATOR] Sharp is available and working');
  //         } catch (sharpError) {
  //           console.warn('[IMAGE-GENERATOR] Sharp not available or not working:', sharpError instanceof Error ? sharpError.message : 'Unknown error');
  //           sharpAvailable = false;
  //         }

  //         if (sharpAvailable && sharp) {
  //           console.log('[IMAGE-GENERATOR] Converting SVG to PNG using Sharp');
  //           const pngBuffer = await sharp(Buffer.from(svgContent))
  //             .png({
  //               quality: 95,
  //               compressionLevel: 6,
  //               progressive: false
  //             })
  //             .resize(800, 1200, {
  //               fit: 'contain',
  //               background: { r: 255, g: 255, b: 255, alpha: 1 }
  //             })
  //             .toBuffer();

  //           console.log(`[IMAGE-GENERATOR] Successfully converted to PNG (${pngBuffer.length} bytes)`);
  //           return pngBuffer;
  //         } else {
  //           // Fallback to Canvas-based PNG generation if Sharp is not available
  //           console.log('[IMAGE-GENERATOR] Sharp not available, trying Canvas-based PNG generation');

  //           try {
  //             const canvasPngBuffer = await this.generatePNGWithCanvas(data);
  //             console.log(`[IMAGE-GENERATOR] Successfully generated PNG with Canvas (${canvasPngBuffer.length} bytes)`);
  //             return canvasPngBuffer;
  //           } catch (canvasError) {
  //             console.warn('[IMAGE-GENERATOR] Canvas PNG generation failed, using optimized SVG:', canvasError instanceof Error ? canvasError.message : 'Unknown error');

  //             // Final fallback to optimized SVG
  //             const optimizedSvg = this.optimizeSVGForWhatsApp(svgContent);
  //             return Buffer.from(optimizedSvg, 'utf-8');
  //           }
  //         }
  //       } catch (conversionError) {
  //         console.warn('[IMAGE-GENERATOR] PNG conversion failed, using SVG:', conversionError);
  //         return Buffer.from(svgContent, 'utf-8');
  //       }

  //     } catch (error) {
  //       console.error('[IMAGE-GENERATOR] Failed to generate image:', error);
  //       // Ultimate fallback to simple text
  //       return this.generateTextFallback(data);
  //     }
  //   }

  //   /**
  //  * Generate modern SVG receipt without Sharp dependencies
  //  */
  //   private static async generateSVGContent(data: ImageData): Promise<string> {
  //     const serviceTitle = this.getServiceTitle(data.operationDetails.type);

  //     // Generate QR code as data URL
  //     let qrCodeDataURL = '';
  //     try {
  //       qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
  //         width: 180,
  //         margin: 2,
  //         errorCorrectionLevel: 'M',
  //         color: {
  //           dark: '#16A34A',
  //           light: '#ffffff'
  //         }
  //       }) as string;
  //     } catch (qrError) {
  //       console.error('[IMAGE-GENERATOR] QR code generation failed:', qrError);
  //     }

  //     // Load GOSA logo as base64 (no Sharp resizing)
  //     let logoDataURL = '';
  //     let logoIsSVG = false;
  //     try {
  //       const logoBuffer = await this.loadLogoBuffer();
  //       if (logoBuffer) {
  //         // Check if the logo buffer is SVG or PNG
  //         const bufferStart = logoBuffer.toString('utf8', 0, Math.min(100, logoBuffer.length));
  //         logoIsSVG = bufferStart.includes('<svg');

  //         if (logoIsSVG) {
  //           logoDataURL = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
  //           console.log('[IMAGE-GENERATOR] Using SVG fallback logo');
  //         } else {
  //           logoDataURL = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  //           console.log('[IMAGE-GENERATOR] Using PNG logo');
  //         }
  //       }
  //     } catch (logoError) {
  //       console.error('[IMAGE-GENERATOR] Error processing logo:', logoError);
  //     }

  //     // Modern glassmorphism receipt design
  //     const svg = `<svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
  //   <defs>
  //     <!-- Gradients for modern design -->
  //     <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  //       <stop offset="0%" style="stop-color:#F0FDF4;stop-opacity:1" />
  //       <stop offset="50%" style="stop-color:#ECFDF5;stop-opacity:1" />
  //       <stop offset="100%" style="stop-color:#F7FEF0;stop-opacity:1" />
  //     </linearGradient>

  //     <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  //       <stop offset="0%" style="stop-color:#16A34A;stop-opacity:1" />
  //       <stop offset="100%" style="stop-color:#15803D;stop-opacity:1" />
  //     </linearGradient>

  //     <linearGradient id="cardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
  //       <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.95" />
  //       <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0.85" />
  //     </linearGradient>

  //     <!-- Drop shadow filter -->
  //     <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
  //       <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.1"/>
  //     </filter>
  //   </defs>

  //   <!-- Background with subtle gradient -->
  //   <rect width="800" height="1200" fill="url(#bgGradient)"/>

  //   <!-- Decorative background elements -->
  //   <circle cx="100" cy="100" r="60" fill="#16A34A" opacity="0.05"/>
  //   <circle cx="700" cy="200" r="40" fill="#F59E0B" opacity="0.05"/>
  //   <circle cx="150" cy="800" r="80" fill="#16A34A" opacity="0.03"/>
  //   <circle cx="650" cy="900" r="50" fill="#F59E0B" opacity="0.03"/>

  //   <!-- Main receipt container -->
  //   <rect x="40" y="60" width="720" height="1080" rx="24" fill="url(#cardGradient)" 
  //         stroke="rgba(255,255,255,0.3)" stroke-width="1" filter="url(#shadow)"/>

  //   <!-- Header section -->
  //   <rect x="60" y="80" width="680" height="120" rx="16" fill="url(#headerGradient)"/>

  //   <!-- GOSA Logo with white background circle -->
  //   ${logoDataURL ?
  //         `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
  //      <image x="95" y="115" width="50" height="50" href="${logoDataURL}"/>` :
  //         `<circle cx="120" cy="140" r="35" fill="white" opacity="0.95"/>
  //      <text x="120" y="150" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#16A34A">GOSA</text>`
  //       }

  //   <!-- Header text -->
  //   <text x="180" y="125" font-family="Arial" font-size="24" font-weight="700" fill="white">GOSA 2025 Convention</text>
  //   <text x="180" y="150" font-family="Arial" font-size="16" font-weight="500" fill="rgba(255,255,255,0.9)">For Light and Truth</text>
  //   <text x="180" y="175" font-family="Arial" font-size="14" font-weight="400" fill="rgba(255,255,255,0.8)">${this.escapeXML(serviceTitle)} Receipt</text>

  //   <!-- Transaction amount - hero section -->
  //   <rect x="80" y="240" width="640" height="100" rx="16" fill="rgba(255,255,255,0.9)" 
  //         stroke="rgba(22,163,74,0.2)" stroke-width="1"/>
  //   <text x="400" y="270" text-anchor="middle" font-family="Arial" font-size="14" font-weight="600" fill="#6B7280">TRANSACTION AMOUNT</text>
  //   <text x="400" y="310" text-anchor="middle" font-family="Arial" font-size="42" font-weight="800" fill="#16A34A">₦${data.operationDetails.amount.toLocaleString()}</text>

  //   <!-- Success badge -->
  //   <rect x="320" y="320" width="160" height="32" rx="16" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/>
  //   <circle cx="340" cy="336" r="6" fill="#16A34A"/>
  //   <text x="355" y="341" font-family="Arial" font-size="14" font-weight="600" fill="#166534">Successful</text>

  //   <!-- Personal Information Card -->
  //   <rect x="80" y="380" width="640" height="140" rx="16" fill="rgba(255,255,255,0.9)" 
  //         stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  //   <rect x="80" y="380" width="4" height="140" rx="2" fill="#16A34A"/>
  //   <text x="100" y="405" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">PERSONAL INFORMATION</text>

  //   <!-- Two column layout for personal info -->
  //   <text x="100" y="435" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">FULL NAME</text>
  //   <text x="100" y="455" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.name)}</text>

  //   <text x="420" y="435" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">EMAIL ADDRESS</text>
  //   <text x="420" y="455" font-family="Arial" font-size="14" font-weight="500" fill="#1F2937">${this.escapeXML(data.userDetails.email)}</text>

  //   <text x="100" y="485" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PHONE NUMBER</text>
  //   <text x="100" y="505" font-family="Arial" font-size="16" font-weight="600" fill="#1F2937">${this.escapeXML(data.userDetails.phone)}</text>

  //   <!-- Transaction Details Card -->
  //   <rect x="80" y="540" width="640" height="160" rx="16" fill="rgba(255,255,255,0.9)" 
  //         stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  //   <rect x="80" y="540" width="4" height="160" rx="2" fill="#F59E0B"/>
  //   <text x="100" y="565" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">TRANSACTION DETAILS</text>

  //   <text x="100" y="595" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PAYMENT REFERENCE</text>
  //   <text x="100" y="615" font-family="Arial" font-size="13" font-weight="600" fill="#1F2937">${this.escapeXML(data.operationDetails.paymentReference)}</text>

  //   <text x="420" y="595" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">DATE &amp; TIME</text>
  //   <text x="420" y="615" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${new Date(data.operationDetails.date).toLocaleDateString('en-US', {
  //         year: 'numeric',
  //         month: 'long',
  //         day: 'numeric'
  //       })}</text>

  //   <text x="100" y="645" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">SERVICE TYPE</text>
  //   <text x="100" y="665" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">${this.escapeXML(serviceTitle)}</text>

  //   <text x="420" y="645" font-family="Arial" font-size="10" font-weight="600" fill="#6B7280">PAYMENT METHOD</text>
  //   <text x="420" y="665" font-family="Arial" font-size="14" font-weight="600" fill="#1F2937">Online Transfer</text>

  //   <!-- QR Code Section with modern design -->
  //   <rect x="80" y="720" width="640" height="240" rx="16" fill="rgba(255,255,255,0.95)" 
  //         stroke="rgba(22,163,74,0.3)" stroke-width="2" stroke-dasharray="8,4"/>
  //   <text x="400" y="750" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#16A34A">YOUR DIGITAL PASS</text>
  //   <text x="400" y="770" text-anchor="middle" font-family="Arial" font-size="12" font-weight="400" fill="#6B7280">Scan this QR code at the event</text>

  //   <!-- QR Code with subtle shadow -->
  //   ${qrCodeDataURL ?
  //         `<rect x="310" y="785" width="180" height="180" rx="12" fill="white" filter="url(#shadow)"/>
  //      <image x="310" y="785" width="180" height="180" href="${qrCodeDataURL}"/>` :
  //         `<rect x="310" y="785" width="180" height="180" rx="12" fill="white" stroke="#E5E7EB" stroke-width="1"/>
  //      <text x="400" y="885" text-anchor="middle" font-family="Arial" font-size="12" fill="#6B7280">QR Code</text>`
  //       }

  //   <!-- Instructions Card -->
  //   <rect x="80" y="980" width="640" height="120" rx="16" fill="rgba(255,255,255,0.9)" 
  //         stroke="rgba(229,231,235,0.5)" stroke-width="1"/>
  //   <rect x="80" y="980" width="4" height="120" rx="2" fill="#16A34A"/>
  //   <text x="100" y="1005" font-family="Arial" font-size="12" font-weight="700" fill="#374151" letter-spacing="1px">IMPORTANT INSTRUCTIONS</text>

  //   <text x="100" y="1030" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Save this receipt to your device for your records</text>
  //   <text x="100" y="1050" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Present the QR code when required at the event</text>
  //   <text x="100" y="1070" font-family="Arial" font-size="13" font-weight="500" fill="#374151">• Contact support@gosa.org for any assistance</text>

  //   <!-- Footer -->
  //   <rect x="60" y="1120" width="680" height="60" rx="16" fill="rgba(249,250,251,0.9)"/>
  //   <text x="400" y="1140" text-anchor="middle" font-family="Arial" font-size="14" font-weight="600" fill="#16A34A">GOSA 2025 Convention Team</text>
  //   <text x="400" y="1160" text-anchor="middle" font-family="Arial" font-size="12" font-weight="400" fill="#6B7280">www.gosa.events • support@gosa.org</text>

  //   <!-- Decorative elements -->
  //   <circle cx="720" cy="120" r="3" fill="rgba(245,158,11,0.6)"/>
  //   <circle cx="100" cy="1150" r="2" fill="rgba(22,163,74,0.4)"/>
  // </svg>`;

  //     return svg;
  //   }

  /**
   * Load GOSA logo as buffer with multiple fallback paths
   */
  //   private static async loadLogoBuffer(): Promise<Buffer | null> {
  //     try {
  //       const fs = await import('fs');
  //       const path = await import('path');

  //       // Try multiple possible logo paths for different environments
  //       const possiblePaths = [
  //         path.join(process.cwd(), 'public', 'images', 'gosa.png'),
  //         path.join(process.cwd(), 'public', 'gosa.png'),
  //         path.join(__dirname, '..', '..', 'public', 'images', 'gosa.png'),
  //         path.join(__dirname, '..', '..', 'public', 'gosa.png'),
  //         './public/images/gosa.png',
  //         './public/gosa.png'
  //       ];

  //       for (const logoPath of possiblePaths) {
  //         try {
  //           if (fs.existsSync(logoPath)) {
  //             console.log('[IMAGE-GENERATOR] Found GOSA logo at:', logoPath);
  //             return fs.readFileSync(logoPath);
  //           }
  //         } catch (pathError) {
  //           // Continue to next path
  //           continue;
  //         }
  //       }

  //       console.warn('[IMAGE-GENERATOR] GOSA logo not found in any of the expected paths, using fallback');

  //       // Return a simple base64 encoded placeholder logo
  //       // This is a minimal 50x50 green circle with "GOSA" text as fallback
  //       const fallbackLogoSvg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
  //         <circle cx="25" cy="25" r="24" fill="#16A34A" stroke="#15803D" stroke-width="2"/>
  //         <text x="25" y="30" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="white">GOSA</text>
  //       </svg>`;

  //       return Buffer.from(fallbackLogoSvg, 'utf-8');
  //     } catch (error) {
  //       console.error('[IMAGE-GENERATOR] Error loading GOSA logo:', error);
  //       return null;
  //     }
  //   }

  //   /**
  //    * Generate simple PNG fallback when all else fails
  //    */
  //   private static generateTextFallback(data: ImageData): Buffer {
  //     try {
  //       console.log('[IMAGE-GENERATOR] Using simple PNG fallback');

  //       // Create a simple base64-encoded PNG image with text
  //       // This is a minimal 800x600 white PNG with basic text
  //       const simplePngBase64 = this.createSimplePNGFallback(data);
  //       return Buffer.from(simplePngBase64, 'base64');
  //     } catch (error) {
  //       console.error('[IMAGE-GENERATOR] PNG fallback generation failed, using text:', error);

  //       // Ultimate text fallback
  //       const serviceTitle = this.getServiceTitle(data.operationDetails.type);
  //       const fallbackContent = `
  // GOSA 2025 Convention - For Light and Truth

  // ${serviceTitle} Confirmation

  // Name: ${data.userDetails.name}
  // Email: ${data.userDetails.email}
  // Phone: ${data.userDetails.phone}

  // Payment Details:
  // Amount: ₦${data.operationDetails.amount.toLocaleString()}
  // Reference: ${data.operationDetails.paymentReference}
  // Status: Confirmed ✅
  // Date: ${new Date(data.operationDetails.date).toLocaleDateString()}

  // QR Code: ${data.qrCodeData}

  // Important Instructions:
  // • Save this confirmation for your records
  // • Present the QR code when required
  // • Contact support@gosa.org for help

  // GOSA 2025 Convention Team
  // www.gosa.events
  //       `;

  //       return Buffer.from(fallbackContent, 'utf-8');
  //     }
  //   }

  /**
   * Create a simple base64-encoded PNG as ultimate fallback
   */
  private static createSimplePNGFallback(data: ImageData): string {
    // This is a minimal 400x600 white PNG with green header
    // Generated programmatically to show basic payment confirmation
    const serviceTitle = this.getServiceTitle(data.operationDetails.type);

    // For now, return a simple 1x1 white PNG - in production, this could be enhanced
    // with a more sophisticated base64-encoded image template
    const simplePng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    console.log('[IMAGE-GENERATOR] Generated simple PNG fallback for:', serviceTitle);
    return simplePng;
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
   * Generate PNG using Canvas API (fallback when Sharp is not available)
   */
  private static async generatePNGWithCanvas(data: ImageData): Promise<Buffer> {
    try {
      // Try to use canvas package for server-side rendering
      let Canvas: any;
      try {
        Canvas = require('canvas');
        console.log('[IMAGE-GENERATOR] Canvas package loaded successfully');
      } catch (canvasError) {
        console.error('[IMAGE-GENERATOR] Canvas package not available:', canvasError instanceof Error ? canvasError.message : 'Unknown error');
        throw new Error('Canvas package not available');
      }

      const { createCanvas, loadImage } = Canvas;
      const canvas = createCanvas(800, 1200);
      const ctx = canvas.getContext('2d');

      // Add roundRect method if not available (for older Canvas versions)
      if (!ctx.roundRect) {
        ctx.roundRect = function (x: number, y: number, width: number, height: number, radius: number) {
          this.beginPath();
          this.moveTo(x + radius, y);
          this.lineTo(x + width - radius, y);
          this.quadraticCurveTo(x + width, y, x + width, y + radius);
          this.lineTo(x + width, y + height - radius);
          this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          this.lineTo(x + radius, y + height);
          this.quadraticCurveTo(x, y + height, x, y + height - radius);
          this.lineTo(x, y + radius);
          this.quadraticCurveTo(x, y, x + radius, y);
          this.closePath();
        };
      }

      // Set white background
      ctx.fillStyle = '#F0FDF4';
      ctx.fillRect(0, 0, 800, 1200);

      // Draw main container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.roundRect(40, 60, 720, 1080, 24);
      ctx.fill();

      // Draw header
      const gradient = ctx.createLinearGradient(60, 80, 740, 80);
      gradient.addColorStop(0, '#16A34A');
      gradient.addColorStop(1, '#15803D');
      ctx.fillStyle = gradient;
      ctx.roundRect(60, 80, 680, 120, 16);
      ctx.fill();

      // Draw header text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('GOSA 2025 Convention', 180, 125);

      ctx.font = '16px Arial';
      ctx.fillText('For Light and Truth', 180, 150);

      ctx.font = '14px Arial';
      const serviceTitle = this.getServiceTitle(data.operationDetails.type);
      ctx.fillText(`${serviceTitle} Receipt`, 180, 175);

      // Draw GOSA logo placeholder (circle with text)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(120, 140, 35, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GOSA', 120, 150);

      // Draw amount section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.roundRect(80, 240, 640, 100, 16);
      ctx.fill();

      ctx.fillStyle = '#6B7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TRANSACTION AMOUNT', 400, 270);

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 42px Arial';
      ctx.fillText(`₦${data.operationDetails.amount.toLocaleString()}`, 400, 310);

      // Draw success badge
      ctx.fillStyle = '#DCFCE7';
      ctx.roundRect(320, 320, 160, 32, 16);
      ctx.fill();

      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(340, 336, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = '14px Arial';
      ctx.fillText('Successful', 400, 341);

      // Draw personal information section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.roundRect(80, 380, 640, 140, 16);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('PERSONAL INFORMATION', 100, 405);

      ctx.fillStyle = '#6B7280';
      ctx.font = '10px Arial';
      ctx.fillText('FULL NAME', 100, 435);
      ctx.fillText('EMAIL ADDRESS', 420, 435);
      ctx.fillText('PHONE NUMBER', 100, 485);

      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(data.userDetails.name, 100, 455);
      ctx.font = '14px Arial';
      ctx.fillText(data.userDetails.email, 420, 455);
      ctx.font = '16px Arial';
      ctx.fillText(data.userDetails.phone, 100, 505);

      // Draw transaction details section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.roundRect(80, 540, 640, 160, 16);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('TRANSACTION DETAILS', 100, 565);

      ctx.fillStyle = '#6B7280';
      ctx.font = '10px Arial';
      ctx.fillText('PAYMENT REFERENCE', 100, 595);
      ctx.fillText('DATE & TIME', 420, 595);
      ctx.fillText('SERVICE TYPE', 100, 645);
      ctx.fillText('PAYMENT METHOD', 420, 645);

      ctx.fillStyle = '#1F2937';
      ctx.font = '13px Arial';
      ctx.fillText(data.operationDetails.paymentReference, 100, 615);
      ctx.font = '14px Arial';
      ctx.fillText(new Date(data.operationDetails.date).toLocaleDateString(), 420, 615);
      ctx.fillText(serviceTitle, 100, 665);
      ctx.fillText('Online Transfer', 420, 665);

      // Draw QR code section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.3)';
      ctx.lineWidth = 2;
      ctx.roundRect(80, 720, 640, 240, 16);
      ctx.stroke();
      ctx.fill();
      ctx.setLineDash([]);

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('YOUR DIGITAL PASS', 400, 750);

      ctx.fillStyle = '#6B7280';
      ctx.font = '12px Arial';
      ctx.fillText('Scan this QR code at the event', 400, 770);

      // Draw QR code placeholder
      ctx.fillStyle = 'white';
      ctx.roundRect(310, 785, 180, 180, 12);
      ctx.fill();

      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.roundRect(310, 785, 180, 180, 12);
      ctx.stroke();

      // Try to generate actual QR code
      try {
        const QRCode = require('qrcode');
        const qrCodeDataURL = await QRCode.toDataURL(data.qrCodeData, {
          width: 180,
          margin: 0,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#16A34A',
            light: '#ffffff'
          }
        });

        const qrImage = await loadImage(qrCodeDataURL);
        ctx.drawImage(qrImage, 310, 785, 180, 180);
      } catch (qrError) {
        // QR code generation failed, draw placeholder
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', 400, 885);
      }

      // Draw instructions section
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.roundRect(80, 980, 640, 120, 16);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('IMPORTANT INSTRUCTIONS', 100, 1005);

      ctx.font = '13px Arial';
      ctx.fillText('• Save this receipt to your device for your records', 100, 1030);
      ctx.fillText('• Present the QR code when required at the event', 100, 1050);
      ctx.fillText('• Contact support@gosa.org for any assistance', 100, 1070);

      // Draw footer
      ctx.fillStyle = 'rgba(249, 250, 251, 0.9)';
      ctx.roundRect(60, 1120, 680, 60, 16);
      ctx.fill();

      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GOSA 2025 Convention Team', 400, 1140);

      ctx.fillStyle = '#6B7280';
      ctx.font = '12px Arial';
      ctx.fillText('www.gosa.events • support@gosa.org', 400, 1160);

      // Convert canvas to PNG buffer
      return canvas.toBuffer('image/png');

    } catch (error) {
      console.error('[IMAGE-GENERATOR] Canvas PNG generation failed:', error);
      throw error;
    }
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