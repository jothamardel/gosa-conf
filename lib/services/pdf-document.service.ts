import { PDFGeneratorService } from './pdf-generator.service';
import { PDFData } from '../types';

export interface DocumentData {
  userDetails: {
    name: string;
    email: string;
    phone: string;
    registrationId?: string;
  };
  operationDetails: {
    type: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation';
    amount: number;
    paymentReference: string;
    date: Date;
    status: 'confirmed' | 'pending';
    description: string;
    additionalInfo?: string;
  };
  qrCodeData: string;
}

export class PDFDocumentService {
  /**
   * Generate a publicly accessible PDF URL for WhatsApp document sending
   */
  static async generateDocumentUrl(data: DocumentData): Promise<{
    documentUrl: string;
    fileName: string;
  }> {
    try {
      const pdfData: PDFData = {
        userDetails: data.userDetails,
        operationDetails: data.operationDetails,
        qrCodeData: data.qrCodeData
      };

      // Create a unique document ID based on payment reference
      const documentId = this.generateDocumentId(data.operationDetails.paymentReference);

      // Store the PDF data temporarily (in a real implementation, you'd use a database or cache)
      // For now, we'll use the PDF view endpoint with the payment reference
      const documentUrl = `${process.env.NEXTAUTH_URL}/api/v1/pdf/view?ref=${data.operationDetails.paymentReference}`;

      // Generate filename
      const fileName = this.generateFileName(data.userDetails.name, data.operationDetails.type);

      return {
        documentUrl,
        fileName
      };
    } catch (error) {
      console.error('Error generating document URL:', error);
      throw new Error('Failed to generate document URL');
    }
  }

  /**
   * Generate a unique document ID
   */
  private static generateDocumentId(paymentReference: string): string {
    const timestamp = Date.now();
    const hash = Buffer.from(`${paymentReference}_${timestamp}`).toString('base64url');
    return hash.substring(0, 16);
  }

  /**
   * Generate filename for the PDF document
   */
  private static generateFileName(userName: string, operationType: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');
    const operationTitle = this.getOperationTypeTitle(operationType);

    return `GOSA_2025_${operationTitle}_${sanitizedName}_${timestamp}.pdf`;
  }

  /**
   * Get operation type display title for filename
   */
  private static getOperationTypeTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'convention': 'Convention',
      'dinner': 'Dinner',
      'accommodation': 'Accommodation',
      'brochure': 'Brochure',
      'goodwill': 'Goodwill',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Create document data from service record
   */
  static createDocumentData(
    userDetails: DocumentData['userDetails'],
    operationDetails: DocumentData['operationDetails'],
    qrCodeData: string
  ): DocumentData {
    return {
      userDetails,
      operationDetails,
      qrCodeData
    };
  }
}