import { DinnerUtils } from '@/lib/utils/dinner.utils';
import { IGuestDetail } from '@/lib/schema/dinner.schema';
import { DinnerReservation } from '@/lib/schema/dinner.schema';
import { QRCodeService } from '@/lib/services/qr-code.service';

// Mock dependencies
jest.mock('@/lib/schema/dinner.schema');
jest.mock('@/lib/services/qr-code.service');

const mockDinnerReservation = DinnerReservation as any;

describe('DinnerUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct total for single guest', () => {
      const total = DinnerUtils.calculateTotalAmount(1);
      expect(total).toBe(2500);
    });

    it('should calculate correct total for multiple guests', () => {
      const total = DinnerUtils.calculateTotalAmount(5);
      expect(total).toBe(12500);
    });

    it('should handle maximum guests', () => {
      const total = DinnerUtils.calculateTotalAmount(10);
      expect(total).toBe(25000);
    });
  });

  describe('validateGuestDetails', () => {
    it('should validate correct guest details', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '08012345678' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '08087654321' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject empty guest names', () => {
      const guestDetails: IGuestDetail[] = [
        { name: '', email: 'john@example.com', phone: '08012345678' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Name is required'))).toBe(true);
    });

    it('should reject invalid email formats', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe', email: 'invalid-email', phone: '08012345678' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Valid email is required'))).toBe(true);
    });

    it('should handle guests without optional fields', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '08012345678' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(true);
    });
  });

  describe('createReservation', () => {
    it('should create reservation with valid data', async () => {
      const mockReservation = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        paymentReference: 'DINNER_123_08012345678',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+2348012345678' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+2348087654321' }
        ],
        totalAmount: 150,
        confirmed: false
      };

      mockDinnerReservation.findOne = jest.fn().mockResolvedValue(null);
      mockDinnerReservation.create = jest.fn().mockResolvedValue(mockReservation);

      const reservationData = {
        userId: '507f1f77bcf86cd799439011',
        paymentReference: 'DINNER_123_08012345678',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '08012345678' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '08087654321' }
        ],
        totalAmount: 150
      };

      const result = await DinnerUtils.createReservation(reservationData);
      
      expect(mockDinnerReservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          numberOfGuests: 2,
          paymentReference: 'DINNER_123_08012345678',
          confirmed: false
        })
      );
      expect(result).toEqual(mockReservation);
    });
  });

  describe('confirmReservation', () => {
    it('should confirm reservation and generate QR codes', async () => {
      const mockReservation = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        paymentReference: 'DINNER_123_08012345678',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+2348012345678' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+2348087654321' }
        ],
        totalAmount: 150,
        confirmed: false,
        qrCodes: [],
        save: jest.fn().mockResolvedValue(true)
      };

      mockDinnerReservation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockReservation])
      });

      jest.spyOn(DinnerUtils, 'generateQRCodes').mockResolvedValue([
        { guestName: 'John Doe', qrCode: 'qr-code-1', used: false },
        { guestName: 'Jane Smith', qrCode: 'qr-code-2', used: false }
      ]);

      const result = await DinnerUtils.confirmReservation('DINNER_123_08012345678');

      expect(mockDinnerReservation.find).toHaveBeenCalled();
      expect(mockReservation.confirmed).toBe(true);
      expect(mockReservation.qrCodes).toHaveLength(2);
      expect(mockReservation.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should throw error if reservation not found', async () => {
      mockDinnerReservation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });

      await expect(
        DinnerUtils.confirmReservation('INVALID_REFERENCE')
      ).rejects.toThrow('No dinner reservations found');
    });
  });

  describe('generateQRCodes', () => {
    it('should generate QR codes for all guests', async () => {
      const reservationId = 'reservation-id';
      const guestDetails = [
        { name: 'John Doe', email: 'john@example.com', phone: '08012345678' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '08087654321' }
      ];

      (QRCodeService.generateUniqueQRData as jest.Mock) = jest.fn()
        .mockReturnValueOnce('qr-code-1')
        .mockReturnValueOnce('qr-code-2');

      const result = await DinnerUtils.generateQRCodes(reservationId, guestDetails);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        guestName: 'John Doe',
        qrCode: 'qr-code-1',
        used: false
      });
      expect(result[1]).toEqual({
        guestName: 'Jane Smith',
        qrCode: 'qr-code-2',
        used: false
      });
    });
  });

  describe('getAllReservations', () => {
    it('should return paginated reservations', async () => {
      const mockReservations = [
        { _id: '1', numberOfGuests: 2, totalAmount: 150 },
        { _id: '2', numberOfGuests: 1, totalAmount: 75 }
      ];

      mockDinnerReservation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockReservations)
            })
          })
        })
      });
      mockDinnerReservation.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await DinnerUtils.getAllReservations({ page: 1, limit: 10 });

      expect(result.reservations).toEqual(mockReservations);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should filter by confirmed status', async () => {
      mockDinnerReservation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      mockDinnerReservation.countDocuments = jest.fn().mockResolvedValue(0);

      await DinnerUtils.getAllReservations({ page: 1, limit: 10, confirmed: true });

      expect(mockDinnerReservation.find).toHaveBeenCalledWith({ confirmed: true });
    });
  });
});