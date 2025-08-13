import { Wasender } from '../../../lib/wasender-api';
import { WASenderDocument, WASenderMessage } from '../../../lib/types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn()
  }))
}));

describe('WASender API Integration', () => {
  const mockAxiosInstance = {
    post: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the axios instance
    const axios = require('axios');
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('sendDocument', () => {
    const validDocumentData: WASenderDocument = {
      to: '+1234567890',
      text: 'Please find your PDF document attached.',
      documentUrl: 'https://example.com/document.pdf',
      fileName: 'registration-confirmation.pdf'
    };

    it('should successfully send document with valid data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          msgId: '12345',
          jid: '+1234567890@s.whatsapp.net',
          status: 'sent',
          message: 'Document sent successfully'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await Wasender.sendDocument(validDocumentData);

      expect(result.success).toBe(true);
      expect(result.data?.msgId).toBe('12345');
      expect(result.data?.status).toBe('sent');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-message', {
        ...validDocumentData,
        type: 'document'
      });
    });

    it('should handle missing required fields', async () => {
      const invalidData = {
        to: '',
        text: 'Test message',
        documentUrl: '',
        fileName: ''
      } as WASenderDocument;

      const result = await Wasender.sendDocument(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should handle invalid phone number format', async () => {
      const invalidPhoneData = {
        ...validDocumentData,
        to: 'invalid-phone'
      };

      const result = await Wasender.sendDocument(invalidPhoneData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should handle invalid document URL', async () => {
      const invalidUrlData = {
        ...validDocumentData,
        documentUrl: 'not-a-valid-url'
      };

      const result = await Wasender.sendDocument(invalidUrlData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid document URL format');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should handle API authentication errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      });

      const result = await Wasender.sendDocument(validDocumentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should handle rate limiting errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Too Many Requests' }
        }
      });

      const result = await Wasender.sendDocument(validDocumentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      const result = await Wasender.sendDocument(validDocumentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should use default text when none provided', async () => {
      const dataWithoutText = {
        ...validDocumentData,
        text: ''
      };

      const mockResponse = {
        status: 200,
        data: { msgId: '12345', status: 'sent' }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await Wasender.sendDocument(dataWithoutText);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-message', {
        ...dataWithoutText,
        text: 'Please find your document attached.',
        type: 'document'
      });
    });
  });

  describe('httpSenderMessage', () => {
    const validMessageData: WASenderMessage = {
      to: '+1234567890',
      text: 'Hello, this is a test message'
    };

    it('should successfully send message with valid data', async () => {
      const mockResponse = {
        status: 200,
        data: {
          msgId: '12345',
          jid: '+1234567890@s.whatsapp.net',
          status: 'sent'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await Wasender.httpSenderMessage(validMessageData);

      expect(result.success).toBe(true);
      expect(result.data?.msgId).toBe('12345');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-message', validMessageData);
    });

    it('should handle message sending errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Bad Request' }
        }
      });

      const result = await Wasender.httpSenderMessage(validMessageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bad Request');
    });
  });

  describe('httpSendDocument (legacy)', () => {
    it('should call sendDocument method', async () => {
      const validDocumentData: WASenderDocument = {
        to: '+1234567890',
        text: 'Test document',
        documentUrl: 'https://example.com/test.pdf',
        fileName: 'test.pdf'
      };

      const mockResponse = {
        status: 200,
        data: { msgId: '12345', status: 'sent' }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await Wasender.httpSendDocument(validDocumentData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-message', {
        ...validDocumentData,
        type: 'document'
      });
    });
  });
});