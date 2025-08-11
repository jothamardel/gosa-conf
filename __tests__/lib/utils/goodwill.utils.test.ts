import { GoodwillUtils } from '@/lib/utils/goodwill.utils';
import { GoodwillMessage } from '@/lib/schema/goodwill.schema';
import { Types } from 'mongoose';

// Mock dependencies
jest.mock('@/lib/schema/goodwill.schema');

const mockGoodwillMessage = GoodwillMessage as jest.Mocked<typeof GoodwillMessage>;

describe('GoodwillUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    const mockMessageData = {
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      paymentReference: 'GOOD_1703123456_08012345678',
      message: 'Wishing you all the best for this convention!',
      donationAmount: 50,
      attributionName: 'John Doe',
      anonymous: false
    };

    it('should create goodwill message successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'message123',
        ...mockMessageData,
        confirmed: false,
        approved: false
      });

      mockGoodwillMessage.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await GoodwillUtils.createMessage(mockMessageData);

      expect(mockGoodwillMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockMessageData.userId,
          message: 'Wishing you all the best for this convention!',
          donationAmount: 50,
          anonymous: false,
          confirmed: false,
          approved: false
        })
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        _id: 'message123',
        message: 'Wishing you all the best for this convention!'
      }));
    });

    it('should create anonymous message', async () => {
      const anonymousData = {
        ...mockMessageData,
        anonymous: true,
        attributionName: undefined
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'message123',
        ...anonymousData,
        confirmed: false,
        approved: false
      });

      mockGoodwillMessage.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await GoodwillUtils.createMessage(anonymousData);

      expect(result.anonymous).toBe(true);
      expect(result.attributionName).toBeUndefined();
    });
  });

  describe('confirmMessage', () => {
    it('should confirm message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        message: 'Great convention!',
        save: jest.fn().mockResolvedValue(true)
      };

      mockGoodwillMessage.findOne = jest.fn().mockResolvedValue(mockMessage);

      const result = await GoodwillUtils.confirmMessage('GOOD_1703123456_08012345678');

      expect(mockGoodwillMessage.findOne).toHaveBeenCalledWith({
        paymentReference: 'GOOD_1703123456_08012345678'
      });

      expect(mockMessage.save).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
    });

    it('should throw error if message not found', async () => {
      mockGoodwillMessage.findOne = jest.fn().mockResolvedValue(null);

      await expect(GoodwillUtils.confirmMessage('invalid-reference'))
        .rejects.toThrow('Goodwill message not found');
    });
  });

  describe('approveMessage', () => {
    it('should approve message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        confirmed: true,
        save: jest.fn().mockResolvedValue(true)
      };

      mockGoodwillMessage.findById = jest.fn().mockResolvedValue(mockMessage);

      const result = await GoodwillUtils.approveMessage('message123', 'admin123');

      expect(mockGoodwillMessage.findById).toHaveBeenCalledWith('message123');
      expect(mockMessage.save).toHaveBeenCalled();
      expect(result.approved).toBe(true);
      expect(result.approvedBy).toEqual(new Types.ObjectId('admin123'));
    });

    it('should throw error if message not confirmed', async () => {
      const mockMessage = {
        _id: 'message123',
        confirmed: false
      };

      mockGoodwillMessage.findById = jest.fn().mockResolvedValue(mockMessage);

      await expect(GoodwillUtils.approveMessage('message123', 'admin123'))
        .rejects.toThrow('Message must be confirmed before approval');
    });

    it('should throw error if message not found', async () => {
      mockGoodwillMessage.findById = jest.fn().mockResolvedValue(null);

      await expect(GoodwillUtils.approveMessage('invalid-id', 'admin123'))
        .rejects.toThrow('Goodwill message not found');
    });
  });

  describe('validateMessage', () => {
    it('should validate correct message', () => {
      const message = 'This is a wonderful convention with great speakers!';
      const validation = GoodwillUtils.validateMessage(message);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty message', () => {
      const validation = GoodwillUtils.validateMessage('');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Message cannot be empty');
    });

    it('should reject message that is too long', () => {
      const longMessage = 'a'.repeat(501);
      const validation = GoodwillUtils.validateMessage(longMessage);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Message cannot exceed 500 characters');
    });

    it('should reject message with inappropriate content', () => {
      const inappropriateMessage = 'This is spam content with promotional links';
      const validation = GoodwillUtils.validateMessage(inappropriateMessage);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Message contains inappropriate content');
    });
  });

  describe('validateDonationAmount', () => {
    it('should validate correct donation amount', () => {
      const validation = GoodwillUtils.validateDonationAmount(25);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject amount below minimum', () => {
      const validation = GoodwillUtils.validateDonationAmount(5);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Minimum donation amount is $10');
    });

    it('should reject negative amounts', () => {
      const validation = GoodwillUtils.validateDonationAmount(-10);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donation amount must be positive');
    });

    it('should reject non-numeric amounts', () => {
      const validation = GoodwillUtils.validateDonationAmount(NaN);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donation amount must be a valid number');
    });
  });

  describe('getPendingMessages', () => {
    it('should return pending messages with pagination', async () => {
      const mockMessages = [
        { _id: 'msg1', message: 'Message 1', confirmed: true, approved: false },
        { _id: 'msg2', message: 'Message 2', confirmed: true, approved: false }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages)
      };

      mockGoodwillMessage.find = jest.fn().mockReturnValue(mockQuery);
      mockGoodwillMessage.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await GoodwillUtils.getPendingMessages({ page: 1, limit: 10 });

      expect(mockGoodwillMessage.find).toHaveBeenCalledWith({
        confirmed: true,
        approved: false
      });

      expect(result.messages).toEqual(mockMessages);
      expect(result.pagination.totalMessages).toBe(2);
    });
  });

  describe('getApprovedMessages', () => {
    it('should return approved messages for public display', async () => {
      const mockMessages = [
        { _id: 'msg1', message: 'Great event!', approved: true, anonymous: false },
        { _id: 'msg2', message: 'Wonderful speakers!', approved: true, anonymous: true }
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages)
      };

      mockGoodwillMessage.find = jest.fn().mockReturnValue(mockQuery);
      mockGoodwillMessage.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await GoodwillUtils.getApprovedMessages({ page: 1, limit: 10 });

      expect(mockGoodwillMessage.find).toHaveBeenCalledWith({
        confirmed: true,
        approved: true
      });

      expect(result.messages).toEqual(mockMessages);
    });
  });
});