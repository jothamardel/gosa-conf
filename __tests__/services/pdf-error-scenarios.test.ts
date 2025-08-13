import { WhatsAppPDFService } from '@/lib/services/whatsapp-pdf.service';
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';
import { Wasender } from '@/lib/wasender-api/wasender';
import { WhatsAppPDFData } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/wasender-api/wasender');
jest.mock('@/lib/services/pdf-generator.service');
jest.mock('@/lib/services/qr-code.service', () => ({
  QRCodeService: {
    generateQRCode: jest.fn()
  }
}));

const mockWasender = Wasender as jest.Mocked<typeof Wasender>;
const mockPDFGenerator = PDFGeneratorService as jest.Mocked<typeof PDFGeneratorService>;
const mockQRCodeService = require('@/lib/services/qr-code.service').QRCodeService;

describe('PDF Error Scenarios', () => {
  const mockData: WhatsAppPDFData = {
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
      date: new Date('2024-01-15'),
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

  describe('QR Code Generation Failures', () => {
    it('should handle QR code generation timeout', async () => {
      mockQRCodeService.generateQRCode.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('QR generation timeout')), 100)
        )
      );

      await expect(PDFGeneratorService.generatePDFHTML(mockData))
        .rejects.toThrow('QR generation timeout');
    });

    it('should handle QR code service unavailable', async () => {
      mockQRCodeService.generateQRCode.mockRejectedValue(new Error('Service unavailable'));

      await expect(PDFGeneratorService.generatePDFHTML(mockData))
        .rejects.toThrow('Service unavailable');
    });

    it('should handle invalid QR code data', async () => {
      const invalidData = {
        ...mockData,
        qrCodeData: null as any
      };

      mockQRCodeService.generateQRCode.mockRejectedValue(new Error('Invalid QR data'));

      await expect(PDFGeneratorService.generatePDFHTML(invalidData))
        .rejects.toThrow('Invalid QR data');
    });
  });

  describe('WhatsApp API Failures', () => {
    it('should handle network timeout errors', async () => {
      mockWasender.sendDocument.mockRejectedValue(new Error('Network timeout'));

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle rate limiting errors', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'Rate limit exceeded',
        data: null
      });

      mockWasender.httpSenderMessage.mockResolvedValue({
        success: false,
        message: 'Rate limit exceeded',
        data: null
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send PDF via WhatsApp');
    });

    it('should handle authentication failures', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'Authentication failed',
        data: null
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send PDF via WhatsApp');
    });

    it('should handle file size limit exceeded', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'File size limit exceeded',
        data: null
      });

      mockWasender.httpSenderMessage.mockResolvedValue({
        success: true,
        message: 'Text message sent',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('PDF link sent via WhatsApp (document delivery failed)');
    });
  });

  describe('Data Validation Failures', () => {
    it('should handle missing user details', async () => {
      const invalidData = {
        ...mockData,
        userDetails: {
          name: '',
          email: '',
          phone: '',
          registrationId: ''
        }
      };

      mockPDFGenerator.generatePDFHTML.mockResolvedValue('<html>PDF Content</html>');
      mockPDFGenerator.generateFilename.mockReturnValue('GOSA_2025_Convention__.pdf');
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(invalidData);

      expect(result.success).toBe(true);
      expect(mockWasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '',
          fileName: 'GOSA_2025_Convention__.pdf'
        })
      );
    });

    it('should handle missing operation details', async () => {
      const invalidData = {
        ...mockData,
        operationDetails: {
          ...mockData.operationDetails,
          type: '' as any,
          amount: 0,
          paymentReference: ''
        }
      };

      mockPDFGenerator.generatePDFHTML.mockResolvedValue('<html>PDF Content</html>');
      mockPDFGenerator.generateFilename.mockReturnValue('GOSA_2025__John_Doe_REG001.pdf');
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(invalidData);

      expect(result.success).toBe(true);
      expect(mockWasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          documentUrl: expect.stringContaining('ref=&format=pdf')
        })
      );
    });

    it('should handle malformed phone numbers', async () => {
      const invalidPhoneData = {
        ...mockData,
        userDetails: {
          ...mockData.userDetails,
          phone: '123-invalid-phone'
        }
      };

      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'Invalid phone number format',
        data: null
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(invalidPhoneData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send PDF via WhatsApp');
    });
  });

  describe('Concurrent Processing Failures', () => {
    it('should handle multiple simultaneous PDF generations', async () => {
      mockPDFGenerator.generatePDFHTML.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('<html>PDF</html>'), 50))
      );
      mockPDFGenerator.generateFilename.mockReturnValue('test.pdf');
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent',
        data: { messageId: 'msg123' }
      });

      const promises = Array(5).fill(null).map(() =>
        WhatsAppPDFService.generateAndSendPDF(mockData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle resource exhaustion gracefully', async () => {
      mockPDFGenerator.generatePDFHTML.mockRejectedValue(new Error('Out of memory'));

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Out of memory');
    });
  });

  describe('Environment Configuration Failures', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.NEXTAUTH_URL;

      mockPDFGenerator.generatePDFHTML.mockResolvedValue('<html>PDF Content</html>');
      mockPDFGenerator.generateFilename.mockReturnValue('test.pdf');
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(true);
      expect(mockWasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          documentUrl: expect.not.stringContaining('undefined')
        })
      );
    });

    it('should handle malformed base URLs', async () => {
      process.env.NEXTAUTH_URL = 'invalid-url';

      mockPDFGenerator.generatePDFHTML.mockResolvedValue('<html>PDF Content</html>');
      mockPDFGenerator.generateFilename.mockReturnValue('test.pdf');
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        message: 'Document sent',
        data: { messageId: 'msg123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(true);
      expect(mockWasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          documentUrl: expect.stringContaining('invalid-url')
        })
      );
    });
  });

  describe('Recovery and Retry Scenarios', () => {
    it('should successfully retry after initial failure', async () => {
      mockWasender.sendDocument
        .mockResolvedValueOnce({
          success: false,
          message: 'Temporary failure',
          data: null
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Document sent successfully',
          data: { messageId: 'msg123' }
        });

      // First call should fail and trigger fallback
      const result1 = await WhatsAppPDFService.generateAndSendPDF(mockData);
      expect(result1.success).toBe(false);

      // Second call should succeed
      const result2 = await WhatsAppPDFService.generateAndSendPDF(mockData);
      expect(result2.success).toBe(true);
    });

    it('should handle partial system recovery', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        message: 'Document service unavailable',
        data: null
      });

      mockWasender.httpSenderMessage.mockResolvedValue({
        success: true,
        message: 'Text message sent',
        data: { messageId: 'msg124' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('PDF link sent via WhatsApp (document delivery failed)');
      expect(mockWasender.sendDocument).toHaveBeenCalled();
      expect(mockWasender.httpSenderMessage).toHaveBeenCalled();
    });
  });
});