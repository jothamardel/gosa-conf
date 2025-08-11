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
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      specialRequests: 'Vegetarian meals',
      totalAmount: 150
    };

    it('should create a dinner reservation successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'reservation123',
        ...mockReservationData,
        paymentReference: 'DINNER_1703123456_08012345678',
        confirmed: false,
        qrCodes: []
      });

      mockDinnerReservation.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await DinnerUtils.createReservation(mockReservationData);

      expect(mockDinnerReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Object),
          numberOfGuests: 2,
          guestDetails: mockReservationData.guestDetails,
          specialRequests: 'Vegetarian meals',
          totalAmount: 150,
          paymentReference: expect.stringMatching(/^DINNER_\d+_\d+$/),
          confirmed: false,
          qrCodes: []
        })
      );

      expect(mockSave).toHaveBeenCalled();
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
        .rejects.toThrow('Number of guests must be between 1 and 10');
    });

    it('should throw error for mismatched guest details', async () => {
      const invalidData = {
        ...mockReservationData,
        numberOfGuests: 3,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' }
        ]
      };

      await expect(DinnerUtils.createReservation(invalidData))
        .rejects.toThrow('Number of guest details must match number of guests');
    });
  });

  describe('confirmReservation', () => {
    it('should confirm reservation and generate QR codes', async () => {
      const mockReservation = {
        _id: 'reservation123',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe' },
          { name: 'Jane Doe' }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      mockDinnerReservation.findOne = jest.fn().mockResolvedValue(mockReservation);
      mockQRCodeService.generateServiceQRCodes = jest.fn().mockResolvedValue([
        'qr-code-1',
        'qr-code-2'
      ]);

      const result = await DinnerUtils.confirmReservation('DINNER_1703123456_08012345678');

      expect(mockDinnerReservation.findOne).toHaveBeenCalledWith({
        paymentReference: 'DINNER_1703123456_08012345678'
      });

      expect(mockQRCodeService.generateServiceQRCodes).toHaveBeenCalledWith(
        'dinner',
        expect.objectContaining({
          id: 'reservation123',
          numberOfGuests: 2
        })
      );

      expect(mockReservation.save).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
      expect(result.qrCodes).toHaveLength(2);
    });

    it('should throw error if reservation not found', async () => {
      mockDinnerReservation.findOne = jest.fn().mockResolvedValue(null);

      await expect(DinnerUtils.confirmReservation('invalid-reference'))
        .rejects.toThrow('Dinner reservation not found');
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

      mockDinnerReservation.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockReservations)
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