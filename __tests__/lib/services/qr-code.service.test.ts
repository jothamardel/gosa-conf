import { QRCodeService } from '@/lib/services/qr-code.service';
import QRCode from 'qrcode';

// Mock dependencies
jest.mock('qrcode');

const mockQRCode = QRCode as jest.Mocked<typeof QRCode>;

describe('QRCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateServiceQRCode', () => {
    it('should generate QR code for dinner service', async () => {
      const mockQRCodeString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const serviceData = {
        id: 'dinner123',
        guestName: 'John Doe',
        numberOfGuests: 2
      };

      const result = await QRCodeService.generateServiceQRCode('dinner', serviceData);

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('dinner'),
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
      );

      expect(result).toBe(mockQRCodeString);
    });

    it('should generate QR code for accommodation service', async () => {
      const mockQRCodeString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const serviceData = {
        id: 'accom123',
        accommodationType: 'premium',
        confirmationCode: 'CONF123456'
      };

      const result = await QRCodeService.generateServiceQRCode('accommodation', serviceData);

      expect(mockQRCode.toDataURL).toHaveBeenCalled();
      expect(result).toBe(mockQRCodeString);
    });

    it('should generate QR code for brochure service', async () => {
      const mockQRCodeString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const serviceData = {
        id: 'broch123',
        quantity: 5,
        brochureType: 'physical'
      };

      const result = await QRCodeService.generateServiceQRCode('brochure', serviceData);

      expect(mockQRCode.toDataURL).toHaveBeenCalled();
      expect(result).toBe(mockQRCodeString);
    });

    it('should throw error for invalid service type', async () => {
      const serviceData = { id: 'test123' };

      await expect(QRCodeService.generateServiceQRCode('invalid' as any, serviceData))
        .rejects.toThrow('Invalid service type: invalid');
    });

    it('should handle QR code generation errors', async () => {
      mockQRCode.toDataURL = jest.fn().mockRejectedValue(new Error('QR generation failed'));

      const serviceData = { id: 'dinner123' };

      await expect(QRCodeService.generateServiceQRCode('dinner', serviceData))
        .rejects.toThrow('Failed to generate QR code: QR generation failed');
    });
  });

  describe('generateServiceQRCodes', () => {
    it('should generate multiple QR codes for dinner guests', async () => {
      const mockQRCodeString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const serviceData = {
        id: 'dinner123',
        numberOfGuests: 2,
        guestDetails: [
          { name: 'John Doe' },
          { name: 'Jane Doe' }
        ]
      };

      const result = await QRCodeService.generateServiceQRCodes('dinner', serviceData);

      expect(mockQRCode.toDataURL).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        guestName: 'John Doe',
        qrCode: mockQRCodeString,
        used: false
      });
      expect(result[1]).toEqual({
        guestName: 'Jane Doe',
        qrCode: mockQRCodeString,
        used: false
      });
    });

    it('should generate single QR code for non-dinner services', async () => {
      const mockQRCodeString = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const serviceData = {
        id: 'accom123',
        accommodationType: 'premium'
      };

      const result = await QRCodeService.generateServiceQRCodes('accommodation', serviceData);

      expect(mockQRCode.toDataURL).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        qrCode: mockQRCodeString,
        used: false
      });
    });
  });

  describe('validateQRCode', () => {
    it('should validate correct QR code format', () => {
      const validQRData = JSON.stringify({
        type: 'dinner',
        id: 'dinner123',
        userId: '507f1f77bcf86cd799439011',
        guestName: 'John Doe',
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        metadata: {}
      });

      const result = QRCodeService.validateQRCode(validQRData);

      expect(result.valid).toBe(true);
      expect(result.data.type).toBe('dinner');
      expect(result.data.id).toBe('dinner123');
    });

    it('should reject expired QR code', () => {
      const expiredQRData = JSON.stringify({
        type: 'dinner',
        id: 'dinner123',
        userId: '507f1f77bcf86cd799439011',
        validUntil: new Date(Date.now() - 86400000).toISOString(),
        metadata: {}
      });

      const result = QRCodeService.validateQRCode(expiredQRData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('QR code has expired');
    });

    it('should reject invalid JSON format', () => {
      const invalidQRData = 'invalid-json-data';

      const result = QRCodeService.validateQRCode(invalidQRData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid QR code format');
    });

    it('should reject QR code with missing required fields', () => {
      const incompleteQRData = JSON.stringify({
        type: 'dinner',
        // missing id and userId
        validUntil: new Date(Date.now() + 86400000).toISOString()
      });

      const result = QRCodeService.validateQRCode(incompleteQRData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing required QR code fields');
    });
  });

  describe('regenerateQRCode', () => {
    it('should regenerate QR code with new timestamp', async () => {
      const mockQRCodeString = 'data:image/png;base64,NEW_QR_CODE...';
      mockQRCode.toDataURL = jest.fn().mockResolvedValue(mockQRCodeString);

      const oldQRData = JSON.stringify({
        type: 'dinner',
        id: 'dinner123',
        userId: '507f1f77bcf86cd799439011',
        guestName: 'John Doe',
        validUntil: new Date(Date.now() - 86400000).toISOString(),
        metadata: {}
      });

      const result = await QRCodeService.regenerateQRCode(oldQRData);

      expect(mockQRCode.toDataURL).toHaveBeenCalled();
      expect(result).toBe(mockQRCodeString);

      // Verify the new QR code has updated timestamp
      const callArgs = mockQRCode.toDataURL.mock.calls[0][0];
      const newQRData = JSON.parse(callArgs);
      expect(new Date(newQRData.validUntil).getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle regeneration errors', async () => {
      mockQRCode.toDataURL = jest.fn().mockRejectedValue(new Error('Regeneration failed'));

      const oldQRData = JSON.stringify({
        type: 'dinner',
        id: 'dinner123',
        userId: '507f1f77bcf86cd799439011'
      });

      await expect(QRCodeService.regenerateQRCode(oldQRData))
        .rejects.toThrow('Failed to regenerate QR code: Regeneration failed');
    });
  });

  describe('createQRData', () => {
    it('should create correct QR data structure', () => {
      const serviceData = {
        id: 'dinner123',
        guestName: 'John Doe'
      };

      const result = QRCodeService.createQRData('dinner', serviceData);

      expect(result).toEqual({
        type: 'dinner',
        id: 'dinner123',
        userId: serviceData.userId,
        guestName: 'John Doe',
        validUntil: expect.any(Date),
        metadata: serviceData
      });

      // Check that validUntil is in the future
      expect(result.validUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set appropriate expiry for different service types', () => {
      const serviceData = { id: 'test123' };

      const dinnerQR = QRCodeService.createQRData('dinner', serviceData);
      const accomQR = QRCodeService.createQRData('accommodation', serviceData);

      // Both should have future expiry dates
      expect(dinnerQR.validUntil.getTime()).toBeGreaterThan(Date.now());
      expect(accomQR.validUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });
});