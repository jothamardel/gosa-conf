/**
 * End-to-End Payment Scenarios Test Suite
 * 
 * This test suite simulates complete user journeys through the payment system
 * from form submission to webhook confirmation and notification delivery.
 */

import { POST as DinnerPOST } from '@/app/api/v1/dinner/route';
import { POST as AccommodationPOST } from '@/app/api/v1/accommodation/route';
import { POST as BrochurePOST } from '@/app/api/v1/brochure/route';
import { POST as GoodwillPOST } from '@/app/api/v1/goodwill/route';
import { POST as DonationPOST } from '@/app/api/v1/donation/route';
import { POST as WebhookPOST } from '@/app/api/webhook/paystack/route';
import { NextRequest } from 'next/server';

// Mock all dependencies
jest.mock('@/lib/utils', () => ({
  DinnerUtils: {
    validateGuestDetails: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    calculateTotalAmount: jest.fn().mockReturnValue(150),
    createReservation: jest.fn(),
    confirmReservation: jest.fn(),
  },
  AccommodationUtils: {
    validateDates: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    validateGuestDetails: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    checkAvailability: jest.fn().mockResolvedValue({ available: true }),
    calculateTotalAmount: jest.fn().mockReturnValue(200),
    createBooking: jest.fn(),
    confirmBooking: jest.fn(),
    calculateNights: jest.fn().mockReturnValue(2),
    getAccommodationTypeDetails: jest.fn().mockReturnValue({ name: 'Standard Room', price: 100 }),
  },
  BrochureUtils: {
    validateRecipientDetails: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    calculateTotalAmount: jest.fn().mockReturnValue(50),
    createOrder: jest.fn(),
    confirmOrder: jest.fn(),
    getBrochureTypeDetails: jest.fn().mockReturnValue({ name: 'Digital Brochure', price: 25 }),
  },
  GoodwillUtils: {
    validateMessage: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    validateDonationAmount: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    createMessage: jest.fn(),
    confirmMessage: jest.fn(),
  },
  DonationUtils: {
    validateDonationAmount: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    validateDonorInfo: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    createDonation: jest.fn(),
    confirmDonation: jest.fn(),
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
    sendAccommodationConfirmation: jest.fn(),
    sendBrochureConfirmation: jest.fn(),
    sendGoodwillConfirmation: jest.fn(),
    sendDonationThankYou: jest.fn(),
  },
}));

describe('End-to-End Payment Scenarios', () => {
  const mockUser = {
    _id: 'user-123',
    fullName: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '+1234567890'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const { UserUtils } = require('@/lib/utils');
    UserUtils.findOrCreateUser.mockResolvedValue(mockUser);

    const { Payment } = require('@/lib/paystack-api');
    Payment.httpInitializePayment.mockResolvedValue({
      data: {
        reference: 'paystack-ref-123',
        authorization_url: 'https://checkout.paystack.com/test'
      }
    });
    Payment.verifyPayment.mockResolvedValue({
      data: {
        status: 'success',
        reference: 'paystack-ref-123',
        amount: 15000
      }
    });
  });

  describe('Dinner Reservation Complete Flow', () => {
    it('should complete dinner reservation from booking to confirmation', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      const { NotificationService } = require('@/lib/services/notification.service');

      // Step 1: Create reservation
      const reservationData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+1987654321' }
        ],
        specialRequests: 'Vegetarian meals'
      };

      const mockReservation = {
        _id: 'reservation-123',
        ...reservationData,
        userId: mockUser._id,
        paymentReference: 'DINNER_123_+1234567890',
        totalAmount: 150,
        confirmed: false
      };

      DinnerUtils.createReservation.mockResolvedValue(mockReservation);

      const request = {
        json: jest.fn().mockResolvedValue(reservationData),
      } as unknown as NextRequest;

      const response = await DinnerPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.paymentLink).toBe('https://checkout.paystack.com/test');

      // Step 2: Simulate successful payment webhook
      const confirmedReservation = {
        ...mockReservation,
        confirmed: true,
        qrCodes: [
          { guestName: 'John Doe', qrCode: 'qr-john', used: false },
          { guestName: 'Jane Smith', qrCode: 'qr-jane', used: false }
        ]
      };

      DinnerUtils.confirmReservation.mockResolvedValue(confirmedReservation);
      NotificationService.sendDinnerConfirmation.mockResolvedValue(true);

      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'paystack-ref-123',
          amount: 15000,
          status: 'success',
          metadata: {
            type: 'dinner',
            userId: mockUser._id,
            numberOfGuests: 2
          }
        }
      };

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      const webhookResponse = await WebhookPOST(webhookRequest);
      const webhookData = await webhookResponse.json();

      expect(webhookResponse.status).toBe(200);
      expect(webhookData.success).toBe(true);
      expect(DinnerUtils.confirmReservation).toHaveBeenCalledWith('paystack-ref-123');
      expect(NotificationService.sendDinnerConfirmation).toHaveBeenCalledWith(confirmedReservation);
    });
  });

  describe('Accommodation Booking Complete Flow', () => {
    it('should complete accommodation booking from request to confirmation', async () => {
      const { AccommodationUtils } = require('@/lib/utils');
      const { NotificationService } = require('@/lib/services/notification.service');

      // Step 1: Create booking
      const bookingData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'standard',
        checkInDate: '2025-01-01',
        checkOutDate: '2025-01-03',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+1987654321' }
        ],
        specialRequests: 'Late check-in'
      };

      const mockBooking = {
        _id: 'booking-123',
        ...bookingData,
        userId: mockUser._id,
        paymentReference: 'ACCOM_123_+1234567890',
        totalAmount: 200,
        confirmed: false,
        confirmationCode: 'ACC-12345678'
      };

      AccommodationUtils.createBooking.mockResolvedValue(mockBooking);

      const request = {
        json: jest.fn().mockResolvedValue(bookingData),
      } as unknown as NextRequest;

      const response = await AccommodationPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      // Step 2: Confirm booking via webhook
      const confirmedBooking = {
        ...mockBooking,
        confirmed: true
      };

      AccommodationUtils.confirmBooking.mockResolvedValue(confirmedBooking);
      NotificationService.sendAccommodationConfirmation.mockResolvedValue(true);

      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'paystack-ref-123',
          amount: 20000,
          status: 'success',
          metadata: {
            type: 'accommodation',
            userId: mockUser._id,
            accommodationType: 'standard'
          }
        }
      };

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      await WebhookPOST(webhookRequest);

      expect(AccommodationUtils.confirmBooking).toHaveBeenCalledWith('paystack-ref-123');
      expect(NotificationService.sendAccommodationConfirmation).toHaveBeenCalledWith(confirmedBooking);
    });
  });

  describe('Multi-Service User Journey', () => {
    it('should handle user booking multiple services', async () => {
      const { DinnerUtils, AccommodationUtils, BrochureUtils } = require('@/lib/utils');

      // User books dinner
      const dinnerData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe', email: 'john@example.com', phone: '+1234567890' }]
      };

      DinnerUtils.createReservation.mockResolvedValue({
        _id: 'dinner-123',
        paymentReference: 'DINNER_123_+1234567890'
      });

      const dinnerRequest = {
        json: jest.fn().mockResolvedValue(dinnerData),
      } as unknown as NextRequest;

      const dinnerResponse = await DinnerPOST(dinnerRequest);
      expect(dinnerResponse.status).toBe(200);

      // Same user books accommodation
      const accommodationData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        accommodationType: 'premium',
        checkInDate: '2025-01-01',
        checkOutDate: '2025-01-02',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe', email: 'john@example.com', phone: '+1234567890' }]
      };

      AccommodationUtils.createBooking.mockResolvedValue({
        _id: 'accommodation-123',
        paymentReference: 'ACCOM_456_+1234567890'
      });

      const accommodationRequest = {
        json: jest.fn().mockResolvedValue(accommodationData),
      } as unknown as NextRequest;

      const accommodationResponse = await AccommodationPOST(accommodationRequest);
      expect(accommodationResponse.status).toBe(200);

      // Same user orders brochure
      const brochureData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        quantity: 1,
        brochureType: 'digital',
        recipientDetails: [{ name: 'John Doe', email: 'john@example.com', phone: '+1234567890' }]
      };

      BrochureUtils.createOrder.mockResolvedValue({
        _id: 'brochure-123',
        paymentReference: 'BROCH_789_+1234567890'
      });

      const brochureRequest = {
        json: jest.fn().mockResolvedValue(brochureData),
      } as unknown as NextRequest;

      const brochureResponse = await BrochurePOST(brochureRequest);
      expect(brochureResponse.status).toBe(200);

      // Verify same user was used for all services
      const { UserUtils } = require('@/lib/utils');
      expect(UserUtils.findOrCreateUser).toHaveBeenCalledTimes(3);
      expect(UserUtils.findOrCreateUser).toHaveBeenCalledWith({
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle payment timeout and retry', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      const { Payment } = require('@/lib/paystack-api');

      // First attempt fails
      Payment.httpInitializePayment.mockRejectedValueOnce(
        new Error('Payment gateway timeout')
      );

      const dinnerData = {
        email: 'john@example.com',
        fullName: 'John Doe',
        phoneNumber: '+1234567890',
        numberOfGuests: 1,
        guestDetails: [{ name: 'John Doe' }]
      };

      const request = {
        json: jest.fn().mockResolvedValue(dinnerData),
      } as unknown as NextRequest;

      const firstResponse = await DinnerPOST(request);
      expect(firstResponse.status).toBe(500);

      // Second attempt succeeds
      Payment.httpInitializePayment.mockResolvedValueOnce({
        data: {
          reference: 'paystack-ref-retry',
          authorization_url: 'https://checkout.paystack.com/retry'
        }
      });

      DinnerUtils.createReservation.mockResolvedValue({
        _id: 'dinner-retry',
        paymentReference: 'DINNER_RETRY_+1234567890'
      });

      const secondResponse = await DinnerPOST(request);
      expect(secondResponse.status).toBe(200);
    });

    it('should handle partial webhook failures gracefully', async () => {
      const { DinnerUtils } = require('@/lib/utils');
      const { NotificationService } = require('@/lib/services/notification.service');

      // Reservation confirmation succeeds
      DinnerUtils.confirmReservation.mockResolvedValue({
        _id: 'dinner-123',
        confirmed: true,
        qrCodes: [{ guestName: 'John Doe', qrCode: 'qr-123' }]
      });

      // Notification fails
      NotificationService.sendDinnerConfirmation.mockRejectedValue(
        new Error('Notification service unavailable')
      );

      const webhookPayload = {
        event: 'charge.success',
        data: {
          reference: 'paystack-ref-123',
          status: 'success',
          metadata: { type: 'dinner', userId: 'user-123' }
        }
      };

      const webhookRequest = {
        json: jest.fn().mockResolvedValue(webhookPayload),
        headers: {
          get: jest.fn().mockReturnValue('valid-signature')
        }
      } as unknown as NextRequest;

      const response = await WebhookPOST(webhookRequest);

      // Webhook should still succeed even if notification fails
      expect(response.status).toBe(200);
      expect(DinnerUtils.confirmReservation).toHaveBeenCalled();
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain data consistency across service boundaries', async () => {
      const { UserUtils, DinnerUtils } = require('@/lib/utils');

      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890'
      };

      const dinnerData = {
        ...userData,
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+1987654321' }
        ]
      };

      DinnerUtils.createReservation.mockImplementation((data) => {
        // Verify that the reservation data matches the user data
        expect(data.userId).toBe(mockUser._id);
        expect(data.numberOfGuests).toBe(dinnerData.numberOfGuests);
        expect(data.guestDetails).toEqual(dinnerData.guestDetails);

        return Promise.resolve({
          _id: 'reservation-123',
          ...data,
          confirmed: false
        });
      });

      const request = {
        json: jest.fn().mockResolvedValue(dinnerData),
      } as unknown as NextRequest;

      const response = await DinnerPOST(request);
      expect(response.status).toBe(200);

      // Verify user creation was called with correct data
      expect(UserUtils.findOrCreateUser).toHaveBeenCalledWith(userData);
    });
  });
});