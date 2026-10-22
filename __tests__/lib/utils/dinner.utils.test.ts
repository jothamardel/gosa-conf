import { DinnerUtils } from '@/lib/utils/dinner.utils';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { QRCodeService } from '@/lib/services/qr-code.service';

// Mock dependencies
jest.mock('@/lib/schema/dinner.schema');
jest.mock('@/lib/services/qr-code.service');

const mockDinnerReservation = DinnerReservation as jest.Mocked<typeof DinnerReservation>;
const mockQRCodeService = QRCodeService as jest.Mocked<typeof QRCodeService>;

describe('DinnerUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    const mockReservationData = {
      userId: '507f1f77bcf86cd799439011',
      paymentReference: 'DINNER_1703123456_08012345678',
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com', phone: '08012345678' },
        { name: 'Jane Doe', email: 'jane@example.com', phone: '08087654321' }
      ],
      specialRequests: 'Vegetarian meals',
      totalAmount: 150
    };

    it('should create a dinner reservation successfully', async () => {
      const mockResult = {
        _id: 'reservation123',
        ...mockReservationData,
        confirmed: false,
        qrCodes: []
      };

      (DinnerReservation as any).findOne = jest.fn().mockResolvedValue(null);
      (DinnerReservation as any).create = jest.fn().mockResolvedValue(mockResult);

      const result = await DinnerUtils.createReservation(mockReservationData);

      expect((DinnerReservation as any).create).toHaveBeenCalledWith(
        expect.objectContaining({
          numberOfGuests: 2,
          specialRequests: 'Vegetarian meals',
          totalAmount: 150,
          paymentReference: 'DINNER_1703123456_08012345678',
          confirmed: false
        })
      );

      expect(result).toEqual(expect.objectContaining({
        _id: 'reservation123',
        numberOfGuests: 2
      }));
    });

    it('should throw error for invalid guest count', async () => {
      const invalidData = {
        ...mockReservationData,
        numberOfGuests: 0
      };

      await expect(DinnerUtils.createReservation(invalidData))
        .rejects.toThrow();
    });

    it('should throw error for mismatched guest details', async () => {
      const invalidData = {
        ...mockReservationData,
        numberOfGuests: 3,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '08012345678' }
        ]
      };

      await expect(DinnerUtils.createReservation(invalidData))
        .rejects.toThrow('Number of guest details must match numberOfGuests');
    });
  });

  describe('confirmReservation', () => {
    it('should confirm reservation and generate QR codes', async () => {
      const mockReservation = {
        _id: 'reservation123',
        paymentReference: 'DINNER_1703123456_08012345678',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '08012345678' },
          { name: 'Jane Doe', email: 'jane@example.com', phone: '08087654321' }
        ],
        confirmed: false,
        qrCodes: [],
        save: jest.fn().mockResolvedValue(true)
      };

      (DinnerReservation as any).find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockReservation])
      });
      mockQRCodeService.generateServiceQRCodes = jest.fn().mockResolvedValue([
        'qr-code-1',
        'qr-code-2'
      ]);

      const result = await DinnerUtils.confirmReservation('DINNER_1703123456_08012345678');

      expect((DinnerReservation as any).find).toHaveBeenCalled();
      expect(mockReservation.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].confirmed).toBe(true);
      expect(result[0].qrCodes).toHaveLength(2);
    });

    it('should throw error if reservation not found', async () => {
      (DinnerReservation as any).find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      await expect(DinnerUtils.confirmReservation('invalid-reference'))
        .rejects.toThrow('No dinner reservations found');
    });
  });

  describe('generatePaymentReference', () => {
    it('should generate valid payment reference', () => {
      const phone = '08012345678';
      const reference = DinnerUtils.generatePaymentReference(phone);

      expect(reference).toMatch(/^DINNER_\d+_08012345678$/);
    });
  });

  describe('getUserReservations', () => {
    it('should return user reservations', async () => {
      const mockReservations = [
        { _id: 'res1', numberOfGuests: 2 },
        { _id: 'res2', numberOfGuests: 1 }
      ];

      (DinnerReservation as any).find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockReservations)
        })
      });

      const result = await DinnerUtils.getUserReservations('507f1f77bcf86cd799439011');

      expect(mockDinnerReservation.find).toHaveBeenCalledWith({
        userId: expect.any(Object)
      });

      expect(result).toEqual(mockReservations);
    });
  });
});