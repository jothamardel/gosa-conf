import { AccommodationUtils } from '@/lib/utils/accommodation.utils';
import { IAccommodationGuest } from '@/lib/schema';

// Mock the database models
jest.mock('@/lib/schema', () => ({
  Accommodation: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

describe('AccommodationUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct total for standard room', () => {
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-03'); // 2 nights
      const total = AccommodationUtils.calculateTotalAmount('standard', checkIn, checkOut, 2);
      expect(total).toBe(200); // $100 * 2 nights
    });

    it('should calculate correct total for premium room', () => {
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-04'); // 3 nights
      const total = AccommodationUtils.calculateTotalAmount('premium', checkIn, checkOut, 1);
      expect(total).toBe(600); // $200 * 3 nights
    });

    it('should calculate correct total for luxury room', () => {
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-02'); // 1 night
      const total = AccommodationUtils.calculateTotalAmount('luxury', checkIn, checkOut, 1);
      expect(total).toBe(350); // $350 * 1 night
    });
  });

  describe('calculateNights', () => {
    it('should calculate correct number of nights', () => {
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-05');
      const nights = AccommodationUtils.calculateNights(checkIn, checkOut);
      expect(nights).toBe(4);
    });

    it('should handle same day checkout', () => {
      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-01');
      const nights = AccommodationUtils.calculateNights(checkIn, checkOut);
      expect(nights).toBe(0);
    });
  });

  describe('validateDates', () => {
    it('should validate correct dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const result = AccommodationUtils.validateDates(tomorrow, dayAfter);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject past check-in dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = AccommodationUtils.validateDates(yesterday, tomorrow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Check-in date cannot be in the past');
    });

    it('should reject check-out before check-in', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();

      const result = AccommodationUtils.validateDates(tomorrow, today);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Check-out date must be after check-in date');
    });
  });

  describe('validateGuestDetails', () => {
    it('should validate correct guest details', () => {
      const guestDetails: IAccommodationGuest[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        { name: 'Jane Smith' }
      ];

      const result = AccommodationUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty guest names', () => {
      const guestDetails: IAccommodationGuest[] = [
        { name: '', email: 'john@example.com' }
      ];

      const result = AccommodationUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Guest name is required');
    });

    it('should reject invalid email formats', () => {
      const guestDetails: IAccommodationGuest[] = [
        { name: 'John Doe', email: 'invalid-email' }
      ];

      const result = AccommodationUtils.validateGuestDetails(guestDetails);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format for guest: John Doe');
    });
  });

  describe('getAccommodationTypeDetails', () => {
    it('should return correct details for standard room', () => {
      const details = AccommodationUtils.getAccommodationTypeDetails('standard');
      expect(details).toEqual({
        name: 'Standard Room',
        price: 100,
        description: 'Comfortable accommodation with essential amenities',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk']
      });
    });

    it('should return correct details for premium room', () => {
      const details = AccommodationUtils.getAccommodationTypeDetails('premium');
      expect(details).toEqual({
        name: 'Premium Room',
        price: 200,
        description: 'Spacious room with upgraded amenities and city view',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'City View', 'Mini Bar']
      });
    });

    it('should return correct details for luxury room', () => {
      const details = AccommodationUtils.getAccommodationTypeDetails('luxury');
      expect(details).toEqual({
        name: 'Luxury Suite',
        price: 350,
        description: 'Executive suite with premium amenities and concierge service',
        amenities: ['Free WiFi', 'Coffee Maker', 'Work Desk', 'City View', 'Mini Bar', 'Concierge', 'Balcony']
      });
    });
  });

  describe('checkAvailability', () => {
    it('should return available when rooms are available', async () => {
      const { Accommodation } = require('@/lib/schema');
      Accommodation.countDocuments.mockResolvedValue(5); // Less than capacity

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-03');
      
      const result = await AccommodationUtils.checkAvailability('standard', checkIn, checkOut);
      
      expect(result.available).toBe(true);
      expect(result.availableRooms).toBe(45); // 50 - 5
    });

    it('should return unavailable when rooms are full', async () => {
      const { Accommodation } = require('@/lib/schema');
      Accommodation.countDocuments.mockResolvedValue(50); // At capacity

      const checkIn = new Date('2024-01-01');
      const checkOut = new Date('2024-01-03');
      
      const result = await AccommodationUtils.checkAvailability('standard', checkIn, checkOut);
      
      expect(result.available).toBe(false);
      expect(result.availableRooms).toBe(0);
    });
  });

  describe('createBooking', () => {
    it('should create booking with valid data', async () => {
      const mockBooking = {
        _id: 'booking-id',
        userId: 'user-id',
        paymentReference: 'ACCOM_123_+1234567890',
        accommodationType: 'standard',
        numberOfGuests: 2,
        totalAmount: 200,
        confirmed: false
      };

      const { Accommodation } = require('@/lib/schema');
      Accommodation.create.mockResolvedValue(mockBooking);

      const bookingData = {
        userId: 'user-id',
        paymentReference: 'ACCOM_123_+1234567890',
        accommodationType: 'standard' as const,
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        totalAmount: 200
      };

      const result = await AccommodationUtils.createBooking(bookingData);
      
      expect(Accommodation.create).toHaveBeenCalledWith({
        ...bookingData,
        confirmed: false,
        confirmationCode: expect.any(String)
      });
      expect(result).toEqual(mockBooking);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking', async () => {
      const mockBooking = {
        _id: 'booking-id',
        paymentReference: 'ACCOM_123_+1234567890',
        confirmed: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const { Accommodation } = require('@/lib/schema');
      Accommodation.findOne.mockResolvedValue(mockBooking);

      const result = await AccommodationUtils.confirmBooking('ACCOM_123_+1234567890');

      expect(Accommodation.findOne).toHaveBeenCalledWith({
        paymentReference: 'ACCOM_123_+1234567890'
      });
      expect(mockBooking.confirmed).toBe(true);
      expect(mockBooking.save).toHaveBeenCalled();
    });

    it('should throw error if booking not found', async () => {
      const { Accommodation } = require('@/lib/schema');
      Accommodation.findOne.mockResolvedValue(null);

      await expect(
        AccommodationUtils.confirmBooking('INVALID_REFERENCE')
      ).rejects.toThrow('Accommodation booking not found');
    });
  });

  describe('generateConfirmationCode', () => {
    it('should generate unique confirmation code', () => {
      const code1 = AccommodationUtils.generateConfirmationCode();
      const code2 = AccommodationUtils.generateConfirmationCode();
      
      expect(code1).toMatch(/^ACC-[A-Z0-9]{8}$/);
      expect(code2).toMatch(/^ACC-[A-Z0-9]{8}$/);
      expect(code1).not.toBe(code2);
    });
  });
});