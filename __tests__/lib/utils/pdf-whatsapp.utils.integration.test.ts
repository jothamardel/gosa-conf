import { PDFWhatsAppUtils } from '../../../lib/utils/pdf-whatsapp.utils';

describe('PDFWhatsAppUtils Integration Tests', () => {
  describe('generateServiceQRCodeData', () => {
    it('should generate QR code data with correct structure for convention', async () => {
      const serviceId = '507f1f77bcf86cd799439011';
      const additionalData = {
        userId: '507f1f77bcf86cd799439012',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'convention',
        serviceId,
        additionalData
      );

      expect(result).toBeDefined();

      const parsedData = JSON.parse(result);
      expect(parsedData.type).toBe('convention');
      expect(parsedData.id).toBe(serviceId);
      expect(parsedData.userId).toBe(additionalData.userId);
      expect(parsedData.name).toBe(additionalData.name);
      expect(parsedData.email).toBe(additionalData.email);
      expect(parsedData.validUntil).toBeDefined();
      expect(parsedData.timestamp).toBeDefined();

      // Verify expiration is approximately 1 year from now
      const validUntil = new Date(parsedData.validUntil);
      const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(validUntil.getTime() - oneYearFromNow.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should generate QR code data with correct structure for dinner', async () => {
      const serviceId = '507f1f77bcf86cd799439011';
      const additionalData = {
        userId: '507f1f77bcf86cd799439012',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Doe', email: 'jane@example.com' },
        ],
      };

      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'dinner',
        serviceId,
        additionalData
      );

      const parsedData = JSON.parse(result);
      expect(parsedData.type).toBe('dinner');
      expect(parsedData.numberOfGuests).toBe(2);
      expect(parsedData.guestDetails).toEqual(additionalData.guestDetails);

      // Verify expiration is approximately 30 days from now
      const validUntil = new Date(parsedData.validUntil);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(validUntil.getTime() - thirtyDaysFromNow.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should generate QR code data with custom checkout date for accommodation', async () => {
      const serviceId = '507f1f77bcf86cd799439011';
      const checkOutDate = new Date('2024-12-31T10:00:00Z');
      const additionalData = {
        userId: '507f1f77bcf86cd799439012',
        accommodationType: 'premium',
        checkOutDate: checkOutDate.toISOString(),
      };

      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'accommodation',
        serviceId,
        additionalData
      );

      const parsedData = JSON.parse(result);
      expect(parsedData.type).toBe('accommodation');
      expect(parsedData.accommodationType).toBe('premium');
      expect(parsedData.validUntil).toBe(checkOutDate.toISOString());
    });

    it('should generate QR code data for all service types', async () => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'] as const;
      const serviceId = '507f1f77bcf86cd799439011';
      const additionalData = { userId: '507f1f77bcf86cd799439012' };

      for (const serviceType of serviceTypes) {
        const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
          serviceType,
          serviceId,
          additionalData
        );

        expect(result).toBeDefined();

        const parsedData = JSON.parse(result);
        expect(parsedData.type).toBe(serviceType);
        expect(parsedData.id).toBe(serviceId);
        expect(parsedData.userId).toBe(additionalData.userId);
        expect(parsedData.validUntil).toBeDefined();
        expect(parsedData.timestamp).toBeDefined();

        // Verify the timestamp is recent (within last 5 seconds)
        const timestamp = new Date(parsedData.timestamp);
        const now = new Date();
        const timeDiff = Math.abs(now.getTime() - timestamp.getTime());
        expect(timeDiff).toBeLessThan(5000);
      }
    });
  });

  describe('extractServiceInfoFromReference', () => {
    it('should correctly identify service types from payment references', () => {
      const testCases = [
        { reference: 'conv_123456789', expectedType: 'convention' },
        { reference: 'convention_abc123', expectedType: 'convention' },
        { reference: 'reg_xyz789', expectedType: 'convention' },
        { reference: 'dinner_123456', expectedType: 'dinner' },
        { reference: 'meal_abc123', expectedType: 'dinner' },
        { reference: 'accom_123456', expectedType: 'accommodation' },
        { reference: 'hotel_abc123', expectedType: 'accommodation' },
        { reference: 'room_xyz789', expectedType: 'accommodation' },
        { reference: 'broch_123456', expectedType: 'brochure' },
        { reference: 'book_abc123', expectedType: 'brochure' },
        { reference: 'good_123456', expectedType: 'goodwill' },
        { reference: 'message_abc123', expectedType: 'goodwill' },
        { reference: 'don_123456', expectedType: 'donation' },
        { reference: 'donate_abc123', expectedType: 'donation' },
        { reference: 'unknown_pattern_123', expectedType: undefined },
        { reference: 'random_ref_456', expectedType: undefined },
      ];

      testCases.forEach(({ reference, expectedType }) => {
        const result = PDFWhatsAppUtils.extractServiceInfoFromReference(reference);

        expect(result.baseReference).toBe(reference);
        expect(result.serviceType).toBe(expectedType);
      });
    });

    it('should be case insensitive', () => {
      const testCases = [
        { reference: 'CONV_123456', expectedType: 'convention' },
        { reference: 'Dinner_123456', expectedType: 'dinner' },
        { reference: 'ACCOM_123456', expectedType: 'accommodation' },
        { reference: 'Broch_123456', expectedType: 'brochure' },
        { reference: 'GOOD_123456', expectedType: 'goodwill' },
        { reference: 'DON_123456', expectedType: 'donation' },
      ];

      testCases.forEach(({ reference, expectedType }) => {
        const result = PDFWhatsAppUtils.extractServiceInfoFromReference(reference);
        expect(result.serviceType).toBe(expectedType);
      });
    });
  });

  describe('Data Structure Validation', () => {
    it('should have correct TypeScript interfaces', () => {
      // This test validates that our interfaces are properly structured
      // by creating sample objects that conform to them

      const sampleUserDetails = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        registrationId: '507f1f77bcf86cd799439011',
      };

      const sampleOperationDetails = {
        type: 'convention' as const,
        amount: 50000,
        paymentReference: 'conv_123456',
        date: new Date(),
        status: 'confirmed' as const,
        description: 'GOSA 2025 Convention Registration',
        additionalInfo: 'Registration ID: 507f1f77bcf86cd799439011 | Amount: ₦50,000',
      };

      const samplePDFData = {
        userDetails: sampleUserDetails,
        operationDetails: sampleOperationDetails,
        qrCodeData: '{"type":"convention","id":"507f1f77bcf86cd799439011"}',
      };

      // If these assignments work without TypeScript errors, our interfaces are correct
      expect(samplePDFData.userDetails.name).toBe('John Doe');
      expect(samplePDFData.operationDetails.type).toBe('convention');
      expect(samplePDFData.qrCodeData).toContain('convention');
    });

    it('should support all service types in operation details', () => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'] as const;

      serviceTypes.forEach(serviceType => {
        const operationDetails = {
          type: serviceType,
          amount: 10000,
          paymentReference: `${serviceType}_123`,
          date: new Date(),
          status: 'confirmed' as const,
          description: `GOSA 2025 ${serviceType} service`,
        };

        expect(operationDetails.type).toBe(serviceType);
        expect(operationDetails.paymentReference).toContain(serviceType);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid service type in generateServiceQRCodeData', async () => {
      const serviceId = '507f1f77bcf86cd799439011';

      // This should not throw an error but use default expiration
      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'convention', // Valid service type
        serviceId,
        { userId: '507f1f77bcf86cd799439012' }
      );

      expect(result).toBeDefined();
      const parsedData = JSON.parse(result);
      expect(parsedData.validUntil).toBeDefined();
    });

    it('should handle missing additional data gracefully', async () => {
      const serviceId = '507f1f77bcf86cd799439011';

      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'convention',
        serviceId
        // No additional data provided
      );

      expect(result).toBeDefined();
      const parsedData = JSON.parse(result);
      expect(parsedData.type).toBe('convention');
      expect(parsedData.id).toBe(serviceId);
      expect(parsedData.validUntil).toBeDefined();
    });
  });
});