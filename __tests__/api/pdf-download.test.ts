import { GET } from '@/app/api/v1/pdf/download/route';
import { NextRequest } from 'next/server';
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';

// Mock dependencies
jest.mock('@/lib/database', () => ({
  getRegistrationByPaymentReference: jest.fn(),
  getDinnerByPaymentReference: jest.fn(),
  getAccommodationByPaymentReference: jest.fn(),
  getBrochureByPaymentReference: jest.fn(),
  getGoodwillByPaymentReference: jest.fn(),
  getDonationByPaymentReference: jest.fn(),
}));

jest.mock('@/lib/services/pdf-generator.service');
jest.mock('@/lib/services/qr-code.service', () => ({
  QRCodeService: {
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
  }
}));

const mockDatabase = require('@/lib/database');
const mockPDFGenerator = PDFGeneratorService as jest.Mocked<typeof PDFGeneratorService>;

describe('/api/v1/pdf/download', () => {
  const mockRegistration = {
    _id: 'reg123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+2348123456789',
    registrationId: 'REG001',
    paymentReference: 'PAY123456',
    amount: 15000,
    paymentStatus: 'confirmed',
    accommodationType: 'Standard',
    guestCount: 1,
    createdAt: new Date('2025-01-15')
  };

  const mockDinner = {
    _id: 'dinner123',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+2348123456790',
    registrationId: 'REG002',
    paymentReference: 'PAY123457',
    amount: 7500,
    paymentStatus: 'confirmed',
    guestCount: 2,
    dinnerDate: '2025-03-16',
    dietaryRequirements: 'Vegetarian',
    createdAt: new Date('2025-01-16')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPDFGenerator.generatePDFHTML.mockResolvedValue('<html>Mock PDF Content</html>');
    mockPDFGenerator.generateFilename.mockReturnValue('GOSA_2025_Convention_John_Doe_REG001.pdf');
  });

  describe('Convention Registration PDFs', () => {
    it('should generate PDF for valid convention registration', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(mockRegistration);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain('GOSA_2025_Convention_John_Doe_REG001.pdf');
      expect(mockPDFGenerator.generatePDFHTML).toHaveBeenCalledWith({
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
          date: mockRegistration.createdAt,
          status: 'confirmed',
          description: 'Convention Registration',
          additionalInfo: 'Accommodation: Standard, Guests: 1'
        },
        qrCodeData: 'REG001-CONVENTION'
      });
    });

    it('should generate HTML preview for convention registration', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(mockRegistration);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=html');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe('<html>Mock PDF Content</html>');
    });
  });

  describe('Dinner Reservation PDFs', () => {
    it('should generate PDF for valid dinner reservation', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getDinnerByPaymentReference.mockResolvedValue(mockDinner);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123457&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(mockPDFGenerator.generatePDFHTML).toHaveBeenCalledWith({
        userDetails: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+2348123456790',
          registrationId: 'REG002'
        },
        operationDetails: {
          type: 'dinner',
          amount: 7500,
          paymentReference: 'PAY123457',
          date: mockDinner.createdAt,
          status: 'confirmed',
          description: 'Dinner Reservation',
          additionalInfo: 'Guests: 2, Date: March 16, 2025, Dietary Requirements: Vegetarian'
        },
        qrCodeData: 'REG002-DINNER'
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing payment reference', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Payment reference is required');
    });

    it('should return 404 for invalid payment reference', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getDinnerByPaymentReference.mockResolvedValue(null);
      mockDatabase.getAccommodationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getBrochureByPaymentReference.mockResolvedValue(null);
      mockDatabase.getGoodwillByPaymentReference.mockResolvedValue(null);
      mockDatabase.getDonationByPaymentReference.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=INVALID&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Payment record not found');
    });

    it('should return 400 for unconfirmed payment', async () => {
      const unconfirmedRegistration = {
        ...mockRegistration,
        paymentStatus: 'pending'
      };
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(unconfirmedRegistration);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Payment not confirmed');
    });

    it('should handle PDF generation errors', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(mockRegistration);
      mockPDFGenerator.generatePDFHTML.mockRejectedValue(new Error('PDF generation failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to generate PDF');
    });

    it('should handle database errors', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Caching Headers', () => {
    it('should set appropriate cache headers for PDF downloads', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(mockRegistration);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=pdf');
      const response = await GET(request);

      expect(response.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600');
      expect(response.headers.get('etag')).toBeTruthy();
    });

    it('should set no-cache headers for HTML previews', async () => {
      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(mockRegistration);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123456&format=html');
      const response = await GET(request);

      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Service Type Detection', () => {
    it('should handle accommodation bookings', async () => {
      const mockAccommodation = {
        _id: 'acc123',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '+2348123456791',
        registrationId: 'REG003',
        paymentReference: 'PAY123458',
        amount: 20000,
        paymentStatus: 'confirmed',
        roomType: 'Premium',
        guestCount: 2,
        checkInDate: '2025-03-15',
        checkOutDate: '2025-03-17',
        confirmationCode: 'ACC123',
        createdAt: new Date('2025-01-17')
      };

      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getDinnerByPaymentReference.mockResolvedValue(null);
      mockDatabase.getAccommodationByPaymentReference.mockResolvedValue(mockAccommodation);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123458&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPDFGenerator.generatePDFHTML).toHaveBeenCalledWith(
        expect.objectContaining({
          operationDetails: expect.objectContaining({
            type: 'accommodation',
            description: 'Accommodation Booking'
          })
        })
      );
    });

    it('should handle brochure orders', async () => {
      const mockBrochure = {
        _id: 'brochure123',
        name: 'Alice Brown',
        email: 'alice@example.com',
        phone: '+2348123456792',
        registrationId: 'REG004',
        paymentReference: 'PAY123459',
        amount: 2500,
        paymentStatus: 'confirmed',
        quantity: 3,
        deliveryAddress: '456 Oak St, Abuja',
        orderType: 'Physical',
        createdAt: new Date('2025-01-18')
      };

      mockDatabase.getRegistrationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getDinnerByPaymentReference.mockResolvedValue(null);
      mockDatabase.getAccommodationByPaymentReference.mockResolvedValue(null);
      mockDatabase.getBrochureByPaymentReference.mockResolvedValue(mockBrochure);

      const request = new NextRequest('http://localhost:3000/api/v1/pdf/download?ref=PAY123459&format=pdf');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPDFGenerator.generatePDFHTML).toHaveBeenCalledWith(
        expect.objectContaining({
          operationDetails: expect.objectContaining({
            type: 'brochure',
            description: 'Brochure Order'
          })
        })
      );
    });
  });
});