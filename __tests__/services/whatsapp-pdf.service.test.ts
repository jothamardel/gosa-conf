import { WhatsAppPDFService } from '@/lib/services/whatsapp-pdf.service';
import { WhatsAppPDFData } from '@/lib/types';
import { Wasender } from '@/lib/wasender-api/wasender';

// Mock dependencies
jest.mock('@/lib/wasender-api/wasender');
jest.mock('@/lib/services/pdf-generator.service', () => ({
  PDFGeneratorService: {
    generateFilename: jest.fn().mockReturnValue('GOSA_2025_Convention_John_Doe_REG001.pdf')
  }
}));

const mockWasender = Wasender as jest.Mocked<typeof Wasender>;

describe('WhatsAppPDFService', () => {
  const mockWhatsAppPDFData: WhatsAppPDFData = {
    userDetails: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+2348123456789',
      registrationId: 'REG001'
    },
    operationDetails: {
      type: 'convention',
      amount: 15000,
      paymentReference: 'PAY123456',
      date: new Date('2025-01-15'),
      status: 'confirmed',
      description: 'Convention Registration',
      additionalInfo: 'Standard accommodation included'
    },
    qrCodeData: 'REG001-CONVENTION'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  describe('generateAndSendPDF', () => {
    it('should successfully generate and send PDF via WhatsApp', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent successfully',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('PDF generated and sent successfully via WhatsApp');
      expect(mockWasender.sendDocument).toHaveBeenCalledWith({
        to: '+2348123456789',
        text: expect.stringContaining('Hello John Doe'),
        documentUrl: 'http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf',
        fileName: 'GOSA_2025_Convention_John_Doe_REG001.pdf'
      });
    });

    it('should create appropriate message for convention registration', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent successfully',
        data: { messageId: 'msg123' }
      });

      await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      const sentMessage = mockWasender.sendDocument.mock.calls[0][0].text;
      expect(sentMessage).toContain('Hello John Doe');
      expect(sentMessage).toContain('Convention Registration');
      expect(sentMessage).toContain('₦15,000');
      expect(sentMessage).toContain('PAY123456');
      expect(sentMessage).toContain('QR code for easy check-in');
      expect(sentMessage).toContain('GOSA 2025 Convention');
    });
  });

  describe('error handling and fallback', () => {
    it('should handle WhatsApp document sending failure with fallback', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'Document sending failed',
        data: null
      });

      mockWasender.httpSenderMessage.mockResolvedValue({
        success: true,
        message: 'Text message sent successfully',
        data: { messageId: 'msg124' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('PDF link sent via WhatsApp (document delivery failed)');
      expect(mockWasender.sendDocument).toHaveBeenCalled();
      expect(mockWasender.httpSenderMessage).toHaveBeenCalledWith({
        to: '+2348123456789',
        text: expect.stringContaining('We encountered an issue sending your PDF document directly')
      });
    });
  });
});