import { DonationUtils } from '@/lib/utils/donation.utils';
import { Donation } from '@/lib/schema/donation.schema';
import { Types } from 'mongoose';

// Mock dependencies
jest.mock('@/lib/schema/donation.schema');

const mockDonation = Donation as jest.Mocked<typeof Donation>;

describe('DonationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDonation', () => {
    const mockDonationData = {
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      paymentReference: 'DONA_1703123456_08012345678',
      amount: 100,
      donorName: 'John Doe',
      donorEmail: 'john@example.com',
      donorPhone: '08012345678',
      anonymous: false,
      onBehalfOf: undefined
    };

    it('should create donation successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'donation123',
        ...mockDonationData,
        confirmed: false,
        receiptNumber: 'RCP123456'
      });

      mockDonation.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await DonationUtils.createDonation(mockDonationData);

      expect(mockDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockDonationData.userId,
          amount: 100,
          donorName: 'John Doe',
          anonymous: false,
          confirmed: false
        })
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        _id: 'donation123',
        amount: 100,
        receiptNumber: 'RCP123456'
      }));
    });

    it('should create anonymous donation', async () => {
      const anonymousData = {
        ...mockDonationData,
        anonymous: true,
        donorName: undefined,
        donorEmail: undefined,
        donorPhone: undefined
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'donation123',
        ...anonymousData,
        confirmed: false,
        receiptNumber: 'RCP123456'
      });

      mockDonation.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await DonationUtils.createDonation(anonymousData);

      expect(result.anonymous).toBe(true);
      expect(result.donorName).toBeUndefined();
    });

    it('should create donation on behalf of someone', async () => {
      const behalfData = {
        ...mockDonationData,
        onBehalfOf: 'Jane Smith'
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'donation123',
        ...behalfData,
        confirmed: false,
        receiptNumber: 'RCP123456'
      });

      mockDonation.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await DonationUtils.createDonation(behalfData);

      expect(result.onBehalfOf).toBe('Jane Smith');
    });
  });

  describe('confirmDonation', () => {
    it('should confirm donation successfully', async () => {
      const mockDonation = {
        _id: 'donation123',
        amount: 100,
        save: jest.fn().mockResolvedValue(true)
      };

      mockDonation.findOne = jest.fn().mockResolvedValue(mockDonation);

      const result = await DonationUtils.confirmDonation('DONA_1703123456_08012345678');

      expect(mockDonation.findOne).toHaveBeenCalledWith({
        paymentReference: 'DONA_1703123456_08012345678'
      });

      expect(mockDonation.save).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
    });

    it('should throw error if donation not found', async () => {
      mockDonation.findOne = jest.fn().mockResolvedValue(null);

      await expect(DonationUtils.confirmDonation('invalid-reference'))
        .rejects.toThrow('Donation not found');
    });
  });

  describe('validateDonationAmount', () => {
    it('should validate correct donation amount', () => {
      const validation = DonationUtils.validateDonationAmount(25);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject amount below minimum', () => {
      const validation = DonationUtils.validateDonationAmount(3);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Minimum donation amount is $5');
    });

    it('should reject negative amounts', () => {
      const validation = DonationUtils.validateDonationAmount(-10);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donation amount must be positive');
    });

    it('should reject non-numeric amounts', () => {
      const validation = DonationUtils.validateDonationAmount(NaN);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donation amount must be a valid number');
    });

    it('should reject extremely large amounts', () => {
      const validation = DonationUtils.validateDonationAmount(1000000);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donation amount exceeds maximum limit');
    });
  });

  describe('validateDonorInfo', () => {
    it('should validate non-anonymous donor info', () => {
      const donorInfo = {
        donorName: 'John Doe',
        donorEmail: 'john@example.com',
        donorPhone: '08012345678',
        anonymous: false
      };

      const validation = DonationUtils.validateDonorInfo(donorInfo);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate anonymous donor info', () => {
      const donorInfo = {
        anonymous: true
      };

      const validation = DonationUtils.validateDonorInfo(donorInfo);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject non-anonymous donor without name', () => {
      const donorInfo = {
        donorEmail: 'john@example.com',
        anonymous: false
      };

      const validation = DonationUtils.validateDonorInfo(donorInfo);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Donor name is required for non-anonymous donations');
    });

    it('should reject invalid email format', () => {
      const donorInfo = {
        donorName: 'John Doe',
        donorEmail: 'invalid-email',
        anonymous: false
      };

      const validation = DonationUtils.validateDonorInfo(donorInfo);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid email address');
    });
  });

  describe('generateReceiptNumber', () => {
    it('should generate unique receipt number', () => {
      const receipt1 = DonationUtils.generateReceiptNumber();
      const receipt2 = DonationUtils.generateReceiptNumber();

      expect(receipt1).toMatch(/^RCP\d{10}$/);
      expect(receipt2).toMatch(/^RCP\d{10}$/);
      expect(receipt1).not.toBe(receipt2);
    });
  });

  describe('getDonationStatistics', () => {
    it('should return donation statistics', async () => {
      const mockStats = [
        {
          _id: null,
          totalDonations: 150,
          totalAmount: 5000,
          averageAmount: 33.33,
          anonymousDonations: 50
        }
      ];

      mockDonation.aggregate = jest.fn().mockResolvedValue(mockStats);

      const result = await DonationUtils.getDonationStatistics();

      expect(result).toEqual({
        totalDonations: 150,
        totalAmount: 5000,
        averageAmount: 33.33,
        anonymousDonations: 50,
        publicDonations: 100
      });
    });

    it('should handle empty statistics', async () => {
      mockDonation.aggregate = jest.fn().mockResolvedValue([]);

      const result = await DonationUtils.getDonationStatistics();

      expect(result).toEqual({
        totalDonations: 0,
        totalAmount: 0,
        averageAmount: 0,
        anonymousDonations: 0,
        publicDonations: 0
      });
    });
  });

  describe('getTopDonors', () => {
    it('should return top donors excluding anonymous', async () => {
      const mockDonors = [
        { _id: 'John Doe', totalAmount: 500, donationCount: 5 },
        { _id: 'Jane Smith', totalAmount: 300, donationCount: 3 }
      ];

      mockDonation.aggregate = jest.fn().mockResolvedValue(mockDonors);

      const result = await DonationUtils.getTopDonors(10);

      expect(mockDonation.aggregate).toHaveBeenCalledWith([
        { $match: { confirmed: true, anonymous: false, donorName: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$donorName',
            totalAmount: { $sum: '$amount' },
            donationCount: { $sum: 1 },
            lastDonation: { $max: '$createdAt' }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ]);

      expect(result).toEqual(mockDonors);
    });
  });
});