import { WASenderDocument, WASenderMessage } from '../../../lib/types';

const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn()
};

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}));

const { Wasender } = require('../../../lib/wasender-api');

describe('WASender API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('getGroupParticipants', () => {
    it('should successfully resolve JIDs from metadata participants array', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            jid: '120363402321564330@g.us',
            participants: [
              { jid: '123456' },
              { jid: '789101@s.whatsapp.net' }
            ]
          }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await Wasender.getGroupParticipants('120363402321564330@g.us');

      expect(result).toEqual(['123456@s.whatsapp.net', '789101@s.whatsapp.net']);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/groups/120363402321564330@g.us/metadata');
    });

    it('should fallback to mock participants array in case of api error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Down'));

      const result = await Wasender.getGroupParticipants('120363402321564330@g.us');

      expect(result).toEqual([
        '2347033680280@s.whatsapp.net',
        '2348162329082@s.whatsapp.net',
        '2348031234567@s.whatsapp.net'
      ]);
    });
  });

  describe('getProfile', () => {
    it('should return null as getProfile is stubbed', async () => {
      const result = await Wasender.getProfile();
      expect(result).toBeNull();
    });
  });

  describe('getBotJidFromSession', () => {
    it('should successfully fetch JID using direct session endpoint', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            jid: '2348162329082@s.whatsapp.net'
          }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await Wasender.getBotJidFromSession('session123');

      expect(result).toBe('2348162329082@s.whatsapp.net');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/whatsapp-sessions/session123');
    });
  });

  describe('getLidFromPn', () => {
    it('should successfully resolve LID from phone number', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            lid: '2348162329082@lid'
          }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await Wasender.getLidFromPn('2348162329082@s.whatsapp.net');

      expect(result).toBe('2348162329082@lid');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/lid-from-pn/2348162329082@s.whatsapp.net');
    });
  });

  describe('getPnFromLid', () => {
    it('should successfully resolve phone number JID from LID JID', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            pn: '2348162329082@s.whatsapp.net'
          }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await Wasender.getPnFromLid('2348162329082@lid');

      expect(result).toBe('2348162329082@s.whatsapp.net');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pn-from-lid/2348162329082@lid');
    });
  });
});