import { NotificationService } from '@/lib/services/notification.service';
import { IDinnerReservation, IAccommodation, IConventionBrochure, IGoodwillMessage, IDonation } from '@/lib/schema';

// Mock WASender API
jest.mock('@/lib/wasender-api', () => ({
  WASender: {
    sendMessage: jest.fn(),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendDinnerConfirmation', () => {
    it('should send dinner confirmation with QR codes', async () => {
      const mockReservation = {
        _id: 'reservation-id',
        userId: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '+1234567890'
        },
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+1987654321' }
        ],
        qrCodes: [
          { guestName: 'John Doe', qrCode: 'qr-code-1', used: false },
          { guestName: 'Jane Smith', qrCode: 'qr-code-2', used: false }
        ],
        totalAmount: 150,
        specialRequests: 'Vegetarian meal'
      } as unknown as IDinnerReservation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendDinnerConfirmation(mockReservation);

      expect(WASender.sendMessage).toHaveBeenCalledTimes(2); // One for each guest

      // Check first guest notification
      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.stringContaining('Welcome Dinner Confirmation'),
        attachments: [
          {
            type: 'qr_code',
            data: 'qr-code-1',
            filename: 'dinner-qr-john-doe.png'
          }
        ]
      });

      // Check second guest notification
      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1987654321',
        message: expect.stringContaining('Welcome Dinner Confirmation'),
        attachments: [
          {
            type: 'qr_code',
            data: 'qr-code-2',
            filename: 'dinner-qr-jane-smith.png'
          }
        ]
      });
    });

    it('should handle guests without phone numbers', async () => {
      const mockReservation = {
        _id: 'reservation-id',
        userId: {
          fullName: 'John Doe',
          phoneNumber: '+1234567890'
        },
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', phone: '+1234567890' },
          { name: 'Jane Smith' } // No phone number
        ],
        qrCodes: [
          { guestName: 'John Doe', qrCode: 'qr-code-1', used: false },
          { guestName: 'Jane Smith', qrCode: 'qr-code-2', used: false }
        ],
        totalAmount: 150
      } as unknown as IDinnerReservation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendDinnerConfirmation(mockReservation);

      // Should only send to the guest with phone number
      expect(WASender.sendMessage).toHaveBeenCalledTimes(1);
      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.any(String),
        attachments: expect.any(Array)
      });
    });

    it('should handle WASender API errors gracefully', async () => {
      const mockReservation = {
        userId: { phoneNumber: '+1234567890' },
        guestDetails: [{ name: 'John Doe', phone: '+1234567890' }],
        qrCodes: [{ guestName: 'John Doe', qrCode: 'qr-code-1' }]
      } as unknown as IDinnerReservation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockRejectedValue(new Error('API Error'));

      // Should not throw error
      await expect(NotificationService.sendDinnerConfirmation(mockReservation))
        .resolves.not.toThrow();
    });
  });

  describe('sendAccommodationConfirmation', () => {
    it('should send accommodation confirmation with booking details', async () => {
      const mockBooking = {
        _id: 'booking-id',
        userId: {
          fullName: 'John Doe',
          phoneNumber: '+1234567890'
        },
        accommodationType: 'standard',
        checkInDate: new Date('2024-01-01'),
        checkOutDate: new Date('2024-01-03'),
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', phone: '+1234567890' },
          { name: 'Jane Smith', phone: '+1987654321' }
        ],
        confirmationCode: 'ACC-12345678',
        totalAmount: 200
      } as unknown as IAccommodation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendAccommodationConfirmation(mockBooking);

      expect(WASender.sendMessage).toHaveBeenCalledTimes(2);
      
      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.stringContaining('Accommodation Booking Confirmed'),
        attachments: []
      });

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('ACC-12345678');
      expect(sentMessage).toContain('Standard Room');
      expect(sentMessage).toContain('January 1, 2024');
      expect(sentMessage).toContain('January 3, 2024');
    });
  });

  describe('sendBrochureConfirmation', () => {
    it('should send brochure confirmation for digital type', async () => {
      const mockOrder = {
        _id: 'order-id',
        userId: {
          fullName: 'John Doe',
          phoneNumber: '+1234567890'
        },
        brochureType: 'digital',
        quantity: 2,
        recipientDetails: [
          { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { name: 'Jane Smith', email: 'jane@example.com', phone: '+1987654321' }
        ],
        totalAmount: 50
      } as unknown as IConventionBrochure;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendBrochureConfirmation(mockOrder);

      expect(WASender.sendMessage).toHaveBeenCalledTimes(2);
      
      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('Convention Brochure Order Confirmed');
      expect(sentMessage).toContain('Digital Download');
    });

    it('should send brochure confirmation for physical type', async () => {
      const mockOrder = {
        userId: { phoneNumber: '+1234567890' },
        brochureType: 'physical',
        quantity: 1,
        recipientDetails: [{ name: 'John Doe', phone: '+1234567890' }],
        qrCode: 'pickup-qr-code'
      } as unknown as IConventionBrochure;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendBrochureConfirmation(mockOrder);

      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.stringContaining('Physical Pickup'),
        attachments: [
          {
            type: 'qr_code',
            data: 'pickup-qr-code',
            filename: 'brochure-pickup-qr.png'
          }
        ]
      });
    });
  });

  describe('sendGoodwillConfirmation', () => {
    it('should send goodwill message confirmation', async () => {
      const mockMessage = {
        _id: 'message-id',
        userId: {
          fullName: 'John Doe',
          phoneNumber: '+1234567890'
        },
        message: 'Thank you for all your hard work!',
        donationAmount: 50,
        anonymous: false,
        attributionName: 'John Doe'
      } as unknown as IGoodwillMessage;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillConfirmation(mockMessage);

      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.stringContaining('Goodwill Message Submitted'),
        attachments: []
      });

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('$50');
      expect(sentMessage).toContain('pending approval');
    });

    it('should handle anonymous goodwill messages', async () => {
      const mockMessage = {
        userId: { phoneNumber: '+1234567890' },
        message: 'Anonymous support message',
        donationAmount: 25,
        anonymous: true
      } as unknown as IGoodwillMessage;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillConfirmation(mockMessage);

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('anonymous');
      expect(sentMessage).not.toContain('John Doe');
    });
  });

  describe('sendDonationThankYou', () => {
    it('should send donation thank you message', async () => {
      const mockDonation = {
        _id: 'donation-id',
        userId: {
          fullName: 'John Doe',
          phoneNumber: '+1234567890'
        },
        amount: 100,
        donorName: 'John Doe',
        anonymous: false,
        receiptNumber: 'DON-12345678'
      } as unknown as IDonation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(mockDonation);

      expect(WASender.sendMessage).toHaveBeenCalledWith({
        phone: '+1234567890',
        message: expect.stringContaining('Thank you for your generous donation'),
        attachments: []
      });

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('$100');
      expect(sentMessage).toContain('DON-12345678');
    });

    it('should handle anonymous donations', async () => {
      const mockDonation = {
        userId: { phoneNumber: '+1234567890' },
        amount: 50,
        anonymous: true,
        receiptNumber: 'DON-87654321'
      } as unknown as IDonation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(mockDonation);

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('anonymous donation');
      expect(sentMessage).toContain('DON-87654321');
    });

    it('should handle donations on behalf of others', async () => {
      const mockDonation = {
        userId: { phoneNumber: '+1234567890' },
        amount: 75,
        donorName: 'John Doe',
        onBehalfOf: 'In memory of Jane Smith',
        receiptNumber: 'DON-11111111'
      } as unknown as IDonation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(mockDonation);

      const sentMessage = WASender.sendMessage.mock.calls[0][0].message;
      expect(sentMessage).toContain('In memory of Jane Smith');
    });
  });

  describe('Error Handling', () => {
    it('should log errors but not throw', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockReservation = {
        userId: { phoneNumber: '+1234567890' },
        guestDetails: [{ name: 'John Doe', phone: '+1234567890' }],
        qrCodes: [{ guestName: 'John Doe', qrCode: 'qr-code-1' }]
      } as unknown as IDinnerReservation;

      const { WASender } = require('@/lib/wasender-api');
      WASender.sendMessage.mockRejectedValue(new Error('Network error'));

      await NotificationService.sendDinnerConfirmation(mockReservation);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error sending dinner confirmation:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing user data gracefully', async () => {
      const mockReservation = {
        guestDetails: [],
        qrCodes: []
      } as unknown as IDinnerReservation;

      // Should not throw error
      await expect(NotificationService.sendDinnerConfirmation(mockReservation))
        .resolves.not.toThrow();
    });
  });
});