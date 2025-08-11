import { POST, GET } from '@/app/api/v1/dinner/route';
import { DinnerUtils } from '@/lib/utils/dinner.utils';
import { UserUtils } from '@/lib/utils/user.utils';
import { Payment } from '@/lib/paystack-api';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/utils');
jest.mock('@/lib/paystack-api');

const mockDinnerUtils = DinnerUtils as jest.Mocked<typeof DinnerUtils>;
const mockUserUtils = UserUtils as jest.Mocked<typeof UserUtils>;
const mockPayment = Payment as jest.Mocked<typeof Payment>;

describe('/api/v1/dinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    const validRequestBody = {
      email: 'john@example.com',
      fullName: 'John Doe',
      phoneNumber: '08012345678',
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      specialRequests: 'Vegetarian meals'
    };

    it('should create dinner reservation successfully', async () => {
      const mockUser = { _id: 'user123', name: 'John Doe' };
      const mockReservation = { _id: 'reservation123', ...validRequestBody };
      const mockPaymentResponse = {
        data: {
          reference: 'paystack_ref_123',
          authorization_url: 'https://checkout.paystack.com/xyz'
        }
      };

      mockUserUtils.findOrCreateUser = jest.fn().mockResolvedValue(mockUser);
      mockDinnerUtils.validateGuestDetails = jest.fn().mockReturnValue({ valid: true, errors: [] });
      mockDinnerUtils.calculateTotalAmount = jest.fn().mockReturnValue(150);
      mockDinnerUtils.createReservation = jest.fn().mockResolvedValue(mockReservation);
      mockPayment.httpInitializePayment = jest.fn().mockResolvedValue(mockPaymentResponse);

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paymentLink).toBe('https://checkout.paystack.com/xyz');
      expect(mockDinnerUtils.createReservation).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequestBody = {
        email: 'john@example.com',
        // missing fullName, phoneNumber, etc.
      };

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Please provide');
    });

    it('should return 400 for invalid number of guests', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        numberOfGuests: 0
      };

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Number of guests must be between 1 and 10');
    });

    it('should return 400 for mismatched guest details count', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        numberOfGuests: 3,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Number of guest details must match numberOfGuests');
    });

    it('should return 400 for invalid guest details', async () => {
      mockDinnerUtils.validateGuestDetails = jest.fn().mockReturnValue({
        valid: false,
        errors: ['Guest name is required']
      });

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Guest details validation failed');
    });

    it('should return 500 for payment initialization failure', async () => {
      const mockUser = { _id: 'user123', name: 'John Doe' };

      mockUserUtils.findOrCreateUser = jest.fn().mockResolvedValue(mockUser);
      mockDinnerUtils.validateGuestDetails = jest.fn().mockReturnValue({ valid: true, errors: [] });
      mockDinnerUtils.calculateTotalAmount = jest.fn().mockReturnValue(150);
      mockPayment.httpInitializePayment = jest.fn().mockResolvedValue({ data: null });

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Failed to initialize payment');
    });

    it('should handle unexpected errors', async () => {
      mockUserUtils.findOrCreateUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/v1/dinner', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Something went wrong');
    });
  });

  describe('GET', () => {
    it('should return dinner reservations with pagination', async () => {
      const mockReservations = [
        { _id: 'res1', numberOfGuests: 2, confirmed: true },
        { _id: 'res2', numberOfGuests: 1, confirmed: false }
      ];

      const mockResult = {
        reservations: mockReservations,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalReservations: 2,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10
        }
      };

      mockDinnerUtils.getAllReservations = jest.fn().mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/v1/dinner?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReservations);
      expect(data.pagination).toEqual(mockResult.pagination);
    });

    it('should filter by confirmed status', async () => {
      const mockResult = {
        reservations: [{ _id: 'res1', confirmed: true }],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalReservations: 1,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10
        }
      };

      mockDinnerUtils.getAllReservations = jest.fn().mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/v1/dinner?confirmed=true');

      const response = await GET(request);

      expect(mockDinnerUtils.getAllReservations).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        confirmed: true
      });
    });

    it('should handle errors when fetching reservations', async () => {
      mockDinnerUtils.getAllReservations = jest.fn().mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/v1/dinner');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Failed to fetch dinner reservations');
    });
  });
});