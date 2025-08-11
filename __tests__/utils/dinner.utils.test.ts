import { DinnerUtils } from '@/lib/utils/dinner.utils';
import { IGuestDetail } from '@/lib/schema';

// Mock the database models
jest.mock('@/lib/schema', () => ({
  DinnerReservation: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

describe('DinnerUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct total for single guest', () => {
      const total = DinnerUtils.calculateTotalAmount(1);
      expect(total).toBe(75);
    });

    it('should calculate correct total for multiple guests', () => {
      const total = DinnerUtils.calculateTotalAmount(5);
      expect(total).toBe(375);
    });

    it('should handle maximum guests', () => {
      const total = DinnerUtils.calculateTotalAmount(10);
      expect(total).toBe(750);
    });
  });

  describe('validateGuestDetails', () => {
    it('should validate correct guest details', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty guest names', () => {
      const guestDetails: IGuestDetail[] = [
        { name: '', email: 'john@example.com' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Guest name is required');
    });

    it('should reject invalid email formats', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe', email: 'invalid-email' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format for guest: John Doe');
    });

    it('should handle guests without optional fields', () => {
      const guestDetails: IGuestDetail[] = [
        { name: 'John Doe' }
      ];

      const result = DinnerUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(true);
    });
  });

  describe('createReservation', () => {
    it('should create reservation with valid data', async () => {
      const mockReservation = {
        _id: 'reservation-id',
        userId: 'user-id',
        paymentReference: 'DINNER_123_+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        totalAmount: 150,
        confirmed: false
      };

      const { DinnerReservation } = require('@/lib/schema');
      DinnerReservation.create.mockResolvedValue(mockReservation);

      const reservationData = {
        userId: 'user-id',
        paymentReference: 'DINNER_123_+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        totalAmount: 150
      };

      const result = await DinnerUtils.createReservation(reservationData);
      
      expect(DinnerReservation.create).toHaveBeenCalledWith({
        ...reservationData,
        confirmed: false,
        qrCodes: []
      });
      expect(result).toEqual(mockReservation);
    });
  });

  describe('confirmReservation', () => {
    it('should confirm reservation and generate QR codes', async () => {
      const mockReservation = {
        _id: 'reservation-id',
        userId: 'user-id',
        paymentReference: 'DINNER_123_+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        totalAmount: 150,
        confirmed: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const { DinnerReservation } = require('@/lib/schema');
      DinnerReservation.findOne.mockResolvedValue(mockReservation);

      // Mock QR code generation
      jest.spyOn(DinnerUtils, 'generateQRCodes').mockResolvedValue([
        'qr-code-1',
        'qr-code-2'
      ]);

      const result = await DinnerUtils.confirmReservation('DINNER_123_+1234567890');

      expect(DinnerReservation.findOne).toHaveBeenCalledWith({
        paymentReference: 'DINNER_123_+1234567890'
      });
      expect(mockReservation.confirmed).toBe(true);
      expect(mockReservation.qrCodes).toHaveLength(2);
      expect(mockReservation.save).toHaveBeenCalled();
    });

    it('should throw error if reservation not found', async () => {
      const { DinnerReservation } = require('@/lib/schema');
      DinnerReservation.findOne.mockResolvedValue(null);

      await expect(
        DinnerUtils.confirmReservation('INVALID_REFERENCE')
      ).rejects.toThrow('Dinner reservation not found');
    });
  });

  describe('generateQRCodes', () => {
    it('should generate QR codes for all guests', async () => {
      const reservationId = 'reservation-id';
      const guestDetails = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ];

      // Mock QRCodeService
      const mockQRCodeService = {
        generateQRCode: jest.fn()
          .mockResolvedValueOnce('qr-code-john')
          .mockResolvedValueOnce('qr-code-jane')
      };

      jest.doMock('@/lib/services/qr-code.service', () => ({
        QRCodeService: mockQRCodeService
      }));

      const result = await DinnerUtils.generateQRCodes(reservationId, guestDetails);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        guestName: 'John Doe',
        qrCode: 'qr-code-john',
        used: false
      });
      expect(result[1]).toEqual({
        guestName: 'Jane Smith',
        qrCode: 'qr-code-jane',
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

      const { DinnerReservation } = require('@/lib/schema');
      DinnerReservation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockReservations)
            })
          })
        })
      });
      DinnerReservation.countDocuments.mockResolvedValue(2);

      const result = await DinnerUtils.getAllReservations({ page: 1, limit: 10 });

      expect(result.reservations).toEqual(mockReservations);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should filter by confirmed status', async () => {
      const { DinnerReservation } = require('@/lib/schema');
      DinnerReservation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      DinnerReservation.countDocuments.mockResolvedValue(0);

      await DinnerUtils.getAllReservations({ page: 1, limit: 10, confirmed: true });

      expect(DinnerReservation.find).toHaveBeenCalledWith({ confirmed: true });
    });
  });
});