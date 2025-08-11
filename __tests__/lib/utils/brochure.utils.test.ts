import { BrochureUtils } from '@/lib/utils/brochure.utils';
import { ConventionBrochure } from '@/lib/schema/brochure.schema';
import { QRCodeService } from '@/lib/services/qr-code.service';
import { Types } from 'mongoose';

// Mock dependencies
jest.mock('@/lib/schema/brochure.schema');
jest.mock('@/lib/services/qr-code.service');

const mockConventionBrochure = ConventionBrochure as jest.Mocked<typeof ConventionBrochure>;
const mockQRCodeService = QRCodeService as jest.Mocked<typeof QRCodeService>;

describe('BrochureUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const mockOrderData = {
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      paymentReference: 'BROCH_1703123456_08012345678',
      quantity: 5,
      brochureType: 'physical' as const,
      recipientDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      totalAmount: 95
    };

    it('should create brochure order successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'order123',
        ...mockOrderData,
        confirmed: false,
        qrCode: '',
        collected: false
      });

      mockConventionBrochure.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await BrochureUtils.createOrder(mockOrderData);

      expect(mockConventionBrochure).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockOrderData.userId,
          quantity: 5,
          brochureType: 'physical',
          totalAmount: 95,
          confirmed: false
        })
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        _id: 'order123',
        quantity: 5
      }));
    });

    it('should throw error for invalid quantity', async () => {
      const invalidData = {
        ...mockOrderData,
        quantity: 0
      };

      await expect(BrochureUtils.createOrder(invalidData))
        .rejects.toThrow('Quantity must be between 1 and 50');
    });

    it('should throw error for invalid brochure type', async () => {
      const invalidData = {
        ...mockOrderData,
        brochureType: 'invalid' as any
      };

      await expect(BrochureUtils.createOrder(invalidData))
        .rejects.toThrow('Invalid brochure type');
    });
  });

  describe('confirmOrder', () => {
    it('should confirm order and generate QR code for physical brochures', async () => {
      const mockOrder = {
        _id: 'order123',
        brochureType: 'physical',
        quantity: 5,
        save: jest.fn().mockResolvedValue(true)
      };

      mockConventionBrochure.findOne = jest.fn().mockResolvedValue(mockOrder);
      mockQRCodeService.generateServiceQRCode = jest.fn().mockResolvedValue('qr-code-123');

      const result = await BrochureUtils.confirmOrder('BROCH_1703123456_08012345678');

      expect(mockConventionBrochure.findOne).toHaveBeenCalledWith({
        paymentReference: 'BROCH_1703123456_08012345678'
      });

      expect(mockQRCodeService.generateServiceQRCode).toHaveBeenCalledWith(
        'brochure',
        expect.objectContaining({
          id: 'order123',
          quantity: 5
        })
      );

      expect(mockOrder.save).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
      expect(result.qrCode).toBe('qr-code-123');
    });

    it('should confirm digital order without QR code', async () => {
      const mockOrder = {
        _id: 'order123',
        brochureType: 'digital',
        quantity: 3,
        save: jest.fn().mockResolvedValue(true)
      };

      mockConventionBrochure.findOne = jest.fn().mockResolvedValue(mockOrder);

      const result = await BrochureUtils.confirmOrder('BROCH_1703123456_08012345678');

      expect(mockQRCodeService.generateServiceQRCode).not.toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
      expect(result.qrCode).toBe('');
    });

    it('should throw error if order not found', async () => {
      mockConventionBrochure.findOne = jest.fn().mockResolvedValue(null);

      await expect(BrochureUtils.confirmOrder('invalid-reference'))
        .rejects.toThrow('Brochure order not found');
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct amount for digital brochures', () => {
      const amount = BrochureUtils.calculateTotalAmount('digital', 3);
      // 3 * $10 = $30
      expect(amount).toBe(30);
    });

    it('should calculate correct amount for physical brochures', () => {
      const amount = BrochureUtils.calculateTotalAmount('physical', 3);
      // 3 * $20 = $60
      expect(amount).toBe(60);
    });

    it('should apply 5% discount for 5-9 items', () => {
      const amount = BrochureUtils.calculateTotalAmount('physical', 5);
      // 5 * $20 = $100, with 5% discount = $95
      expect(amount).toBe(95);
    });

    it('should apply 10% discount for 10+ items', () => {
      const amount = BrochureUtils.calculateTotalAmount('physical', 10);
      // 10 * $20 = $200, with 10% discount = $180
      expect(amount).toBe(180);
    });
  });

  describe('validateRecipientDetails', () => {
    it('should validate correct recipient details', () => {
      const recipients = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ];

      const validation = BrochureUtils.validateRecipientDetails(recipients);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty recipient list', () => {
      const validation = BrochureUtils.validateRecipientDetails([]);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one recipient is required');
    });

    it('should reject recipients without names', () => {
      const recipients = [
        { name: '', email: 'john@example.com' }
      ];

      const validation = BrochureUtils.validateRecipientDetails(recipients);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Recipient name is required');
    });

    it('should reject invalid email addresses', () => {
      const recipients = [
        { name: 'John Doe', email: 'invalid-email' }
      ];

      const validation = BrochureUtils.validateRecipientDetails(recipients);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid email address for John Doe');
    });
  });

  describe('getBrochureTypeDetails', () => {
    it('should return correct details for digital brochure', () => {
      const details = BrochureUtils.getBrochureTypeDetails('digital');

      expect(details).toEqual({
        type: 'digital',
        price: 10,
        description: 'Digital PDF download',
        deliveryMethod: 'email'
      });
    });

    it('should return correct details for physical brochure', () => {
      const details = BrochureUtils.getBrochureTypeDetails('physical');

      expect(details).toEqual({
        type: 'physical',
        price: 20,
        description: 'Physical printed brochure',
        deliveryMethod: 'pickup'
      });
    });
  });
});