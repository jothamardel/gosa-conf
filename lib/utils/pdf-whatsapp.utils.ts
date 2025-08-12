import { PDFGeneratorService, PDFData } from '@/lib/services/pdf-generator.service';
import { Wasender } from '@/lib/wasender-api';

export interface WhatsAppPDFData {
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

export class PDFWhatsAppUtils {
  /**
   * Generate PDF and send via WhatsApp
   */
  static async generateAndSendPDF(data: WhatsAppPDFData): Promise<{
    success: boolean;
    pdfGenerated: boolean;
    whatsappSent: boolean;
    error?: string;
  }> {
    try {
      // Create PDF data
      const pdfData: PDFData = {
        userDetails: data.userDetails,
        operationDetails: data.operationDetails,
        qrCodeData: data.qrCodeData
      };

      // Generate PDF HTML
      const pdfHTML = await PDFGeneratorService.generatePDFHTML(pdfData);
      const filename = PDFGeneratorService.generateFilename(
        data.userDetails,
        data.operationDetails.type
      );

      // For now, we'll send the PDF as a link to view it
      // In production, you would convert HTML to PDF and upload to a file service
      const pdfViewUrl = `${process.env.NEXTAUTH_URL}/api/v1/pdf/view?ref=${data.operationDetails.paymentReference}`;

      // Prepare WhatsApp message
      const message = this.createWhatsAppMessage(data, pdfViewUrl);

      // Send WhatsApp message
      const whatsappResult = await Wasender.httpSenderMessage({
        to: data.userDetails.phone,
        text: message
      });

      return {
        success: true,
        pdfGenerated: true,
        whatsappSent: whatsappResult.success,
        error: whatsappResult.success ? undefined : whatsappResult.error
      };

    } catch (error: any) {
      console.error('PDF WhatsApp generation error:', error);
      return {
        success: false,
        pdfGenerated: false,
        whatsappSent: false,
        error: error.message || 'Failed to generate and send PDF'
      };
    }
  }

  /**
   * Create WhatsApp message with PDF information
   */
  private static createWhatsAppMessage(data: WhatsAppPDFData, pdfUrl: string): string {
    const { userDetails, operationDetails } = data;
    const operationTitle = this.getOperationTypeTitle(operationDetails.type);

    return `🎉 *GOSA 2025 Convention - For Light and Truth*

Dear ${userDetails.name},

Your ${operationTitle.toLowerCase()} has been ${operationDetails.status === 'confirmed' ? 'confirmed' : 'received'}! ✅

📋 *Details:*
• Service: ${operationTitle}
• Amount: ₦${operationDetails.amount.toLocaleString()}
• Reference: ${operationDetails.paymentReference}
• Date: ${operationDetails.date.toLocaleDateString()}

${operationDetails.status === 'confirmed' ?
        `🎫 *Your digital pass is ready!*
Please save this document and present your QR code at the convention.

📄 View/Download your PDF: ${pdfUrl}

⚠️ *Important:*
• Keep this QR code safe
• Present it at the convention entrance
• Contact support if you need assistance` :
        `⏳ *Payment Processing*
Your payment is being processed. You'll receive your digital pass once confirmed.`}

📞 *Need Help?*
Contact us at support@gosa.org

Thank you for joining GOSA 2025 Convention! 🙏

---
*This is an automated message from GOSA Convention Management System*`;
  }

  /**
   * Send confirmation with PDF for different operation types
   */
  static async sendConventionConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    registrationDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'convention',
        amount: registrationDetails.totalAmount,
        paymentReference: registrationDetails.paymentReference,
        date: registrationDetails.createdAt,
        status: registrationDetails.confirmed ? 'confirmed' : 'pending',
        description: `Convention registration including ${registrationDetails.accommodationType ? 'accommodation' : 'registration only'}`,
        additionalInfo: registrationDetails.accommodationType ?
          `Accommodation: ${registrationDetails.accommodationType} (${registrationDetails.numberOfGuests} guests)` :
          undefined
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  static async sendDinnerConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    dinnerDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'dinner',
        amount: dinnerDetails.totalAmount,
        paymentReference: dinnerDetails.paymentReference,
        date: dinnerDetails.createdAt,
        status: dinnerDetails.confirmed ? 'confirmed' : 'pending',
        description: `Dinner reservation for ${dinnerDetails.numberOfGuests} guests`,
        additionalInfo: `Date: ${dinnerDetails.dinnerDate} | Guests: ${dinnerDetails.numberOfGuests}`
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  static async sendAccommodationConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    accommodationDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'accommodation',
        amount: accommodationDetails.totalAmount,
        paymentReference: accommodationDetails.paymentReference,
        date: accommodationDetails.createdAt,
        status: accommodationDetails.confirmed ? 'confirmed' : 'pending',
        description: `${accommodationDetails.accommodationType} accommodation booking`,
        additionalInfo: `Check-in: ${accommodationDetails.checkInDate} | Check-out: ${accommodationDetails.checkOutDate} | Guests: ${accommodationDetails.numberOfGuests}`
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  static async sendBrochureConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    brochureDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'brochure',
        amount: brochureDetails.totalAmount,
        paymentReference: brochureDetails.paymentReference,
        date: brochureDetails.createdAt,
        status: brochureDetails.confirmed ? 'confirmed' : 'pending',
        description: `Convention brochure purchase (${brochureDetails.quantity} copies)`,
        additionalInfo: `Delivery Address: ${brochureDetails.deliveryAddress}`
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  static async sendGoodwillConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    goodwillDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'goodwill',
        amount: goodwillDetails.donationAmount,
        paymentReference: goodwillDetails.paymentReference,
        date: goodwillDetails.createdAt,
        status: goodwillDetails.confirmed ? 'confirmed' : 'pending',
        description: 'Goodwill message with donation',
        additionalInfo: goodwillDetails.message ?
          `Message: "${goodwillDetails.message.substring(0, 100)}${goodwillDetails.message.length > 100 ? '...' : ''}"` :
          'Donation only'
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  static async sendDonationConfirmation(
    userDetails: WhatsAppPDFData['userDetails'],
    donationDetails: any,
    qrCodeData: string
  ): Promise<{ success: boolean; error?: string }> {
    const data: WhatsAppPDFData = {
      userDetails,
      operationDetails: {
        type: 'donation',
        amount: donationDetails.amount,
        paymentReference: donationDetails.paymentReference,
        date: donationDetails.createdAt,
        status: donationDetails.confirmed ? 'confirmed' : 'pending',
        description: 'Donation to GOSA Convention',
        additionalInfo: donationDetails.purpose ? `Purpose: ${donationDetails.purpose}` : undefined
      },
      qrCodeData
    };

    const result = await this.generateAndSendPDF(data);
    return { success: result.success, error: result.error };
  }

  /**
   * Get operation type display title
   */
  private static getOperationTypeTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'convention': 'Convention Registration',
      'dinner': 'Dinner Reservation',
      'accommodation': 'Accommodation Booking',
      'brochure': 'Brochure Purchase',
      'goodwill': 'Goodwill Message',
      'donation': 'Donation'
    };
    return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }
}