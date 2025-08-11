import { POST, GET, PUT } from '@/app/api/v1/accommodation/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  AccommodationUtils: {
    validateDates: jest.fn(),
    validateGuestDetails: jest.fn(),
    checkAvailability: jest.fn(),
    calculateTotalAmount: jest.fn(),
    createBooking: jest.fn(),
    getAllBookings: jest.fn(),
    calculateNights: jest.fn(),
    getAccommodationTypeDetails: jest.fn(),
  },
  UserUtils: {
    findOrCreateUser: jest.fn(),
  },
}));

jest.mock('@/lib/paystack-api', () => ({
  Payment: {
    httpInitializePayment: jest.fn(),
  },
}));

describe('/api/v1/accommodation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockRequest = (body: any) => ({
      json: jest.fn().mockResolvedValue(body),
    }) as unknown as NextRequest;

    it('should create accommodation booking successfully', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        specialRequests: 'Late check-in'
      };

      const { AccommodationUtils, UserUtils } = require('@/lib/utils');
      const { Payment } = require('@/lib/paystack-api');

      // Mock validations
      AccommodationUtils.validateDates.mockReturnValue({ valid: true, errors: [] });
      AccommodationUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      AccommodationUtils.checkAvailability.mockResolvedValue({ available: true });
      AccommodationUtils.calculateTotalAmount.mockReturnValue(200);
      AccommodationUtils.calculateNights.mockReturnValue(2);
      AccommodationUtils.getAccommodationTypeDetails.mockReturnValue({
        name: 'Standard Room',
        price: 100
      });
      
      // Mock user creation
      UserUtils.findOrCreateUser.mockResolvedValue({
        _id: 'user-id',
        fullName: 'John Doe',
        email: 'john@example.com'
      });

      // Mock payment initialization
      Payment.httpInitializePayment.mockResolvedValue({
        data: {
          reference: 'paystack-ref-123',
          authorization_url: 'https://checkout.paystack.com/test'
        }
      });

      // Mock booking creation
      AccommodationUtils.createBooking.mockResolvedValue({
        _id: 'booking-id',
        paymentReference: 'ACCOM_123_+1234567890'
      });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.paymentLink).toBe('https://checkout.paystack.com/test');
      expect(AccommodationUtils.createBooking).toHaveBeenCalledWith({
        userId: 'user-id',
        paymentReference: expect.stringMatching(/^ACCOM_\d+_\+1234567890$/),
        accommodationType: 'standard',
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        numberOfGuests: 2,
        guestDetails: requestBody.guestDetails,
        specialRequests: 'Late check-in',
        totalAmount: 200
      });
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        email: 'john@example.com',
        // Missing other required fields
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('Please provide all required fields');
    });

    it('should return 400 for invalid accommodation type', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'invalid-type',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe("Invalid accommodation type. Must be 'standard', 'premium', or 'luxury'");
    });

    it('should return 400 for invalid dates', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: 'invalid-date',
        checkOutDate: '2024-01-03',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid date format. Please provide valid ISO date strings');
    });

    it('should return 400 for date validation failure', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const { AccommodationUtils } = require('@/lib/utils');
      AccommodationUtils.validateDates.mockReturnValue({
        valid: false,
        errors: ['Check-in date cannot be in the past']
      });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Date validation failed');
      expect(responseData.errors).toEqual(['Check-in date cannot be in the past']);
    });

    it('should return 400 when no rooms available', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const { AccommodationUtils } = require('@/lib/utils');
      AccommodationUtils.validateDates.mockReturnValue({ valid: true, errors: [] });
      AccommodationUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      AccommodationUtils.checkAvailability.mockResolvedValue({ available: false });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('No standard rooms available for the selected dates');
    });
  });

  describe('GET', () => {
    const mockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost/api/v1/accommodation');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      
      return {
        url: url.toString(),
      } as NextRequest;
    };

    it('should fetch accommodation bookings with default pagination', async () => {
      const mockBookings = [
        { _id: '1', accommodationType: 'standard', totalAmount: 200 },
        { _id: '2', accommodationType: 'premium', totalAmount: 400 }
      ];

      const { AccommodationUtils } = require('@/lib/utils');
      AccommodationUtils.getAllBookings.mockResolvedValue({
        bookings: mockBookings,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          hasNext: false,
          hasPrev: false
        }
      });

      const request = mockRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockBookings);
      expect(AccommodationUtils.getAllBookings).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('should filter by accommodation type', async () => {
      const { AccommodationUtils } = require('@/lib/utils');
      AccommodationUtils.getAllBookings.mockResolvedValue({
        bookings: [],
        pagination: {}
      });

      const request = mockRequest({ accommodationType: 'premium' });
      const response = await GET(request);

      expect(AccommodationUtils.getAllBookings).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        accommodationType: 'premium'
      });
    });
  });

  describe('PUT (availability check)', () => {
    const mockRequest = (body: any) => ({
      json: jest.fn().mockResolvedValue(body),
    }) as unknown as NextRequest;

    it('should check availability successfully', async () => {
      const requestBody = {
        accommodationType: 'standard',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03'
      };

      const { AccommodationUtils } = require('@/lib/utils');
      AccommodationUtils.checkAvailability.mockResolvedValue({
        available: true,
        availableRooms: 45
      });
      AccommodationUtils.getAccommodationTypeDetails.mockReturnValue({
        name: 'Standard Room',
        price: 100
      });
      AccommodationUtils.calculateNights.mockReturnValue(2);
      AccommodationUtils.calculateTotalAmount.mockReturnValue(200);

      const request = mockRequest(requestBody);
      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.availability).toEqual({
        available: true,
        availableRooms: 45
      });
      expect(responseData.data.nights).toBe(2);
      expect(responseData.data.totalAmount).toBe(200);
    });

    it('should return 400 for missing fields', async () => {
      const requestBody = {
        accommodationType: 'standard',
        // Missing dates
      };

      const request = mockRequest(requestBody);
      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Please provide accommodationType, checkInDate, and checkOutDate');
    });

    it('should return 400 for invalid accommodation type', async () => {
      const requestBody = {
        accommodationType: 'invalid',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-03'
      };

      const request = mockRequest(requestBody);
      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid accommodation type');
    });
  });
});