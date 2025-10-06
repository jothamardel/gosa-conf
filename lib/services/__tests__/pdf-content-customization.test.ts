import { PDFGeneratorService } from '../pdf-generator.service';

// Mock QRCode module
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
}));

describe('PDF Content Customization', () => {
  const baseUserDetails = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    registrationId: 'REG123'
  };

  const baseDate = new Date('2025-01-15T10:00:00Z');

  describe('Convention Registration PDF', () => {
    it('should generate convention PDF with basic information', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'convention' as const,
          amount: 50000,
          paymentReference: 'CONV_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Registration',
          additionalInfo: 'Quantity: 1 | Registration ID: REG123'
        },
        qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Convention Registration Information');
      expect(html).toContain('Full Convention Access');
      expect(html).toContain('December 26-29, 2025');
      expect(html).toContain('GOSA Convention Center');
      expect(html).toContain('8:00 AM - 10:00 AM Daily');
      expect(html).toContain('Convention Schedule Highlights');
      expect(html).toContain('Welcome Ceremony');
      expect(html).toContain('Gala Dinner');
    });

    it('should include additional persons information', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'convention' as const,
          amount: 100000,
          paymentReference: 'CONV_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Registration',
          additionalInfo: 'Quantity: 2 | Additional Persons: 1 | Premium accommodation'
        },
        qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Total Attendees');
      expect(html).toContain('2 person(s)');
      expect(html).toContain('Premium Room');
      expect(html).toContain('Additional Attendees');
    });
  });

  describe('Dinner Reservation PDF', () => {
    it('should generate dinner PDF with guest information', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'dinner' as const,
          amount: 150000,
          paymentReference: 'DINNER_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Gala Dinner',
          additionalInfo: 'Guests: 2 | Guest Names: Jane Doe, Bob Smith | Special Requests: Vegetarian meal'
        },
        qrCodeData: JSON.stringify({ type: 'dinner', id: 'DINNER123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Dinner Reservation Details');
      expect(html).toContain('GOSA 2025 Convention Gala Dinner');
      expect(html).toContain('December 28, 2025 at 7:00 PM');
      expect(html).toContain('Grand Ballroom');
      expect(html).toContain('Formal/Black Tie');
      expect(html).toContain('Total Guests');
      expect(html).toContain('2 person(s)');
      expect(html).toContain('Guest Information');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('Bob Smith');
      expect(html).toContain('Evening Program');
      expect(html).toContain('Cocktail reception');
      expect(html).toContain('Dinner Menu');
      expect(html).toContain('Pan-seared scallops');
      expect(html).toContain('Special Requests');
      expect(html).toContain('Vegetarian meal');
    });
  });

  describe('Accommodation Booking PDF', () => {
    it('should generate accommodation PDF with room details', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'accommodation' as const,
          amount: 200000,
          paymentReference: 'ACCOM_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Accommodation',
          additionalInfo: 'Type: Premium | Guests: 2 | Special Requests: Late checkout'
        },
        qrCodeData: JSON.stringify({ type: 'accommodation', id: 'ACCOM123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Accommodation Booking Details');
      expect(html).toContain('GOSA Convention Hotel');
      expect(html).toContain('Premium Room');
      expect(html).toContain('December 25, 2025 (3:00 PM)');
      expect(html).toContain('December 30, 2025 (11:00 AM)');
      expect(html).toContain('2 person(s)');
      expect(html).toContain('Confirmation Code');
      expect(html).toContain('Room Features & Amenities');
      expect(html).toContain('Queen-size bed');
      expect(html).toContain('Continental breakfast');
      expect(html).toContain('Hotel Amenities Included');
      expect(html).toContain('Shuttle service');
      expect(html).toContain('Special Requests');
      expect(html).toContain('Late checkout');
      expect(html).toContain('Check-in Instructions');
    });

    it('should show luxury room features', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'accommodation' as const,
          amount: 350000,
          paymentReference: 'ACCOM_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Accommodation',
          additionalInfo: 'Type: Luxury | Guests: 2'
        },
        qrCodeData: JSON.stringify({ type: 'accommodation', id: 'ACCOM123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Luxury Room');
      expect(html).toContain('Spacious suite');
      expect(html).toContain('King-size bed');
      expect(html).toContain('Marble bathroom');
      expect(html).toContain('jacuzzi tub');
      expect(html).toContain('Private balcony');
      expect(html).toContain('Premium breakfast');
    });
  });

  describe('Brochure Order PDF', () => {
    it('should generate brochure PDF with digital delivery', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'brochure' as const,
          amount: 5000,
          paymentReference: 'BROCH_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Brochure',
          additionalInfo: 'Type: Digital | Quantity: 1'
        },
        qrCodeData: JSON.stringify({ type: 'brochure', id: 'BROCH123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Brochure Order Information');
      expect(html).toContain('GOSA 2025 Convention Brochure');
      expect(html).toContain('Digital');
      expect(html).toContain('1 copies');
      expect(html).toContain('Email');
      expect(html).toContain('Within 24 hours');
      expect(html).toContain('Brochure Contents (120+ pages)');
      expect(html).toContain('Section 1: Welcome');
      expect(html).toContain('Section 10: Contact information');
      expect(html).toContain('Additional Features');
      expect(html).toContain('Interactive links');
      expect(html).toContain('Digital Delivery');
    });

    it('should generate brochure PDF with physical pickup', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'brochure' as const,
          amount: 15000,
          paymentReference: 'BROCH_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Brochure',
          additionalInfo: 'Type: Physical | Quantity: 3 | Recipients: John Doe, Jane Smith, Bob Johnson'
        },
        qrCodeData: JSON.stringify({ type: 'brochure', id: 'BROCH123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Physical');
      expect(html).toContain('3 copies');
      expect(html).toContain('Pickup');
      expect(html).toContain('2-3 business days');
      expect(html).toContain('Recipient Information');
      expect(html).toContain('John Doe');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('Bob Johnson');
      expect(html).toContain('High-quality full-color printing');
      expect(html).toContain('Pickup Instructions');
    });
  });

  describe('Goodwill Message PDF', () => {
    it('should generate goodwill PDF with message content', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'goodwill' as const,
          amount: 25000,
          paymentReference: 'GOOD_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Goodwill Message',
          additionalInfo: 'Message: "Wishing everyone a successful convention!" | Attribution: John Doe | Anonymous: No'
        },
        qrCodeData: JSON.stringify({ type: 'goodwill', id: 'GOOD123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Goodwill Message & Donation');
      expect(html).toContain('Convention Goodwill Message');
      expect(html).toContain('₦25,000');
      expect(html).toContain('John Doe');
      expect(html).toContain('Your Message');
      expect(html).toContain('Wishing everyone a successful convention!');
      expect(html).toContain('Impact of Your Contribution');
      expect(html).toContain('Supports convention programming');
      expect(html).toContain('Provides scholarships');
      expect(html).toContain('Thank You');
      expect(html).toContain('memorable experience');
    });

    it('should handle anonymous goodwill messages', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'goodwill' as const,
          amount: 10000,
          paymentReference: 'GOOD_123456',
          date: baseDate,
          status: 'pending' as const,
          description: 'GOSA 2025 Convention Goodwill Message',
          additionalInfo: 'Message: "Best wishes for the convention" | Anonymous: Yes'
        },
        qrCodeData: JSON.stringify({ type: 'goodwill', id: 'GOOD123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Anonymous');
      expect(html).toContain('Best wishes for the convention');
      expect(html).toContain('PENDING');
    });
  });

  describe('Donation Receipt PDF', () => {
    it('should generate comprehensive donation receipt', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'donation' as const,
          amount: 50000,
          paymentReference: 'DONA_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Donation',
          additionalInfo: 'Donor: John Doe | On Behalf Of: Doe Family Foundation'
        },
        qrCodeData: JSON.stringify({ type: 'donation', id: 'DONA123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Official Donation Receipt');
      expect(html).toContain('General Convention Support');
      expect(html).toContain('₦50,000');
      expect(html).toContain('Receipt Number');
      expect(html).toContain('GOSA-');
      expect(html).toContain('Tax Year');
      expect(html).toContain('2025');
      expect(html).toContain('Named Donor');
      expect(html).toContain('Tax Deductible');
      expect(html).toContain('Donation Made On Behalf Of');
      expect(html).toContain('Doe Family Foundation');
      expect(html).toContain('How Your Donation Helps');
      expect(html).toContain('Educational Initiatives (40%)');
      expect(html).toContain('Community Outreach (30%)');
      expect(html).toContain('Convention & Events (20%)');
      expect(html).toContain('Organizational Operations (10%)');
      expect(html).toContain('Tax Information');
      expect(html).toContain('501(c)(3) equivalent');
      expect(html).toContain('Tax ID: XX-XXXXXXX');
      expect(html).toContain('Thank You & Official Acknowledgment');
      expect(html).toContain('gosasecretariat@gmail.com');
    });

    it('should handle anonymous donations', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'donation' as const,
          amount: 25000,
          paymentReference: 'DONA_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Donation',
          additionalInfo: 'Anonymous: Yes'
        },
        qrCodeData: JSON.stringify({ type: 'donation', id: 'DONA123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Anonymous');
      expect(html).not.toContain('Donation Made On Behalf Of');
    });
  });

  describe('PDF Generation Utilities', () => {
    it('should generate appropriate filenames for each service type', () => {
      const userDetails = { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' };

      const conventionFilename = PDFGeneratorService.generateFilename(userDetails, 'convention');
      const dinnerFilename = PDFGeneratorService.generateFilename(userDetails, 'dinner');
      const accommodationFilename = PDFGeneratorService.generateFilename(userDetails, 'accommodation');

      expect(conventionFilename).toMatch(/GOSA_2025_convention_John_Doe_\d{4}-\d{2}-\d{2}\.pdf/);
      expect(dinnerFilename).toMatch(/GOSA_2025_dinner_John_Doe_\d{4}-\d{2}-\d{2}\.pdf/);
      expect(accommodationFilename).toMatch(/GOSA_2025_accommodation_John_Doe_\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should sanitize names in filenames', () => {
      const userDetails = { name: 'John O\'Doe-Smith Jr.', email: 'john@example.com', phone: '+1234567890' };

      const filename = PDFGeneratorService.generateFilename(userDetails, 'convention');

      expect(filename).toMatch(/GOSA_2025_convention_John_O_Doe_Smith_Jr__\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should create PDF data structure correctly', () => {
      const userDetails = baseUserDetails;
      const operationDetails = {
        type: 'convention' as const,
        amount: 50000,
        paymentReference: 'TEST_123',
        date: baseDate,
        status: 'confirmed' as const,
        description: 'Test Registration'
      };
      const qrCodeData = 'test-qr-data';

      const pdfData = PDFGeneratorService.createPDFData(userDetails, operationDetails, qrCodeData);

      expect(pdfData.userDetails).toEqual(userDetails);
      expect(pdfData.operationDetails).toEqual(operationDetails);
      expect(pdfData.qrCodeData).toBe(qrCodeData);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing additional info gracefully', async () => {
      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'convention' as const,
          amount: 50000,
          paymentReference: 'CONV_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Registration'
          // No additionalInfo
        },
        qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
      };

      const html = await PDFGeneratorService.generatePDFHTML(pdfData);

      expect(html).toContain('Convention Registration Information');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
    });

    it('should handle QR code generation errors', async () => {
      const QRCode = require('qrcode');
      QRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

      const pdfData = {
        userDetails: baseUserDetails,
        operationDetails: {
          type: 'convention' as const,
          amount: 50000,
          paymentReference: 'CONV_123456',
          date: baseDate,
          status: 'confirmed' as const,
          description: 'GOSA 2025 Convention Registration'
        },
        qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
      };

      await expect(PDFGeneratorService.generatePDFHTML(pdfData)).rejects.toThrow('Failed to generate PDF content');
    });
  });
});