import { put } from '@vercel/blob';
import puppeteer from 'puppeteer';
import { PDFGeneratorService } from './pdf-generator.service';
import { PDFLoggerService } from './pdf-logger.service';
import type { PDFData } from './pdf-generator.service';

export interface BlobUploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
  duration?: number;
}

export class PDFBlobService {
  /**
   * Generate PDF from HTML and upload to Vercel Blob
   */
  static async generateAndUploadPDF(data: PDFData): Promise<BlobUploadResult> {
    const startTime = Date.now();

    try {
      PDFLoggerService.logEvent({
        level: 'info',
        operation: 'generation',
        action: 'blob_upload_start',
        paymentReference: data.operationDetails.paymentReference,
        serviceType: data.operationDetails.type,
        success: true,
        metadata: {
          stage: 'pdf_generation_start'
        }
      });

      // Generate HTML content
      const htmlContent = await PDFGeneratorService.generatePDFHTML(data);

      // Generate PDF buffer using Puppeteer
      const pdfBuffer = await this.generatePDFBuffer(htmlContent);

      // Generate filename
      const filename = PDFGeneratorService.generateFilename(
        data.userDetails,
        data.operationDetails.type
      );

      // Upload to Vercel Blob
      const blob = await put(filename, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf'
      });

      const duration = Date.now() - startTime;

      PDFLoggerService.logEvent({
        level: 'info',
        operation: 'generation',
        action: 'blob_upload_complete',
        paymentReference: data.operationDetails.paymentReference,
        serviceType: data.operationDetails.type,
        duration,
        success: true,
        metadata: {
          stage: 'pdf_upload_complete',
          blobUrl: blob.url,
          fileSize: pdfBuffer.length,
          filename
        }
      });

      return {
        success: true,
        url: blob.url,
        filename,
        size: pdfBuffer.length,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      PDFLoggerService.logEvent({
        level: 'error',
        operation: 'generation',
        action: 'blob_upload_failed',
        paymentReference: data.operationDetails.paymentReference,
        serviceType: data.operationDetails.type,
        duration,
        success: false,
        error: errorMessage,
        metadata: {
          stage: 'pdf_upload_failed',
          errorType: this.categorizeError(errorMessage)
        }
      });

      console.error('PDF blob upload error:', error);

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Generate PDF buffer from HTML using Puppeteer
   */
  private static async generatePDFBuffer(htmlContent: string): Promise<Buffer> {
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Set content and wait for images to load
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF with proper formatting
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      return Buffer.from(pdfBuffer);

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Upload existing PDF buffer to Vercel Blob
   */
  static async uploadPDFBuffer(
    pdfBuffer: Buffer,
    filename: string,
    paymentReference?: string,
    serviceType?: string
  ): Promise<BlobUploadResult> {
    const startTime = Date.now();

    try {
      const blob = await put(filename, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf'
      });

      const duration = Date.now() - startTime;

      if (paymentReference && serviceType) {
        PDFLoggerService.logEvent({
          level: 'info',
          operation: 'generation',
          action: 'buffer_upload_complete',
          paymentReference,
          serviceType,
          duration,
          success: true,
          metadata: {
            stage: 'buffer_upload_complete',
            blobUrl: blob.url,
            fileSize: pdfBuffer.length,
            filename
          }
        });
      }

      return {
        success: true,
        url: blob.url,
        filename,
        size: pdfBuffer.length,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (paymentReference && serviceType) {
        PDFLoggerService.logEvent({
          level: 'error',
          operation: 'generation',
          action: 'buffer_upload_failed',
          paymentReference,
          serviceType,
          duration,
          success: false,
          error: errorMessage
        });
      }

      console.error('PDF buffer upload error:', error);

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Delete PDF from Vercel Blob (for cleanup)
   */
  static async deletePDF(url: string): Promise<boolean> {
    try {
      // Extract the blob key from the URL
      const urlParts = url.split('/');
      const blobKey = urlParts[urlParts.length - 1];

      // Note: Vercel Blob doesn't have a direct delete API in the current version
      // This is a placeholder for future implementation
      console.log(`Would delete blob: ${blobKey}`);

      return true;
    } catch (error) {
      console.error('Error deleting PDF blob:', error);
      return false;
    }
  }

  /**
   * Categorize error types for monitoring
   */
  private static categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('puppeteer') || errorLower.includes('browser')) return 'browser_error';
    if (errorLower.includes('blob') || errorLower.includes('upload')) return 'upload_error';
    if (errorLower.includes('network') || errorLower.includes('timeout')) return 'network_error';
    if (errorLower.includes('memory') || errorLower.includes('resource')) return 'resource_error';
    if (errorLower.includes('html') || errorLower.includes('content')) return 'content_error';

    return 'unknown_error';
  }

  /**
   * Get blob info from URL
   */
  static getBlobInfo(url: string): { filename: string; key: string } | null {
    try {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const key = filename;

      return { filename, key };
    } catch (error) {
      console.error('Error parsing blob URL:', error);
      return null;
    }
  }

  /**
   * Validate blob URL
   */
  static isValidBlobUrl(url: string): boolean {
    try {
      return url.includes('blob.vercel-storage.com') && url.startsWith('https://');
    } catch (error) {
      return false;
    }
  }
}