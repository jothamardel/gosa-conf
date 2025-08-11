import { POST, GET } from '@/app/api/v1/dinner/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  DinnerUtils: {
    validateGuestDetails: jest.fn(),
    calculateTotalAmount: jest.fn(),
    createReservation: jest.fn(),
    getAllReservations: jest.fn(),
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

describe('/api/v1/dinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const mockRequest = (body: any) => ({
      json: jest.fn().mockResolvedValue(body),
    }) as unknown as NextRequest;

    it('should create dinner reservation successfully', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        specialRequests: 'Vegetarian meal'
      };

      const { DinnerUtils, UserUtils } = require('@/lib/utils');
      const { Payment } = require('@/lib/paystack-api');

      // Mock validations and calculations
      DinnerUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      DinnerUtils.calculateTotalAmount.mockReturnValue(150);
      
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

      // Mock reservation creation
      DinnerUtils.createReservation.mockResolvedValue({
        _id: 'reservation-id',
        paymentReference: 'DINNER_123_+1234567890'
      });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.paymentLink).toBe('https://checkout.paystack.com/test');
      expect(DinnerUtils.createReservation).toHaveBeenCalledWith({
        userId: 'user-id',
        paymentReference: expect.stringMatching(/^DINNER_\d+_\+1234567890$/),
        numberOfGuests: 2,
        guestDetails: requestBody.guestDetails,
        specialRequests: 'Vegetarian meal',
        totalAmount: 150
      });
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        email: 'john@example.com',
        // Missing fullName, phoneNumber, numberOfGuests, guestDetails
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('Please provide email, fullName, phoneNumber, numberOfGuests, and guestDetails');
    });

    it('should return 400 for invalid number of guests', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 15, // Exceeds maximum
        guestDetails: []
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Number of guests must be between 1 and 10');
    });

    it('should return 400 for mismatched guest details count', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 2,
        guestDetails: [{ name: 'John Doe' }] // Only 1 guest detail for 2 guests
      };

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Number of guest details must match numberOfGuests');
    });

    it('should return 400 for invalid guest details', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.validateGuestDetails.mockReturnValue({
        valid: false,
        errors: ['Guest email is invalid']
      });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Guest details validation failed');
      expect(responseData.errors).toEqual(['Guest email is invalid']);
    });

    it('should return 500 for payment initialization failure', async () => {
      const requestBody = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const { DinnerUtils, UserUtils } = require('@/lib/utils');
      const { Payment } = require('@/lib/paystack-api');

      DinnerUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      DinnerUtils.calculateTotalAmount.mockReturnValue(75);
      UserUtils.findOrCreateUser.mockResolvedValue({ _id: 'user-id' });
      
      // Mock payment failure
      Payment.httpInitializePayment.mockResolvedValue({
        data: null // No reference returned
      });

      const request = mockRequest(requestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Failed to initialize payment');
    });
  });

  describe('GET', () => {
    const mockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost/api/v1/dinner');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      
      return {
        url: url.toString(),
      } as NextRequest;
    };

    it('should fetch dinner reservations with default pagination', async () => {
      const mockReservations = [
        { _id: '1', numberOfGuests: 2, totalAmount: 150 },
        { _id: '2', numberOfGuests: 1, totalAmount: 75 }
      ];

      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.getAllReservations.mockResolvedValue({
        reservations: mockReservations,
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
      expect(responseData.data).toEqual(mockReservations);
      expect(responseData.pagination).toBeDefined();
      expect(DinnerUtils.getAllReservations).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('should fetch reservations with custom pagination', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.getAllReservations.mockResolvedValue({
        reservations: [],
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalItems: 25,
          hasNext: true,
          hasPrev: true
        }
      });

      const request = mockRequest({ page: '2', limit: '5' });
      const response = await GET(request);

      expect(DinnerUtils.getAllReservations).toHaveBeenCalledWith({
        page: 2,
        limit: 5
      });
    });

    it('should filter by confirmed status', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.getAllReservations.mockResolvedValue({
        reservations: [],
        pagination: {}
      });

      const request = mockRequest({ confirmed: 'true' });
      const response = await GET(request);

      expect(DinnerUtils.getAllReservations).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        confirmed: true
      });
    });

    it('should handle errors gracefully', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.getAllReservations.mockRejectedValue(new Error('Database error'));

      const request = mockRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Failed to fetch dinner reservations');
    });
  });
});