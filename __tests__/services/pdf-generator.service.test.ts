import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';
import { PDFData } from '@/lib/types';

// Mock QRCodeService
jest.mock('@/lib/services/qr-code.service', () => ({
  QRCodeService: {
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
  }
}));

describe('PDFGeneratorService', () => {
  const mockPDFData: PDFData = {
    userDetails: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+2348123456789',
      registrationId: 'REG001'
    },
    operationDetails: {
      type: 'convention',
      amount: 15000,
      paymentReference: 'PAY123456',
      date: new Date('2024-01-15'),
      status: 'confirmed',
      description: 'Convention Registration',
      additionalInfo: 'Standard accommodation included'
    },
    qrCodeData: 'REG001-CONVENTION'
  };

  describe('generatePDFHTML', () => {
    it('should generate HTML with all required elements', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(mockPDFData);

      expect(html).toContain('GOSA 2025 Convention');
      expect(html).toContain('For Light and Truth');
      expect(html).toContain('John Doe');
      expect(html).toContain('john@example.com');
      expect(html).toContain('+2348123456789');
      expect(html).toContain('REG001');
      expect(html).toContain('PAY123456');
      expect(html).toContain('₦15,000');
      expect(html).toContain('Convention Registration');
      expect(html).toContain('Standard accommodation included');
    });

    it('should include QR code image', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(mockPDFData);

      expect(html).toContain('data:image/png;base64,mockqrcode');
      expect(html).toContain('QR Code');
    });

    it('should handle different service types', async () => {
      const dinnerData = {
        ...mockPDFData,
        operationDetails: {
          ...mockPDFData.operationDetails,
          type: 'dinner' as const,
          description: 'Dinner Reservation',
          additionalInfo: '2 guests, Vegetarian option'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(dinnerData);

      expect(html).toContain('Dinner Reservation');
      expect(html).toContain('2 guests, Vegetarian option');
    });

    it('should format currency correctly', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(mockPDFData);

      expect(html).toContain('₦15,000');
    });

    it('should format dates correctly', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(mockPDFData);

      expect(html).toContain('January 15, 2024');
    });

    it('should handle missing additional info gracefully', async () => {
      const dataWithoutAdditionalInfo = {
        ...mockPDFData,
        operationDetails: {
          ...mockPDFData.operationDetails,
          additionalInfo: undefined
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(dataWithoutAdditionalInfo);

      expect(html).toBeDefined();
      expect(html).toContain('John Doe');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with user name and service type', () => {
      const filename = PDFGeneratorService.generateFilename(
        mockPDFData.userDetails,
        'convention'
      );

      expect(filename).toBe('GOSA_2025_Convention_John_Doe_REG001.pdf');
    });

    it('should handle names with spaces and special characters', () => {
      const userWithSpecialName = {
        ...mockPDFData.userDetails,
        name: 'Mary Jane O\'Connor-Smith'
      };

      const filename = PDFGeneratorService.generateFilename(
        userWithSpecialName,
        'dinner'
      );

      expect(filename).toBe('GOSA_2025_Dinner_Mary_Jane_O_Connor_Smith_REG001.pdf');
    });

    it('should capitalize service types correctly', () => {
      const filename = PDFGeneratorService.generateFilename(
        mockPDFData.userDetails,
        'accommodation'
      );

      expect(filename).toBe('GOSA_2025_Accommodation_John_Doe_REG001.pdf');
    });
  });

  describe('formatServiceDetails', () => {
    it('should format convention details correctly', () => {
      const details = {
        accommodationType: 'Standard',
        guestCount: 1,
        checkInDate: '2024-03-15',
        checkOutDate: '2024-03-17'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('convention', details);

      expect(formatted).toContain('Accommodation: Standard');
      expect(formatted).toContain('Guests: 1');
      expect(formatted).toContain('Check-in: March 15, 2024');
      expect(formatted).toContain('Check-out: March 17, 2024');
    });

    it('should format dinner details correctly', () => {
      const details = {
        guestCount: 3,
        dinnerDate: '2024-03-16',
        dietaryRequirements: 'Vegetarian, No nuts'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('dinner', details);

      expect(formatted).toContain('Guests: 3');
      expect(formatted).toContain('Date: March 16, 2024');
      expect(formatted).toContain('Dietary Requirements: Vegetarian, No nuts');
    });

    it('should format accommodation details correctly', () => {
      const details = {
        roomType: 'Premium',
        guestCount: 2,
        checkInDate: '2024-03-15',
        checkOutDate: '2024-03-17',
        confirmationCode: 'ACC123'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('accommodation', details);

      expect(formatted).toContain('Room Type: Premium');
      expect(formatted).toContain('Guests: 2');
      expect(formatted).toContain('Confirmation Code: ACC123');
    });

    it('should format brochure details correctly', () => {
      const details = {
        quantity: 5,
        deliveryAddress: '123 Main St, Lagos',
        orderType: 'Physical'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('brochure', details);

      expect(formatted).toContain('Quantity: 5');
      expect(formatted).toContain('Delivery Address: 123 Main St, Lagos');
      expect(formatted).toContain('Order Type: Physical');
    });

    it('should format goodwill details correctly', () => {
      const details = {
        message: 'Congratulations on the convention!',
        donationPurpose: 'General Fund'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('goodwill', details);

      expect(formatted).toContain('Message: Congratulations on the convention!');
      expect(formatted).toContain('Donation Purpose: General Fund');
    });

    it('should format donation details correctly', () => {
      const details = {
        purpose: 'Building Fund',
        attribution: 'Anonymous'
      };

      const formatted = (PDFGeneratorService as any).formatServiceDetails('donation', details);

      expect(formatted).toContain('Purpose: Building Fund');
      expect(formatted).toContain('Attribution: Anonymous');
    });

    it('should handle missing details gracefully', () => {
      const formatted = (PDFGeneratorService as any).formatServiceDetails('convention', {});

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle QR code generation failure', async () => {
      const { QRCodeService } = require('@/lib/services/qr-code.service');
      QRCodeService.generateQRCode.mockRejectedValueOnce(new Error('QR generation failed'));

      await expect(PDFGeneratorService.generatePDFHTML(mockPDFData))
        .rejects.toThrow('QR generation failed');
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = {
        ...mockPDFData,
        userDetails: {
          ...mockPDFData.userDetails,
          name: null as any
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(invalidData);

      expect(html).toBeDefined();
      expect(html).toContain('GOSA 2025 Convention');
    });
  });
});