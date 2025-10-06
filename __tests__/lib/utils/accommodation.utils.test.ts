import { AccommodationUtils } from '@/lib/utils/accommodation.utils';
import { Accommodation } from '@/lib/schema/accommodation.schema';
import { Types } from 'mongoose';

// Mock dependencies
jest.mock('@/lib/schema/accommodation.schema');

const mockAccommodation = Accommodation as jest.Mocked<typeof Accommodation>;

describe('AccommodationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    const mockBookingData = {
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      paymentReference: 'ACCOM_1703123456_08012345678',
      accommodationType: 'premium' as const,
      checkInDate: new Date('2025-03-15'),
      checkOutDate: new Date('2025-03-17'),
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      specialRequests: 'Late check-in',
      totalAmount: 400
    };

    it('should create accommodation booking successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'booking123',
        ...mockBookingData,
        confirmed: false,
        confirmationCode: 'CONF123456'
      });

      mockAccommodation.mockImplementation(() => ({
        save: mockSave
      }) as any);

      const result = await AccommodationUtils.createBooking(mockBookingData);

      expect(mockAccommodation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockBookingData.userId,
          accommodationType: 'premium',
          numberOfGuests: 2,
          totalAmount: 400,
          confirmed: false
        })
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        _id: 'booking123',
        accommodationType: 'premium'
      }));
    });

    it('should throw error for invalid accommodation type', async () => {
      const invalidData = {
        ...mockBookingData,
        accommodationType: 'invalid' as any
      };

      await expect(AccommodationUtils.createBooking(invalidData))
        .rejects.toThrow('Invalid accommodation type');
    });

    it('should throw error for invalid date range', async () => {
      const invalidData = {
        ...mockBookingData,
        checkInDate: new Date('2025-03-17'),
        checkOutDate: new Date('2025-03-15')
      };

      await expect(AccommodationUtils.createBooking(invalidData))
        .rejects.toThrow('Check-out date must be after check-in date');
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking successfully', async () => {
      const mockBooking = {
        _id: 'booking123',
        accommodationType: 'premium',
        save: jest.fn().mockResolvedValue(true)
      };

      mockAccommodation.findOne = jest.fn().mockResolvedValue(mockBooking);

      const result = await AccommodationUtils.confirmBooking('ACCOM_1703123456_08012345678');

      expect(mockAccommodation.findOne).toHaveBeenCalledWith({
        paymentReference: 'ACCOM_1703123456_08012345678'
      });

      expect(mockBooking.save).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
    });

    it('should throw error if booking not found', async () => {
      mockAccommodation.findOne = jest.fn().mockResolvedValue(null);

      await expect(AccommodationUtils.confirmBooking('invalid-reference'))
        .rejects.toThrow('Accommodation booking not found');
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct amount for standard accommodation', () => {
      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const amount = AccommodationUtils.calculateTotalAmount('standard', checkIn, checkOut, 2);

      // 2 nights * $100 = $200
      expect(amount).toBe(200);
    });

    it('should calculate correct amount for premium accommodation', () => {
      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const amount = AccommodationUtils.calculateTotalAmount('premium', checkIn, checkOut, 2);

      // 2 nights * $200 = $400
      expect(amount).toBe(400);
    });

    it('should calculate correct amount for luxury accommodation', () => {
      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const amount = AccommodationUtils.calculateTotalAmount('luxury', checkIn, checkOut, 2);

      // 2 nights * $350 = $700
      expect(amount).toBe(700);
    });
  });

  describe('validateDates', () => {
    it('should validate correct date range', () => {
      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const validation = AccommodationUtils.validateDates(checkIn, checkOut);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject past check-in dates', () => {
      const checkIn = new Date('2020-01-01');
      const checkOut = new Date('2025-03-17');
      const validation = AccommodationUtils.validateDates(checkIn, checkOut);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Check-in date cannot be in the past');
    });

    it('should reject check-out before check-in', () => {
      const checkIn = new Date('2025-03-17');
      const checkOut = new Date('2025-03-15');
      const validation = AccommodationUtils.validateDates(checkIn, checkOut);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Check-out date must be after check-in date');
    });
  });

  describe('checkAvailability', () => {
    it('should return available for valid dates', async () => {
      mockAccommodation.countDocuments = jest.fn().mockResolvedValue(5);

      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const availability = await AccommodationUtils.checkAvailability('premium', checkIn, checkOut);

      expect(availability.available).toBe(true);
      expect(availability.availableRooms).toBeGreaterThan(0);
    });

    it('should return unavailable when fully booked', async () => {
      mockAccommodation.countDocuments = jest.fn().mockResolvedValue(20);

      const checkIn = new Date('2025-03-15');
      const checkOut = new Date('2025-03-17');
      const availability = await AccommodationUtils.checkAvailability('premium', checkIn, checkOut);

      expect(availability.available).toBe(false);
      expect(availability.availableRooms).toBe(0);
    });
  });
});