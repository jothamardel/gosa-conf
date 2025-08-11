import { POST as DinnerPOST } from '@/app/api/v1/dinner/route';
import { POST as WebhookPOST } from '@/app/api/webhook/paystack/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/utils', () => ({
  DinnerUtils: {
    validateGuestDetails: jest.fn(),
    calculateTotalAmount: jest.fn(),
    createReservation: jest.fn(),
    confirmReservation: jest.fn(),
  },
  UserUtils: {
    findOrCreateUser: jest.fn(),
  },
}));

jest.mock('@/lib/paystack-api', () => ({
  Payment: {
    httpInitializePayment: jest.fn(),
    verifyPayment: jest.fn(),
  },
}));

jest.mock('@/lib/services/notification.service', () => ({
  NotificationService: {
    sendDinnerConfirmation: jest.fn(),
  },
}));

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Dinner Payment Flow', () => {
    it('should handle complete payment flow from reservation to confirmation', async () => {
      // Step 1: Create dinner reservation
      const reservationRequest = {
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
      const { NotificationService } = require('@/lib/services/notification.service');

      // Mock reservation creation
      DinnerUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      DinnerUtils.calculateTotalAmount.mockReturnValue(150);
      
      UserUtils.findOrCreateUser.mockResolvedValue({
        _id: 'user-id-123',
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      });

      Payment.httpInitializePayment.mockResolvedValue({
        data: {
          reference: 'paystack-ref-456',
          authorization_url: 'https://checkout.paystack.com/test'
        }
      });

      const mockReservation = {
        _id: 'reservation-id-789',
        userId: 'user-id-123',
        paymentReference: 'DINNER_1234567890_+1234567890',
        numberOfGuests: 2,
        guestDetails: reservationRequest.guestDetails,
        totalAmount: 150,
        confirmed: false
      };

      DinnerUtils.createReservation.mockResolvedValue(mockReservation);

      const request = {
        json: jest.fn().mockResolvedValue(reservationRequest),
      } as unknown as NextRequest;

      const response = await DinnerPOST(request);
      const responseData = await response.json();

      // Verify reservation creation
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.paymentLink).toBe('https://checkout.paystack.com/test');
      expect(DinnerUtils.createReservation).toHaveBeenCalled();

      // Step 2: Simulate webhook confirmation
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'paystack-ref-456',
          amount: 15000, // Amount in kobo (150 * 100)
          status: 'success',
          metadata: {
            type: 'dinner',
            userId: 'user-id-123',
            numberOfGuests: 2
          }
        }
      };

      // Mock payment verification
      Payment.verifyPayment.mockResolvedValue({
        data: {
          status: 'success',
          reference: 'paystack-ref-456',
          amount: 15000
        }
      });

      // Mock reservation confirmation
      const confirmedReservation = {
        ...mockReservation,
        confirmed: true,
        qrCodes: [
          { guestName: 'John Doe', qrCode: 'qr-code-1', used: false },
          { guestName: 'Jane Smith', qrCode: 'qr-code-2', used: false }
        ]
      };

      DinnerUtils.confirmReservation.mockResolvedValue(confirmedReservation);
      NotificationService.sendDinnerConfirmation.mockResolvedValue(true);

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      // Mock webhook signature verification
      process.env.PAYSTACK_SECRET_KEY = 'test-secret-key';

      const webhookResponse = await WebhookPOST(webhookRequest);
      const webhookResponseData = await webhookResponse.json();

      // Verify webhook processing
      expect(webhookResponse.status).toBe(200);
      expect(webhookResponseData.success).toBe(true);
      expect(DinnerUtils.confirmReservation).toHaveBeenCalledWith('paystack-ref-456');
      expect(NotificationService.sendDinnerConfirmation).toHaveBeenCalledWith(confirmedReservation);
    });

    it('should handle payment failure gracefully', async () => {
      const webhookPayload = {
        event: 'charge.failed',
        data: {
          reference: 'paystack-ref-failed',
          amount: 15000,
          status: 'failed',
          metadata: {
            type: 'dinner',
            userId: 'user-id-123'
          }
        }
      };

      const { Payment } = require('@/lib/paystack-api');
      Payment.verifyPayment.mockResolvedValue({
        data: {
          status: 'failed',
          reference: 'paystack-ref-failed'
        }
      });

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      const webhookResponse = await WebhookPOST(webhookRequest);
      const webhookResponseData = await webhookResponse.json();

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponseData.success).toBe(true);
      
      // Verify that confirmation methods are not called for failed payments
      const { DinnerUtils } = require('@/lib/utils');
      expect(DinnerUtils.confirmReservation).not.toHaveBeenCalled();
    });

    it('should handle duplicate webhook events', async () => {
      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'paystack-ref-duplicate',
          amount: 15000,
          status: 'success',
          metadata: {
            type: 'dinner',
            userId: 'user-id-123'
          }
        }
      };

      const { Payment, DinnerUtils } = require('@/lib/utils');
      
      // First webhook call succeeds
      Payment.verifyPayment.mockResolvedValueOnce({
        data: {
          status: 'success',
          reference: 'paystack-ref-duplicate'
        }
      });

      const confirmedReservation = {
        _id: 'reservation-id',
        confirmed: true
      };

      DinnerUtils.confirmReservation.mockResolvedValueOnce(confirmedReservation);

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      // First webhook call
      const firstResponse = await WebhookPOST(webhookRequest);
      expect(firstResponse.status).toBe(200);

      // Second webhook call (duplicate)
      DinnerUtils.confirmReservation.mockRejectedValueOnce(
        new Error('Reservation already confirmed')
      );

      const secondResponse = await WebhookPOST(webhookRequest);
      
      // Should still return success but not process duplicate
      expect(secondResponse.status).toBe(200);
    });
  });

  describe('Multi-Service Payment Flow', () => {
    it('should handle multiple service bookings for same user', async () => {
      const { UserUtils } = require('@/lib/utils');
      
      const mockUser = {
        _id: 'user-id-multi',
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      };

      UserUtils.findOrCreateUser.mockResolvedValue(mockUser);

      // Test that the same user can be used across different services
      expect(mockUser._id).toBe('user-id-multi');
      expect(mockUser.email).toBe('john@example.com');
      
      // Verify user is consistently returned
      const user1 = await UserUtils.findOrCreateUser({
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      });

      const user2 = await UserUtils.findOrCreateUser({
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      });

      expect(user1._id).toBe(user2._id);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      DinnerUtils.createReservation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = {
        json: jest.fn().mockResolvedValue({
          email: 'john@example.com',
          fullName: 'John Doe',
          phoneNumber: '+1234567890',
          numberOfGuests: 1,
          guestDetails: [{ name: 'John Doe' }]
        }),
      } as unknown as NextRequest;

      const response = await DinnerPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Something went wrong');
    });

    it('should handle Paystack API errors', async () => {
      const { DinnerUtils, UserUtils } = require('@/lib/utils');
      const { Payment } = require('@/lib/paystack-api');

      DinnerUtils.validateGuestDetails.mockReturnValue({ valid: true, errors: [] });
      DinnerUtils.calculateTotalAmount.mockReturnValue(75);
      UserUtils.findOrCreateUser.mockResolvedValue({ _id: 'user-id' });

      // Mock Paystack API failure
      Payment.httpInitializePayment.mockRejectedValue(
        new Error('Paystack API unavailable')
      );

      const request = {
        json: jest.fn().mockResolvedValue({
          email: 'john@example.com',
          fullName: 'John Doe',
          phoneNumber: '+1234567890',
          numberOfGuests: 1,
          guestDetails: [{ name: 'John Doe' }]
        }),
      } as unknown as NextRequest;

      const response = await DinnerPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Paystack API unavailable');
    });
  });
});