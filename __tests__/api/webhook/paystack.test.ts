import { POST } from '@/app/api/webhook/paystack/route';
import { DinnerUtils } from '@/lib/utils/dinner.utils';
import { AccommodationUtils } from '@/lib/utils/accommodation.utils';
import { BrochureUtils } from '@/lib/utils/brochure.utils';
import { GoodwillUtils } from '@/lib/utils/goodwill.utils';
import { DonationUtils } from '@/lib/utils/donation.utils';
import { NotificationService } from '@/lib/services/notification.service';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/utils');
jest.mock('@/lib/services/notification.service');

const mockDinnerUtils = DinnerUtils as jest.Mocked<typeof DinnerUtils>;
const mockAccommodationUtils = AccommodationUtils as jest.Mocked<typeof AccommodationUtils>;
const mockBrochureUtils = BrochureUtils as jest.Mocked<typeof BrochureUtils>;
const mockGoodwillUtils = GoodwillUtils as jest.Mocked<typeof GoodwillUtils>;
const mockDonationUtils = DonationUtils as jest.Mocked<typeof DonationUtils>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

describe('/api/webhook/paystack', () => {
  const mockSecret = 'test-paystack-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = mockSecret;
  });

  const createValidWebhookRequest = (eventData: any) => {
    const payload = JSON.stringify(eventData);
    const hash = crypto.createHmac('sha512', mockSecret).update(payload).digest('hex');

    return new NextRequest('http://localhost:3000/api/webhook/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': hash,
        'content-type': 'application/json'
      },
      body: payload
    });
  };

  describe('Webhook signature verification', () => {
    it('should reject requests with invalid signature', async () => {
      const eventData = {
        event: 'charge.success',
        data: { reference: 'test_ref' }
      };

      const request = new NextRequest('http://localhost:3000/api/webhook/paystack', {
        method: 'POST',
        headers: {
          'x-paystack-signature': 'invalid-signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject requests without signature header', async () => {
      const eventData = {
        event: 'charge.success',
        data: { reference: 'test_ref' }
      };

      const request = new NextRequest('http://localhost:3000/api/webhook/paystack', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Dinner reservation webhook', () => {
    it('should process successful dinner payment', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'DINNER_1703123456_08012345678',
          status: 'success',
          amount: 15000, // $150 in kobo
          metadata: {
            type: 'dinner',
            userId: 'user123',
            numberOfGuests: 2
          }
        }
      };

      const mockReservation = {
        _id: 'reservation123',
        userId: { name: 'John Doe', phone: '08012345678' },
        numberOfGuests: 2,
        confirmed: true
      };

      mockDinnerUtils.confirmReservation = jest.fn().mockResolvedValue(mockReservation);
      mockNotificationService.sendDinnerConfirmation = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDinnerUtils.confirmReservation).toHaveBeenCalledWith('DINNER_1703123456_08012345678');
      expect(mockNotificationService.sendDinnerConfirmation).toHaveBeenCalledWith(mockReservation);
    });

    it('should handle dinner confirmation errors gracefully', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'DINNER_1703123456_08012345678',
          status: 'success',
          metadata: { type: 'dinner' }
        }
      };

      mockDinnerUtils.confirmReservation = jest.fn().mockRejectedValue(new Error('Reservation not found'));

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200); // Should still return 200 to acknowledge webhook
    });
  });

  describe('Accommodation booking webhook', () => {
    it('should process successful accommodation payment', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'ACCOM_1703123456_08012345678',
          status: 'success',
          amount: 40000, // $400 in kobo
          metadata: {
            type: 'accommodation',
            userId: 'user123',
            accommodationType: 'premium'
          }
        }
      };

      const mockBooking = {
        _id: 'booking123',
        userId: { name: 'John Doe', phone: '08012345678' },
        accommodationType: 'premium',
        confirmed: true
      };

      mockAccommodationUtils.confirmBooking = jest.fn().mockResolvedValue(mockBooking);
      mockNotificationService.sendAccommodationConfirmation = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAccommodationUtils.confirmBooking).toHaveBeenCalledWith('ACCOM_1703123456_08012345678');
      expect(mockNotificationService.sendAccommodationConfirmation).toHaveBeenCalledWith(mockBooking);
    });
  });

  describe('Brochure order webhook', () => {
    it('should process successful brochure payment', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'BROCH_1703123456_08012345678',
          status: 'success',
          amount: 9500, // $95 in kobo
          metadata: {
            type: 'brochure',
            userId: 'user123',
            quantity: 5
          }
        }
      };

      const mockOrder = {
        _id: 'order123',
        userId: { name: 'John Doe', phone: '08012345678' },
        quantity: 5,
        confirmed: true
      };

      mockBrochureUtils.confirmOrder = jest.fn().mockResolvedValue(mockOrder);
      mockNotificationService.sendBrochureConfirmation = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockBrochureUtils.confirmOrder).toHaveBeenCalledWith('BROCH_1703123456_08012345678');
      expect(mockNotificationService.sendBrochureConfirmation).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('Goodwill message webhook', () => {
    it('should process successful goodwill payment', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'GOOD_1703123456_08012345678',
          status: 'success',
          amount: 5000, // $50 in kobo
          metadata: {
            type: 'goodwill',
            userId: 'user123',
            anonymous: false
          }
        }
      };

      const mockMessage = {
        _id: 'message123',
        userId: { name: 'John Doe', phone: '08012345678' },
        message: 'Great convention!',
        confirmed: true
      };

      mockGoodwillUtils.confirmMessage = jest.fn().mockResolvedValue(mockMessage);
      mockNotificationService.sendGoodwillConfirmation = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockGoodwillUtils.confirmMessage).toHaveBeenCalledWith('GOOD_1703123456_08012345678');
      expect(mockNotificationService.sendGoodwillConfirmation).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Donation webhook', () => {
    it('should process successful donation payment', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'DONA_1703123456_08012345678',
          status: 'success',
          amount: 10000, // $100 in kobo
          metadata: {
            type: 'donation',
            userId: 'user123',
            anonymous: false
          }
        }
      };

      const mockDonation = {
        _id: 'donation123',
        userId: { name: 'John Doe', phone: '08012345678' },
        amount: 100,
        confirmed: true
      };

      mockDonationUtils.confirmDonation = jest.fn().mockResolvedValue(mockDonation);
      mockNotificationService.sendDonationThankYou = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDonationUtils.confirmDonation).toHaveBeenCalledWith('DONA_1703123456_08012345678');
      expect(mockNotificationService.sendDonationThankYou).toHaveBeenCalledWith(mockDonation);
    });
  });

  describe('Payment type detection', () => {
    it('should detect dinner payment type from reference', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'DINNER_1703123456_08012345678',
          status: 'success'
        }
      };

      mockDinnerUtils.confirmReservation = jest.fn().mockResolvedValue({});
      mockNotificationService.sendDinnerConfirmation = jest.fn().mockResolvedValue(undefined);

      const request = createValidWebhookRequest(eventData);
      await POST(request);

      expect(mockDinnerUtils.confirmReservation).toHaveBeenCalled();
    });

    it('should handle unknown payment types', async () => {
      const eventData = {
        event: 'charge.success',
        data: {
          reference: 'UNKNOWN_1703123456_08012345678',
          status: 'success'
        }
      };

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200); // Should still acknowledge webhook
    });
  });

  describe('Failed payments', () => {
    it('should handle failed payment events', async () => {
      const eventData = {
        event: 'charge.failed',
        data: {
          reference: 'DINNER_1703123456_08012345678',
          status: 'failed'
        }
      };

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
      // Should not call confirmation methods for failed payments
      expect(mockDinnerUtils.confirmReservation).not.toHaveBeenCalled();
    });
  });

  describe('Other webhook events', () => {
    it('should handle non-payment events', async () => {
      const eventData = {
        event: 'customer.created',
        data: {
          customer_code: 'CUS_123'
        }
      };

      const request = createValidWebhookRequest(eventData);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});