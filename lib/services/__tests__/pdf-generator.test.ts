import { PDFGeneratorService, PDFData } from '../pdf-generator.service';
import { PDFCacheService } from '../pdf-cache.service';

// Mock QRCode module
jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

// Mock cache service
jest.mock('../pdf-cache.service', () => ({
  PDFCacheService: {
    generateCacheKey: jest.fn(),
    getCachedHTML: jest.fn(),
    cacheHTML: jest.fn(),
    getCachedPDF: jest.fn(),
    cachePDF: jest.fn(),
    getCachedQRCode: jest.fn(),
    cacheQRCode: jest.fn(),
    invalidatePaymentReference: jest.fn(),
    getCacheStats: jest.fn()
  }
}));

describe('PDFGeneratorService', () => {
  const mockQRCode = require('qrcode');
  const mockCacheService = PDFCacheService as jest.Mocked<typeof PDFCacheService>;

  const basePDFData: PDFData = {
    userDetails: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      registrationId: 'REG123'
    },
    operationDetails: {
      type: 'convention',
      amount: 50000,
      paymentReference: 'CONV_123456',
      date: new Date('2025-01-15T10:00:00Z'),
      status: 'confirmed',
      description: 'GOSA 2025 Convention Registration',
      additionalInfo: 'Quantity: 1 | Registration ID: REG123'
    },
    qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode');
    mockCacheService.generateCacheKey.mockReturnValue('mock-cache-key');
    mockCacheService.getCachedHTML.mockResolvedValue(null);
    mockCacheService.getCachedPDF.mockResolvedValue(null);
    mockCacheService.getCachedQRCode.mockResolvedValue(null);
  });

  describe('generatePDFHTML', () => {
    it('should generate HTML for convention registration', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('GOSA 2025 Convention');
      expect(html).toContain('For Light and Truth');
      expect(html).toContain('John Doe');
      expect(html).toContain('john.doe@example.com');
      expect(html).toContain('+1234567890');
      expect(html).toContain('Convention Registration');
      expect(html).toContain('₦50,000');
      expect(html).toContain('CONV_123456');
      expect(html).toContain('data:image/png;base64,mockqrcode');
    });

    it('should use cached HTML when available', async () => {
      const cachedHTML = '<html>Cached content</html>';
      mockCacheService.getCachedHTML.mockResolvedValueOnce(cachedHTML);

      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toBe(cachedHTML);
      expect(mockCacheService.getCachedHTML).toHaveBeenCalledWith('mock-cache-key');
      expect(mockQRCode.toDataURL).not.toHaveBeenCalled();
    });

    it('should cache generated HTML', async () => {
      await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(mockCacheService.cacheHTML).toHaveBeenCalledWith(
        'mock-cache-key',
        expect.stringContaining('GOSA 2025 Convention')
      );
    });

    it('should use cached QR code when available', async () => {
      const cachedQR = 'data:image/png;base64,cachedqrcode';
      mockCacheService.getCachedQRCode.mockResolvedValueOnce(cachedQR);

      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain(cachedQR);
      expect(mockQRCode.toDataURL).not.toHaveBeenCalled();
      expect(mockCacheService.cacheQRCode).not.toHaveBeenCalled();
    });

    it('should generate and cache QR code when not cached', async () => {
      await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        basePDFData.qrCodeData,
        expect.objectContaining({
          width: 200,
          margin: 2,
          color: {
            dark: '#16A34A',
            light: '#FFFFFF'
          }
        })
      );
      expect(mockCacheService.cacheQRCode).toHaveBeenCalledWith(
        basePDFData.qrCodeData,
        'data:image/png;base64,mockqrcode'
      );
    });

    it('should handle QR code generation errors', async () => {
      mockQRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

      await expect(PDFGeneratorService.generatePDFHTML(basePDFData)).rejects.toThrow(
        'Failed to generate PDF content'
      );
    });

    it('should generate different content for different service types', async () => {
      const dinnerData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'dinner',
          description: 'GOSA 2025 Convention Gala Dinner',
          additionalInfo: 'Guests: 2 | Guest Names: Jane Doe, Bob Smith'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(dinnerData);

      expect(html).toContain('Dinner Reservation');
      expect(html).toContain('December 28, 2025 at 7:00 PM');
      expect(html).toContain('Grand Ballroom');
      expect(html).toContain('Formal/Black Tie');
    });
  });

  describe('generatePDFBuffer', () => {
    it('should generate PDF buffer', async () => {
      const buffer = await PDFGeneratorService.generatePDFBuffer(basePDFData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should use cached PDF when available', async () => {
      const cachedBuffer = Buffer.from('Cached PDF content');
      mockCacheService.getCachedPDF.mockResolvedValueOnce(cachedBuffer);

      const buffer = await PDFGeneratorService.generatePDFBuffer(basePDFData);

      expect(buffer).toBe(cachedBuffer);
      expect(mockCacheService.getCachedPDF).toHaveBeenCalledWith('pdf:mock-cache-key');
    });

    it('should cache generated PDF buffer', async () => {
      await PDFGeneratorService.generatePDFBuffer(basePDFData);

      expect(mockCacheService.cachePDF).toHaveBeenCalledWith(
        'pdf:mock-cache-key',
        expect.any(Buffer)
      );
    });

    it('should handle PDF generation errors', async () => {
      mockQRCode.toDataURL.mockRejectedValueOnce(new Error('Generation failed'));

      await expect(PDFGeneratorService.generatePDFBuffer(basePDFData)).rejects.toThrow(
        'Failed to generate PDF buffer'
      );
    });
  });

  describe('Service-specific content formatting', () => {
    it('should format convention content with accommodation details', async () => {
      const conventionData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          additionalInfo: 'Quantity: 2 | Premium accommodation | Additional Persons: 1'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(conventionData);

      expect(html).toContain('Total Attendees');
      expect(html).toContain('2 person(s)');
      expect(html).toContain('Premium Room');
      expect(html).toContain('Additional Attendees');
      expect(html).toContain('Convention Schedule Highlights');
    });

    it('should format dinner content with guest information', async () => {
      const dinnerData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'dinner',
          additionalInfo: 'Guests: 3 | Guest Names: Jane Doe, Bob Smith, Alice Johnson | Special Requests: Vegetarian meals'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(dinnerData);

      expect(html).toContain('Total Guests');
      expect(html).toContain('3 person(s)');
      expect(html).toContain('Guest Information');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('Bob Smith');
      expect(html).toContain('Alice Johnson');
      expect(html).toContain('Evening Program');
      expect(html).toContain('Dinner Menu');
      expect(html).toContain('Special Requests');
      expect(html).toContain('Vegetarian meals');
    });

    it('should format accommodation content with room details', async () => {
      const accommodationData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'accommodation',
          additionalInfo: 'Type: Luxury | Guests: 2 | Special Requests: Late checkout'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(accommodationData);

      expect(html).toContain('Luxury Room');
      expect(html).toContain('2 person(s)');
      expect(html).toContain('Confirmation Code');
      expect(html).toContain('Room Features & Amenities');
      expect(html).toContain('Spacious suite');
      expect(html).toContain('King-size bed');
      expect(html).toContain('Marble bathroom');
      expect(html).toContain('Special Requests');
      expect(html).toContain('Late checkout');
    });

    it('should format brochure content with delivery information', async () => {
      const brochureData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'brochure',
          additionalInfo: 'Type: Physical | Quantity: 3 | Recipients: John Doe, Jane Smith, Bob Johnson'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(brochureData);

      expect(html).toContain('Physical');
      expect(html).toContain('3 copies');
      expect(html).toContain('Pickup');
      expect(html).toContain('Recipient Information');
      expect(html).toContain('John Doe');
      expect(html).toContain('Jane Smith');
      expect(html).toContain('Bob Johnson');
      expect(html).toContain('Brochure Contents (120+ pages)');
      expect(html).toContain('High-quality full-color printing');
    });

    it('should format goodwill content with message and donation details', async () => {
      const goodwillData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'goodwill',
          additionalInfo: 'Message: "Wishing everyone a successful convention!" | Attribution: John Doe | Anonymous: No'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(goodwillData);

      expect(html).toContain('Goodwill Message & Donation');
      expect(html).toContain('John Doe');
      expect(html).toContain('Your Message');
      expect(html).toContain('Wishing everyone a successful convention!');
      expect(html).toContain('Impact of Your Contribution');
      expect(html).toContain('Thank You');
    });

    it('should format donation content with tax information', async () => {
      const donationData: PDFData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'donation',
          additionalInfo: 'Donor: John Doe | On Behalf Of: Doe Family Foundation'
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(donationData);

      expect(html).toContain('Official Donation Receipt');
      expect(html).toContain('Receipt Number');
      expect(html).toContain('Tax Year');
      expect(html).toContain('Named Donor');
      expect(html).toContain('Donation Made On Behalf Of');
      expect(html).toContain('Doe Family Foundation');
      expect(html).toContain('How Your Donation Helps');
      expect(html).toContain('Educational Initiatives (40%)');
      expect(html).toContain('Tax Information');
      expect(html).toContain('501(c)(3) equivalent');
    });
  });

  describe('Utility methods', () => {
    it('should generate appropriate filenames', () => {
      const userDetails = {
        name: 'John O\'Doe-Smith Jr.',
        email: 'john@example.com',
        phone: '+1234567890'
      };

      const filename = PDFGeneratorService.generateFilename(userDetails, 'convention');

      expect(filename).toMatch(/GOSA_2025_convention_John_O_Doe_Smith_Jr__\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should create PDF data structure correctly', () => {
      const userDetails = basePDFData.userDetails;
      const operationDetails = basePDFData.operationDetails;
      const qrCodeData = basePDFData.qrCodeData;

      const pdfData = PDFGeneratorService.createPDFData(userDetails, operationDetails, qrCodeData);

      expect(pdfData.userDetails).toEqual(userDetails);
      expect(pdfData.operationDetails).toEqual(operationDetails);
      expect(pdfData.qrCodeData).toBe(qrCodeData);
    });

    it('should clear cache for payment reference', async () => {
      await PDFGeneratorService.clearCache('CONV_123456');

      expect(mockCacheService.invalidatePaymentReference).toHaveBeenCalledWith('CONV_123456');
    });

    it('should get cache statistics', () => {
      const mockStats = {
        totalEntries: 10,
        totalSize: 1024000,
        hitRate: 0.85,
        missRate: 0.15,
        totalHits: 85,
        totalMisses: 15,
        averageAccessTime: 50
      };
      mockCacheService.getCacheStats.mockReturnValue(mockStats);

      const stats = PDFGeneratorService.getCacheStats();

      expect(stats).toEqual(mockStats);
      expect(mockCacheService.getCacheStats).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle missing user details gracefully', async () => {
      const invalidData = {
        ...basePDFData,
        userDetails: {
          name: '',
          email: '',
          phone: '',
          registrationId: ''
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(invalidData);

      expect(html).toContain('GOSA 2025 Convention');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
    });

    it('should handle missing additional info gracefully', async () => {
      const dataWithoutAdditionalInfo = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          additionalInfo: undefined
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(dataWithoutAdditionalInfo);

      expect(html).toContain('GOSA 2025 Convention');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
    });

    it('should handle invalid operation type gracefully', async () => {
      const invalidTypeData = {
        ...basePDFData,
        operationDetails: {
          ...basePDFData.operationDetails,
          type: 'invalid' as any
        }
      };

      const html = await PDFGeneratorService.generatePDFHTML(invalidTypeData);

      expect(html).toContain('GOSA 2025 Convention');
      expect(html).toContain('Invalid'); // Should capitalize the type
    });

    it('should handle cache service errors gracefully', async () => {
      mockCacheService.getCachedHTML.mockRejectedValueOnce(new Error('Cache error'));
      mockCacheService.cacheHTML.mockRejectedValueOnce(new Error('Cache error'));

      // Should still generate HTML despite cache errors
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('GOSA 2025 Convention');
    });
  });

  describe('Template styling and structure', () => {
    it('should include proper CSS styling', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
      expect(html).toContain('#16A34A'); // Primary color
      expect(html).toContain('#F59E0B'); // Secondary color
      expect(html).toContain('linear-gradient');
      expect(html).toContain('border-radius');
    });

    it('should have proper HTML structure', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<div class="container">');
      expect(html).toContain('<div class="header">');
      expect(html).toContain('<div class="content">');
      expect(html).toContain('<div class="footer">');
    });

    it('should include responsive design elements', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('@media print');
      expect(html).toContain('viewport');
      expect(html).toContain('grid-template-columns');
      expect(html).toContain('flex');
    });

    it('should include accessibility features', async () => {
      const html = await PDFGeneratorService.generatePDFHTML(basePDFData);

      expect(html).toContain('alt="QR Code"');
      expect(html).toContain('lang="en"');
      // Should have proper heading hierarchy
      expect(html).toContain('<h1');
      expect(html).toContain('<h2');
    });
  });
});