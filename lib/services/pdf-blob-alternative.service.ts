import { put } from '@vercel/blob';
const jsPDF = require('jspdf');
import { PDFGeneratorService } from './pdf-generator.service';
import { PDFLoggerService } from './pdf-logger.service';
import type { PDFData } from '../types';

export interface BlobUploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
  duration?: number;
}

export class PDFBlobAlternativeService {
  /**
   * Generate PDF from data and upload to Vercel Blob (using jsPDF)
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

      // Generate PDF buffer using jsPDF
      const pdfBuffer = await this.generatePDFBuffer(data);

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
   * Generate PDF buffer from data using jsPDF
   */
  private static async generatePDFBuffer(data: PDFData): Promise<Buffer> {
    try {
      const doc = new jsPDF();

      // Set up document properties
      doc.setProperties({
        title: `${data.operationDetails.type} Receipt`,
        subject: `Payment Receipt for ${data.userDetails.name}`,
        author: 'Convention Management System',
        creator: 'Convention Management System'
      });

      // Add header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Convention Management System', 20, 30);

      doc.setFontSize(16);
      doc.text(`${data.operationDetails.type} Receipt`, 20, 45);

      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(20, 50, 190, 50);

      // Add user details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      let yPos = 65;

      doc.text('Personal Information:', 20, yPos);
      yPos += 10;
      doc.text(`Name: ${data.userDetails.name}`, 25, yPos);
      yPos += 8;
      doc.text(`Email: ${data.userDetails.email}`, 25, yPos);
      yPos += 8;
      if (data.userDetails.phone) {
        doc.text(`Phone: ${data.userDetails.phone}`, 25, yPos);
        yPos += 8;
      }

      // Add payment details
      yPos += 10;
      doc.text('Payment Details:', 20, yPos);
      yPos += 10;
      doc.text(`Payment Reference: ${data.operationDetails.paymentReference}`, 25, yPos);
      yPos += 8;
      doc.text(`Amount: $${data.operationDetails.amount.toFixed(2)}`, 25, yPos);
      yPos += 8;
      doc.text(`Date: ${new Date(data.operationDetails.date).toLocaleDateString()}`, 25, yPos);
      yPos += 8;
      doc.text(`Status: ${data.operationDetails.status}`, 25, yPos);

      // Add service-specific details
      if (data.operationDetails.type === 'convention') {
        yPos += 15;
        doc.text('Convention Details:', 20, yPos);
        yPos += 10;

        if (data.operationDetails.additionalInfo) {
          doc.text(`Details: ${data.operationDetails.additionalInfo}`, 25, yPos);
          yPos += 8;
        }
      }

      // Add QR code placeholder (text-based for now)
      if (data.qrCodeData) {
        yPos += 15;
        doc.text('QR Code Data:', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.text(data.qrCodeData, 25, yPos, { maxWidth: 160 });
      }

      // Add footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your registration!', 20, pageHeight - 30);
      doc.text('For support, please contact our team.', 20, pageHeight - 20);

      // Generate buffer
      const pdfArrayBuffer = doc.output('arraybuffer');
      return Buffer.from(pdfArrayBuffer);

    } catch (error) {
      console.error('Error generating PDF with jsPDF:', error);
      throw error;
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
   * Categorize error types for monitoring
   */
  private static categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('jspdf') || errorLower.includes('pdf')) return 'pdf_generation_error';
    if (errorLower.includes('blob') || errorLower.includes('upload')) return 'upload_error';
    if (errorLower.includes('network') || errorLower.includes('timeout')) return 'network_error';
    if (errorLower.includes('memory') || errorLower.includes('resource')) return 'resource_error';

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