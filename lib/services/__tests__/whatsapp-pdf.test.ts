import { WhatsAppPDFService, DeliveryResult } from '../whatsapp-pdf.service';
import { PDFGeneratorService } from '../pdf-generator.service';
import { PDFErrorHandlerService } from '../pdf-error-handler.service';
import { PDFMonitoringService } from '../pdf-monitoring.service';
import { Wasender } from '../../wasender-api';

// Mock dependencies
jest.mock('../pdf-generator.service');
jest.mock('../pdf-error-handler.service');
jest.mock('../pdf-monitoring.service');
jest.mock('../../wasender-api');

describe('WhatsAppPDFService', () => {
  const mockPDFGeneratorService = PDFGeneratorService as jest.Mocked<typeof PDFGeneratorService>;
  const mockPDFErrorHandlerService = PDFErrorHandlerService as jest.Mocked<typeof PDFErrorHandlerService>;
  const mockPDFMonitoringService = PDFMonitoringService as jest.Mocked<typeof PDFMonitoringService>;
  const mockWasender = Wasender as jest.Mocked<typeof Wasender>;

  const mockWhatsAppPDFData = {
    userDetails: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      registrationId: 'REG123'
    },
    operationDetails: {
      type: 'convention' as const,
      amount: 50000,
      paymentReference: 'CONV_123456',
      date: new Date(),
      status: 'confirmed' as const,
      description: 'GOSA 2025 Convention Registration',
      additionalInfo: 'Test additional info'
    },
    qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPDFErrorHandlerService.validatePDFData.mockImplementation(() => { });
    mockPDFErrorHandlerService.createErrorContext.mockReturnValue({
      paymentReference: 'CONV_123456',
      userDetails: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      },
      operationType: 'convention',
      timestamp: new Date()
    });
    mockPDFErrorHandlerService.executeWithRetry.mockImplementation(
      async (operation: any) => await operation()
    );
    mockPDFErrorHandlerService.executeFallbackDelivery.mockResolvedValue({
      success: true,
      pdfGenerated: true,
      whatsappSent: false,
      fallbackUsed: true,
      messageId: 'fallback-msg-123'
    });

    mockPDFGeneratorService.generatePDFHTML.mockResolvedValue('<html>Mock PDF HTML</html>');
    mockPDFMonitoringService.recordDeliveryMetrics.mockResolvedValue(undefined);
  });

  describe('generateAndSendPDF', () => {
    it('should successfully generate and send PDF', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        data: { msgId: 'msg-123' }
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(true);
      expect(result.pdfGenerated).toBe(true);
      expect(result.whatsappSent).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(result.fallbackUsed).toBe(false);

      expect(mockPDFErrorHandlerService.validatePDFData).toHaveBeenCalledWith(mockWhatsAppPDFData);
      expect(mockPDFErrorHandlerService.executeWithRetry).toHaveBeenCalledTimes(2); // PDF generation + WhatsApp delivery
      expect(mockPDFMonitoringService.recordDeliveryMetrics).toHaveBeenCalled();
    });

    it('should handle PDF generation failure', async () => {
      mockPDFErrorHandlerService.executeWithRetry.mockRejectedValueOnce(
        new Error('PDF generation failed')
      );

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(false);
      expect(result.pdfGenerated).toBe(false);
      expect(result.whatsappSent).toBe(false);
      expect(result.error).toContain('PDF generation failed');
      expect(result.errorType).toBe('PDF_GENERATION_FAILED');
    });

    it('should use fallback when WhatsApp delivery fails', async () => {
      mockPDFErrorHandlerService.executeWithRetry
        .mockResolvedValueOnce(undefined) // PDF generation succeeds
        .mockRejectedValueOnce(new Error('WhatsApp delivery failed')); // WhatsApp delivery fails

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(true);
      expect(result.pdfGenerated).toBe(true);
      expect(result.whatsappSent).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.messageId).toBe('fallback-msg-123');

      expect(mockPDFErrorHandlerService.executeFallbackDelivery).toHaveBeenCalledWith(
        mockWhatsAppPDFData,
        expect.any(Object)
      );
    });

    it('should handle complete delivery failure', async () => {
      mockPDFErrorHandlerService.executeWithRetry
        .mockResolvedValueOnce(undefined) // PDF generation succeeds
        .mockRejectedValueOnce(new Error('WhatsApp delivery failed')); // WhatsApp delivery fails

      mockPDFErrorHandlerService.executeFallbackDelivery.mockResolvedValue({
        success: false,
        pdfGenerated: true,
        whatsappSent: false,
        fallbackUsed: false,
        error: 'Complete delivery failure'
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(false);
      expect(result.pdfGenerated).toBe(true);
      expect(result.whatsappSent).toBe(false);
      expect(result.fallbackUsed).toBe(false);
      expect(result.error).toBe('Complete delivery failure');
    });

    it('should handle data validation errors', async () => {
      mockPDFErrorHandlerService.validatePDFData.mockImplementation(() => {
        throw new Error('Invalid PDF data');
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockPDFErrorHandlerService.createErrorContext.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });

  describe('sendPDFDocument', () => {
    it('should send PDF document successfully', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        data: { msgId: 'doc-msg-123' }
      });

      const result = await WhatsAppPDFService['sendPDFDocument'](mockWhatsAppPDFData);

      expect(result.messageId).toBe('doc-msg-123');
      expect(mockWasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          text: expect.stringContaining('GOSA 2025 Convention'),
          documentUrl: expect.stringContaining('/api/v1/pdf/download'),
          fileName: expect.stringContaining('GOSA_2025_convention')
        })
      );
    });

    it('should handle WhatsApp API failures', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: false,
        error: 'WhatsApp API error'
      });

      await expect(
        WhatsAppPDFService['sendPDFDocument'](mockWhatsAppPDFData)
      ).rejects.toThrow('WhatsApp API error');
    });

    it('should handle network errors', async () => {
      mockWasender.sendDocument.mockRejectedValue(new Error('Network error'));

      await expect(
        WhatsAppPDFService['sendPDFDocument'](mockWhatsAppPDFData)
      ).rejects.toThrow('Network error');
    });
  });

  describe('createDocumentMessage', () => {
    it('should create proper document message structure', () => {
      const documentMessage = WhatsAppPDFService['createDocumentMessage'](mockWhatsAppPDFData);

      expect(documentMessage.to).toBe('+1234567890');
      expect(documentMessage.text).toContain('GOSA 2025 Convention');
      expect(documentMessage.text).toContain('For Light and Truth');
      expect(documentMessage.text).toContain('John Doe');
      expect(documentMessage.text).toContain('Convention Registration');
      expect(documentMessage.documentUrl).toContain('/api/v1/pdf/download');
      expect(documentMessage.documentUrl).toContain('CONV_123456');
      expect(documentMessage.fileName).toContain('GOSA_2025_convention');
    });

    it('should create service-specific messages', () => {
      const dinnerData = {
        ...mockWhatsAppPDFData,
        operationDetails: {
          ...mockWhatsAppPDFData.operationDetails,
          type: 'dinner' as const,
          description: 'GOSA 2025 Convention Gala Dinner'
        }
      };

      const documentMessage = WhatsAppPDFService['createDocumentMessage'](dinnerData);

      expect(documentMessage.text).toContain('Dinner Reservation');
      expect(documentMessage.text).toContain('December 28, 2025 at 7:00 PM');
      expect(documentMessage.text).toContain('Grand Ballroom');
      expect(documentMessage.text).toContain('Formal/Black Tie');
    });
  });

  describe('Service-specific message creation', () => {
    it('should create convention-specific message content', () => {
      const content = WhatsAppPDFService['getServiceSpecificContent'](mockWhatsAppPDFData.operationDetails);

      expect(content).toContain('Registration Details');
      expect(content).toContain('₦50,000');
      expect(content).toContain('CONV_123456');
      expect(content).toContain('Dec 26-29, 2025');
    });

    it('should create dinner-specific message content', () => {
      const dinnerDetails = {
        ...mockWhatsAppPDFData.operationDetails,
        type: 'dinner' as const,
        amount: 75000
      };

      const content = WhatsAppPDFService['getServiceSpecificContent'](dinnerDetails);

      expect(content).toContain('Dinner Details');
      expect(content).toContain('₦75,000');
      expect(content).toContain('December 28, 2025 at 7:00 PM');
      expect(content).toContain('Grand Ballroom');
    });

    it('should create accommodation-specific message content', () => {
      const accommodationDetails = {
        ...mockWhatsAppPDFData.operationDetails,
        type: 'accommodation' as const,
        amount: 200000
      };

      const content = WhatsAppPDFService['getServiceSpecificContent'](accommodationDetails);

      expect(content).toContain('Accommodation Details');
      expect(content).toContain('₦200,000');
      expect(content).toContain('Dec 25, 2025 (3:00 PM)');
      expect(content).toContain('Dec 30, 2025 (11:00 AM)');
    });

    it('should create brochure-specific message content', () => {
      const brochureDetails = {
        ...mockWhatsAppPDFData.operationDetails,
        type: 'brochure' as const,
        amount: 10000
      };

      const content = WhatsAppPDFService['getServiceSpecificContent'](brochureDetails);

      expect(content).toContain('Brochure Order');
      expect(content).toContain('₦10,000');
      expect(content).toContain('Processing');
    });

    it('should create goodwill-specific message content', () => {
      const goodwillDetails = {
        ...mockWhatsAppPDFData.operationDetails,
        type: 'goodwill' as const,
        amount: 25000
      };

      const content = WhatsAppPDFService['getServiceSpecificContent'](goodwillDetails);

      expect(content).toContain('Goodwill Message');
      expect(content).toContain('₦25,000');
      expect(content).toContain('Under Review');
    });

    it('should create donation-specific message content', () => {
      const donationDetails = {
        ...mockWhatsAppPDFData.operationDetails,
        type: 'donation' as const,
        amount: 50000
      };

      const content = WhatsAppPDFService['getServiceSpecificContent'](donationDetails);

      expect(content).toContain('Donation Receipt');
      expect(content).toContain('₦50,000');
      expect(content).toContain('Receipt Number');
    });
  });

  describe('Service-specific instructions', () => {
    it('should provide convention-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('convention');

      expect(instructions).toContain('Next Steps');
      expect(instructions).toContain('Present QR code at convention entrance');
      expect(instructions).toContain('Arrive early for check-in');
      expect(instructions).toContain('Bring valid ID');
    });

    it('should provide dinner-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('dinner');

      expect(instructions).toContain('Dinner Instructions');
      expect(instructions).toContain('Dress code: Formal/Black Tie');
      expect(instructions).toContain('Arrive by 6:30 PM');
      expect(instructions).toContain('Present QR code at venue entrance');
    });

    it('should provide accommodation-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('accommodation');

      expect(instructions).toContain('Check-in Instructions');
      expect(instructions).toContain('Present this confirmation at hotel reception');
      expect(instructions).toContain('Bring valid ID');
      expect(instructions).toContain('Early check-in available');
    });

    it('should provide brochure-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('brochure');

      expect(instructions).toContain('Delivery Information');
      expect(instructions).toContain('notified when ready for pickup');
      expect(instructions).toContain('Present QR code for collection');
    });

    it('should provide goodwill-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('goodwill');

      expect(instructions).toContain('Message Review');
      expect(instructions).toContain('message is under review');
      expect(instructions).toContain('may be featured');
      expect(instructions).toContain('generous contribution');
    });

    it('should provide donation-specific instructions', () => {
      const instructions = WhatsAppPDFService['getServiceInstructions']('donation');

      expect(instructions).toContain('Tax Information');
      expect(instructions).toContain('Keep this receipt for tax purposes');
      expect(instructions).toContain('tax-deductible');
      expect(instructions).toContain('supporting GOSA');
    });
  });

  describe('PDF download URL generation', () => {
    it('should generate correct PDF download URL', () => {
      const url = WhatsAppPDFService['generatePDFDownloadUrl']('CONV_123456');

      expect(url).toContain('/api/v1/pdf/download');
      expect(url).toContain('ref=CONV_123456');
      expect(url).toContain('format=pdf');
    });

    it('should handle special characters in payment reference', () => {
      const url = WhatsAppPDFService['generatePDFDownloadUrl']('CONV_123&456');

      expect(url).toContain('ref=CONV_123%26456'); // URL encoded
    });

    it('should use environment URL when available', () => {
      const originalUrl = process.env.NEXTAUTH_URL;
      process.env.NEXTAUTH_URL = 'https://example.com';

      const url = WhatsAppPDFService['generatePDFDownloadUrl']('CONV_123456');

      expect(url).toContain('https://example.com/api/v1/pdf/download');

      process.env.NEXTAUTH_URL = originalUrl;
    });
  });

  describe('Receipt number generation', () => {
    it('should generate unique receipt numbers', () => {
      const receipt1 = WhatsAppPDFService['generateReceiptNumber']('CONV_123456');
      const receipt2 = WhatsAppPDFService['generateReceiptNumber']('CONV_789012');

      expect(receipt1).toMatch(/^GOSA-\d{6}-[A-Z0-9]{4}$/);
      expect(receipt2).toMatch(/^GOSA-\d{6}-[A-Z0-9]{4}$/);
      expect(receipt1).not.toBe(receipt2);
    });

    it('should include payment reference suffix', () => {
      const receipt = WhatsAppPDFService['generateReceiptNumber']('CONV_123456');

      expect(receipt).toContain('3456'); // Last 4 characters of payment reference
    });
  });

  describe('Data validation', () => {
    it('should validate complete PDF data', () => {
      const validationResult = WhatsAppPDFService.validateWhatsAppPDFData(mockWhatsAppPDFData);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should detect missing user details', () => {
      const invalidData = {
        ...mockWhatsAppPDFData,
        userDetails: {
          ...mockWhatsAppPDFData.userDetails,
          name: '',
          email: ''
        }
      };

      const validationResult = WhatsAppPDFService.validateWhatsAppPDFData(invalidData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('User name is required');
      expect(validationResult.errors).toContain('User email is required');
    });

    it('should detect invalid phone number format', () => {
      const invalidData = {
        ...mockWhatsAppPDFData,
        userDetails: {
          ...mockWhatsAppPDFData.userDetails,
          phone: 'invalid-phone'
        }
      };

      const validationResult = WhatsAppPDFService.validateWhatsAppPDFData(invalidData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Invalid phone number format');
    });

    it('should detect missing operation details', () => {
      const invalidData = {
        ...mockWhatsAppPDFData,
        operationDetails: {
          ...mockWhatsAppPDFData.operationDetails,
          paymentReference: '',
          amount: 0
        }
      };

      const validationResult = WhatsAppPDFService.validateWhatsAppPDFData(invalidData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Payment reference is required');
      expect(validationResult.errors).toContain('Amount must be greater than zero');
    });

    it('should detect missing QR code data', () => {
      const invalidData = {
        ...mockWhatsAppPDFData,
        qrCodeData: ''
      };

      const validationResult = WhatsAppPDFService.validateWhatsAppPDFData(invalidData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('QR code data is required');
    });
  });

  describe('Performance monitoring', () => {
    it('should log delivery metrics for successful operations', async () => {
      mockWasender.sendDocument.mockResolvedValue({
        success: true,
        data: { msgId: 'msg-123' }
      });

      await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(mockPDFMonitoringService.recordDeliveryMetrics).toHaveBeenCalledWith(
        mockWhatsAppPDFData,
        expect.objectContaining({
          success: true,
          pdfGenerated: true,
          whatsappSent: true
        }),
        expect.any(Number)
      );
    });

    it('should log delivery metrics for failed operations', async () => {
      mockPDFErrorHandlerService.executeWithRetry.mockRejectedValue(
        new Error('PDF generation failed')
      );

      await WhatsAppPDFService.generateAndSendPDF(mockWhatsAppPDFData);

      expect(mockPDFMonitoringService.recordDeliveryMetrics).toHaveBeenCalledWith(
        mockWhatsAppPDFData,
        expect.objectContaining({
          success: false,
          pdfGenerated: false,
          whatsappSent: false
        }),
        expect.any(Number)
      );
    });

    it('should track delivery status', async () => {
      const status = await WhatsAppPDFService.trackDeliveryStatus('msg-123', 'CONV_123456');

      expect(status.status).toBe('delivered');
      expect(status.timestamp).toBeInstanceOf(Date);
      expect(status.attempts).toBe(1);
    });
  });

  describe('WhatsApp PDF data creation', () => {
    it('should create WhatsApp PDF data from payment reference', async () => {
      const mockPDFWhatsAppUtils = require('../../utils/pdf-whatsapp.utils');
      mockPDFWhatsAppUtils.PDFWhatsAppUtils = {
        getPDFDataByReference: jest.fn().mockResolvedValue(mockWhatsAppPDFData)
      };

      const result = await WhatsAppPDFService.createWhatsAppPDFDataFromReference('CONV_123456');

      expect(result).toEqual(mockWhatsAppPDFData);
    });

    it('should handle missing payment reference data', async () => {
      const mockPDFWhatsAppUtils = require('../../utils/pdf-whatsapp.utils');
      mockPDFWhatsAppUtils.PDFWhatsAppUtils = {
        getPDFDataByReference: jest.fn().mockResolvedValue(null)
      };

      const result = await WhatsAppPDFService.createWhatsAppPDFDataFromReference('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});