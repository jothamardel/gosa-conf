import { NotificationService } from '@/lib/services/notification.service';
import { WASender } from '@/lib/wasender-api';

// Mock dependencies
jest.mock('@/lib/wasender-api');

const mockWASender = WASender as jest.Mocked<typeof WASender>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendDinnerConfirmation', () => {
    const mockReservation = {
      _id: 'dinner123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      numberOfGuests: 2,
      guestDetails: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ],
      totalAmount: 150,
      qrCodes: [
        { guestName: 'John Doe', qrCode: 'qr1', used: false },
        { guestName: 'Jane Doe', qrCode: 'qr2', used: false }
      ],
      createdAt: new Date()
    };

    it('should send dinner confirmation successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendDinnerConfirmation(mockReservation as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('dinner reservation confirmed'),
        type: 'dinner_confirmation'
      });
    });

    it('should handle notification sending errors', async () => {
      mockWASender.sendMessage = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(NotificationService.sendDinnerConfirmation(mockReservation as any))
        .rejects.toThrow('Failed to send dinner confirmation: Network error');
    });

    it('should include QR codes in notification', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendDinnerConfirmation(mockReservation as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('QR codes');
      expect(callArgs.message).toContain('John Doe');
      expect(callArgs.message).toContain('Jane Doe');
    });
  });

  describe('sendAccommodationConfirmation', () => {
    const mockBooking = {
      _id: 'accom123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      accommodationType: 'premium',
      checkInDate: new Date('2024-03-15'),
      checkOutDate: new Date('2024-03-17'),
      numberOfGuests: 2,
      totalAmount: 400,
      confirmationCode: 'CONF123456',
      createdAt: new Date()
    };

    it('should send accommodation confirmation successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendAccommodationConfirmation(mockBooking as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('accommodation booking confirmed'),
        type: 'accommodation_confirmation'
      });
    });

    it('should include booking details in notification', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendAccommodationConfirmation(mockBooking as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('premium');
      expect(callArgs.message).toContain('CONF123456');
      expect(callArgs.message).toContain('March 15');
      expect(callArgs.message).toContain('March 17');
    });
  });

  describe('sendBrochureConfirmation', () => {
    const mockOrder = {
      _id: 'broch123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      quantity: 5,
      brochureType: 'physical',
      totalAmount: 95,
      qrCode: 'pickup-qr-code',
      createdAt: new Date()
    };

    it('should send brochure confirmation successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendBrochureConfirmation(mockOrder as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('brochure order confirmed'),
        type: 'brochure_confirmation'
      });
    });

    it('should include pickup instructions for physical brochures', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendBrochureConfirmation(mockOrder as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('pickup');
      expect(callArgs.message).toContain('QR code');
    });

    it('should include download instructions for digital brochures', async () => {
      const digitalOrder = {
        ...mockOrder,
        brochureType: 'digital',
        qrCode: ''
      };

      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendBrochureConfirmation(digitalOrder as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('download');
      expect(callArgs.message).not.toContain('pickup');
    });
  });

  describe('sendGoodwillConfirmation', () => {
    const mockMessage = {
      _id: 'good123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      message: 'Wishing you all the best!',
      donationAmount: 50,
      anonymous: false,
      attributionName: 'John Doe',
      createdAt: new Date()
    };

    it('should send goodwill confirmation successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillConfirmation(mockMessage as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('goodwill message received'),
        type: 'goodwill_confirmation'
      });
    });

    it('should mention approval process in notification', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillConfirmation(mockMessage as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('review');
      expect(callArgs.message).toContain('approval');
    });
  });

  describe('sendDonationThankYou', () => {
    const mockDonation = {
      _id: 'dona123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      amount: 100,
      anonymous: false,
      donorName: 'John Doe',
      receiptNumber: 'RCP1234567890',
      createdAt: new Date()
    };

    it('should send donation thank you successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(mockDonation as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('thank you for your donation'),
        type: 'donation_thank_you'
      });
    });

    it('should include receipt number in notification', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(mockDonation as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('RCP1234567890');
      expect(callArgs.message).toContain('$100');
    });

    it('should handle anonymous donations appropriately', async () => {
      const anonymousDonation = {
        ...mockDonation,
        anonymous: true,
        donorName: undefined
      };

      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendDonationThankYou(anonymousDonation as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('anonymous donation');
    });
  });

  describe('sendGoodwillApprovalNotification', () => {
    const mockApprovedMessage = {
      _id: 'good123',
      userId: {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com'
      },
      message: 'Great convention!',
      approved: true,
      approvedAt: new Date(),
      createdAt: new Date()
    };

    it('should send approval notification successfully', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillApprovalNotification(mockApprovedMessage as any);

      expect(mockWASender.sendMessage).toHaveBeenCalledWith({
        phone: '08012345678',
        message: expect.stringContaining('goodwill message has been approved'),
        type: 'goodwill_approval'
      });
    });

    it('should include message preview in notification', async () => {
      mockWASender.sendMessage = jest.fn().mockResolvedValue({ success: true });

      await NotificationService.sendGoodwillApprovalNotification(mockApprovedMessage as any);

      const callArgs = mockWASender.sendMessage.mock.calls[0][0];
      expect(callArgs.message).toContain('Great convention!');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Nigerian phone numbers correctly', () => {
      expect(NotificationService.formatPhoneNumber('08012345678')).toBe('2348012345678');
      expect(NotificationService.formatPhoneNumber('07012345678')).toBe('2347012345678');
      expect(NotificationService.formatPhoneNumber('09012345678')).toBe('2349012345678');
    });

    it('should handle already formatted numbers', () => {
      expect(NotificationService.formatPhoneNumber('2348012345678')).toBe('2348012345678');
      expect(NotificationService.formatPhoneNumber('+2348012345678')).toBe('2348012345678');
    });

    it('should handle invalid phone numbers', () => {
      expect(NotificationService.formatPhoneNumber('123')).toBe('123');
      expect(NotificationService.formatPhoneNumber('')).toBe('');
    });
  });

  describe('createNotificationTemplate', () => {
    it('should create dinner confirmation template', () => {
      const data = {
        guestCount: 2,
        totalAmount: 150,
        guestNames: ['John Doe', 'Jane Doe']
      };

      const template = NotificationService.createNotificationTemplate('dinner_confirmation', data);

      expect(template).toContain('dinner reservation confirmed');
      expect(template).toContain('2 guests');
      expect(template).toContain('$150');
      expect(template).toContain('John Doe');
      expect(template).toContain('Jane Doe');
    });

    it('should create accommodation confirmation template', () => {
      const data = {
        accommodationType: 'premium',
        checkInDate: '2024-03-15',
        checkOutDate: '2024-03-17',
        confirmationCode: 'CONF123456'
      };

      const template = NotificationService.createNotificationTemplate('accommodation_confirmation', data);

      expect(template).toContain('accommodation booking confirmed');
      expect(template).toContain('premium');
      expect(template).toContain('CONF123456');
    });

    it('should throw error for unknown template type', () => {
      expect(() => {
        NotificationService.createNotificationTemplate('unknown_type' as any, {});
      }).toThrow('Unknown notification template type: unknown_type');
    });
  });
});