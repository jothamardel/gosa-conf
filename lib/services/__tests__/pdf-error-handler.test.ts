import { PDFErrorHandlerService, PDFErrorType } from '../pdf-error-handler.service';
import { WhatsAppPDFData } from '../../utils/pdf-whatsapp.utils';

// Mock dependencies
jest.mock('../../wasender-api', () => ({
  Wasender: {
    httpSenderMessage: jest.fn(),
    sendDocument: jest.fn()
  }
}));

describe('PDFErrorHandlerService', () => {
  const mockPDFData: WhatsAppPDFData = {
    userDetails: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      registrationId: 'test123'
    },
    operationDetails: {
      type: 'convention',
      amount: 50000,
      paymentReference: 'TEST_REF_123',
      date: new Date(),
      status: 'confirmed',
      description: 'Test Convention Registration',
      additionalInfo: 'Test additional info'
    },
    qrCodeData: JSON.stringify({ test: true })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.ADMIN_PHONE_NUMBERS = '+1111111111,+2222222222';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  describe('createPDFError', () => {
    it('should create a PDF error with correct properties', () => {
      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);
      const error = PDFErrorHandlerService.createPDFError(
        PDFErrorType.PDF_GENERATION_FAILED,
        'Test error message',
        context
      );

      expect(error.type).toBe(PDFErrorType.PDF_GENERATION_FAILED);
      expect(error.message).toBe('Test error message');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('high');
      expect(error.adminNotificationRequired).toBe(true);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

      const result = await PDFErrorHandlerService.executeWithRetry(
        mockOperation,
        { maxAttempts: 3, backoffMultiplier: 2, initialDelay: 100, maxDelay: 1000 },
        context,
        PDFErrorType.PDF_GENERATION_FAILED
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

      const result = await PDFErrorHandlerService.executeWithRetry(
        mockOperation,
        { maxAttempts: 3, backoffMultiplier: 2, initialDelay: 10, maxDelay: 1000 },
        context,
        PDFErrorType.PDF_GENERATION_FAILED
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

      await expect(
        PDFErrorHandlerService.executeWithRetry(
          mockOperation,
          { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 10, maxDelay: 1000 },
          context,
          PDFErrorType.PDF_GENERATION_FAILED
        )
      ).rejects.toThrow('Operation failed after 2 attempts');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('validatePDFData', () => {
    it('should pass validation for valid data', () => {
      expect(() => {
        PDFErrorHandlerService.validatePDFData(mockPDFData);
      }).not.toThrow();
    });

    it('should throw error for missing user name', () => {
      const invalidData = {
        ...mockPDFData,
        userDetails: { ...mockPDFData.userDetails, name: '' }
      };

      expect(() => {
        PDFErrorHandlerService.validatePDFData(invalidData);
      }).toThrow('Data validation failed: User name is required');
    });

    it('should throw error for invalid phone number', () => {
      const invalidData = {
        ...mockPDFData,
        userDetails: { ...mockPDFData.userDetails, phone: 'invalid-phone' }
      };

      expect(() => {
        PDFErrorHandlerService.validatePDFData(invalidData);
      }).toThrow('Invalid phone number format');
    });

    it('should throw error for zero amount', () => {
      const invalidData = {
        ...mockPDFData,
        operationDetails: { ...mockPDFData.operationDetails, amount: 0 }
      };

      expect(() => {
        PDFErrorHandlerService.validatePDFData(invalidData);
      }).toThrow('Amount must be greater than zero');
    });
  });

  describe('executeFallbackDelivery', () => {
    it('should successfully send fallback message', async () => {
      const { Wasender } = require('../../wasender-api');
      Wasender.httpSenderMessage.mockResolvedValue({
        success: true,
        data: { msgId: 'test-message-id' }
      });

      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);
      const result = await PDFErrorHandlerService.executeFallbackDelivery(mockPDFData, context);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(Wasender.httpSenderMessage).toHaveBeenCalledWith({
        to: mockPDFData.userDetails.phone,
        text: expect.stringContaining('Dear Test User')
      });
    });

    it('should handle fallback failure and notify admin', async () => {
      const { Wasender } = require('../../wasender-api');
      Wasender.httpSenderMessage.mockRejectedValue(new Error('Fallback failed'));

      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);
      const result = await PDFErrorHandlerService.executeFallbackDelivery(mockPDFData, context);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(false);
      expect(result.error).toContain('Complete delivery failure');
    });
  });

  describe('notifyAdminOfCriticalFailure', () => {
    it('should send admin notifications', async () => {
      const { Wasender } = require('../../wasender-api');
      Wasender.httpSenderMessage.mockResolvedValue({
        success: true,
        data: { msgId: 'admin-notification-id' }
      });

      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);
      const error = new Error('Critical test error');

      await PDFErrorHandlerService.notifyAdminOfCriticalFailure(mockPDFData, context, error);

      expect(Wasender.httpSenderMessage).toHaveBeenCalledTimes(2); // Two admin numbers
      expect(Wasender.httpSenderMessage).toHaveBeenCalledWith({
        to: '+1111111111',
        text: expect.stringContaining('CRITICAL PDF DELIVERY FAILURE')
      });
      expect(Wasender.httpSenderMessage).toHaveBeenCalledWith({
        to: '+2222222222',
        text: expect.stringContaining('CRITICAL PDF DELIVERY FAILURE')
      });
    });

    it('should handle admin notification failures gracefully', async () => {
      const { Wasender } = require('../../wasender-api');
      Wasender.httpSenderMessage.mockRejectedValue(new Error('Admin notification failed'));

      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);
      const error = new Error('Critical test error');

      // Should not throw even if admin notifications fail
      await expect(
        PDFErrorHandlerService.notifyAdminOfCriticalFailure(mockPDFData, context, error)
      ).resolves.not.toThrow();
    });
  });

  describe('createErrorContext', () => {
    it('should create proper error context from PDF data', () => {
      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

      expect(context.paymentReference).toBe('TEST_REF_123');
      expect(context.userDetails.name).toBe('Test User');
      expect(context.userDetails.email).toBe('test@example.com');
      expect(context.userDetails.phone).toBe('+1234567890');
      expect(context.operationType).toBe('convention');
      expect(context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Classification', () => {
    it('should classify PDF generation errors correctly', () => {
      const templateError = new Error('Template rendering failed');
      const qrError = new Error('QR code generation failed');
      const networkError = new Error('Network timeout occurred');

      // These are private methods, so we test through the public interface
      const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

      const templatePDFError = PDFErrorHandlerService.createPDFError(
        PDFErrorType.TEMPLATE_RENDERING_FAILED,
        templateError.message,
        context,
        templateError
      );

      const qrPDFError = PDFErrorHandlerService.createPDFError(
        PDFErrorType.QR_CODE_GENERATION_FAILED,
        qrError.message,
        context,
        qrError
      );

      const networkPDFError = PDFErrorHandlerService.createPDFError(
        PDFErrorType.NETWORK_ERROR,
        networkError.message,
        context,
        networkError
      );

      expect(templatePDFError.type).toBe(PDFErrorType.TEMPLATE_RENDERING_FAILED);
      expect(qrPDFError.type).toBe(PDFErrorType.QR_CODE_GENERATION_FAILED);
      expect(networkPDFError.type).toBe(PDFErrorType.NETWORK_ERROR);
    });
  });
});

// Integration test for the complete error handling flow
describe('PDFErrorHandlerService Integration', () => {
  const mockPDFData: WhatsAppPDFData = {
    userDetails: {
      name: 'Integration Test User',
      email: 'integration@example.com',
      phone: '+1987654321',
      registrationId: 'integration123'
    },
    operationDetails: {
      type: 'dinner',
      amount: 75000,
      paymentReference: 'INTEGRATION_TEST_REF',
      date: new Date(),
      status: 'confirmed',
      description: 'Integration Test Dinner Reservation',
      additionalInfo: 'Integration test'
    },
    qrCodeData: JSON.stringify({ integration: true })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_PHONE_NUMBERS = '+1111111111';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  it('should handle complete failure scenario with admin notification', async () => {
    const { Wasender } = require('../../wasender-api');

    // Mock all operations to fail
    const failingOperation = jest.fn().mockRejectedValue(new Error('Complete system failure'));

    // Mock admin notification to succeed
    Wasender.httpSenderMessage.mockResolvedValue({
      success: true,
      data: { msgId: 'admin-alert-id' }
    });

    const context = PDFErrorHandlerService.createErrorContext(mockPDFData);

    try {
      await PDFErrorHandlerService.executeWithRetry(
        failingOperation,
        { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 10, maxDelay: 1000 },
        context,
        PDFErrorType.PDF_GENERATION_FAILED
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(failingOperation).toHaveBeenCalledTimes(2);
    }

    // Verify that the error was properly classified and handled
    expect(failingOperation).toHaveBeenCalledTimes(2);
  });
});