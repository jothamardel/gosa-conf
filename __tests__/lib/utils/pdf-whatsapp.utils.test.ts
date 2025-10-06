import { PDFWhatsAppUtils, PDFData, PDFUserDetails, PDFOperationDetails } from '../../../lib/utils/pdf-whatsapp.utils';
import { QRCodeService } from '../../../lib/services/qr-code.service';
import { Types } from 'mongoose';

// Mock the database connection and models
jest.mock('../../../lib/mongodb');
jest.mock('../../../lib/schema', () => ({
  User: {
    findById: jest.fn(),
  },
  ConventionRegistration: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  DinnerReservation: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  Accommodation: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  ConventionBrochure: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  GoodwillMessage: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  Donation: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../../../lib/services/qr-code.service');

describe('PDFWhatsAppUtils', () => {
  const mockUserId = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();
  const mockPaymentReference = 'TEST_REF_123';

  const mockUser = {
    _id: mockUserId,
    fullName: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '+1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (QRCodeService.generateUniqueQRData as jest.Mock).mockReturnValue('mock-qr-data');
  });

  describe('getConventionPDFData', () => {
    it('should retrieve and format convention PDF data correctly', async () => {
      const mockRegistration = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: mockPaymentReference,
        amount: 50000,
        quantity: 1,
        confirm: true,
        createdAt: new Date('2025-01-01'),
        persons: [],
      };

      const { ConventionRegistration } = require('../../../lib/schema');
      ConventionRegistration.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRegistration),
        }),
      });

      const result = await PDFWhatsAppUtils.getConventionPDFData(mockPaymentReference);

      expect(result).toBeDefined();
      expect(result?.userDetails.name).toBe('John Doe');
      expect(result?.userDetails.email).toBe('john@example.com');
      expect(result?.operationDetails.type).toBe('convention');
      expect(result?.operationDetails.amount).toBe(50000);
      expect(result?.operationDetails.status).toBe('confirmed');
      expect(result?.qrCodeData).toBe('mock-qr-data');
    });

    it('should return null if registration not found', async () => {
      const { ConventionRegistration } = require('../../../lib/schema');
      ConventionRegistration.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await PDFWhatsAppUtils.getConventionPDFData('INVALID_REF');

      expect(result).toBeNull();
    });
  });

  describe('getDinnerPDFData', () => {
    it('should retrieve and format dinner PDF data correctly', async () => {
      const mockReservation = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: mockPaymentReference,
        numberOfGuests: 2,
        totalAmount: 150000,
        confirmed: true,
        createdAt: new Date('2025-01-01'),
        guestDetails: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Doe', email: 'jane@example.com' },
        ],
        specialRequests: 'Vegetarian meal',
      };

      const { DinnerReservation } = require('../../../lib/schema');
      DinnerReservation.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockReservation),
        }),
      });

      const result = await PDFWhatsAppUtils.getDinnerPDFData(mockPaymentReference);

      expect(result).toBeDefined();
      expect(result?.operationDetails.type).toBe('dinner');
      expect(result?.operationDetails.amount).toBe(150000);
      expect(result?.operationDetails.additionalInfo).toContain('Guests: 2');
      expect(result?.operationDetails.additionalInfo).toContain('John Doe, Jane Doe');
      expect(result?.operationDetails.additionalInfo).toContain('Vegetarian meal');
    });
  });

  describe('getAccommodationPDFData', () => {
    it('should retrieve and format accommodation PDF data correctly', async () => {
      const checkInDate = new Date('2025-06-01');
      const checkOutDate = new Date('2025-06-03');

      const mockAccommodation = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: mockPaymentReference,
        accommodationType: 'premium',
        checkInDate,
        checkOutDate,
        numberOfGuests: 2,
        totalAmount: 200000,
        confirmed: true,
        confirmationCode: 'ACC-123456',
        createdAt: new Date('2025-01-01'),
        specialRequests: 'Late check-in',
      };

      const { Accommodation } = require('../../../lib/schema');
      Accommodation.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAccommodation),
        }),
      });

      const result = await PDFWhatsAppUtils.getAccommodationPDFData(mockPaymentReference);

      expect(result).toBeDefined();
      expect(result?.operationDetails.type).toBe('accommodation');
      expect(result?.operationDetails.amount).toBe(200000);
      expect(result?.operationDetails.additionalInfo).toContain('Premium');
      expect(result?.operationDetails.additionalInfo).toContain('ACC-123456');
      expect(result?.qrCodeData).toContain('accommodation');
      expect(result?.qrCodeData).toContain('ACC-123456');
    });
  });

  describe('getPDFDataByReference', () => {
    it('should return data from the first matching service', async () => {
      const mockRegistration = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: mockPaymentReference,
        amount: 50000,
        quantity: 1,
        confirm: true,
        createdAt: new Date('2025-01-01'),
        persons: [],
      };

      const { ConventionRegistration, DinnerReservation } = require('../../../lib/schema');

      // Mock convention registration found
      ConventionRegistration.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRegistration),
        }),
      });

      // Mock dinner reservation not found
      DinnerReservation.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await PDFWhatsAppUtils.getPDFDataByReference(mockPaymentReference);

      expect(result).toBeDefined();
      expect(result?.operationDetails.type).toBe('convention');
    });

    it('should use specific service type when provided', async () => {
      const mockReservation = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: mockPaymentReference,
        numberOfGuests: 1,
        totalAmount: 75000,
        confirmed: true,
        createdAt: new Date('2025-01-01'),
        guestDetails: [{ name: 'John Doe' }],
      };

      const { DinnerReservation } = require('../../../lib/schema');
      DinnerReservation.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockReservation),
        }),
      });

      const result = await PDFWhatsAppUtils.getPDFDataByReference(mockPaymentReference, 'dinner');

      expect(result).toBeDefined();
      expect(result?.operationDetails.type).toBe('dinner');
    });
  });

  describe('populateUserDetails', () => {
    it('should populate user details correctly', async () => {
      const { User } = require('../../../lib/schema');
      User.findById.mockResolvedValue(mockUser);

      const result = await PDFWhatsAppUtils.populateUserDetails(mockUserId);

      expect(result).toBeDefined();
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john@example.com');
      expect(result?.phone).toBe('+1234567890');
      expect(result?.registrationId).toBe(mockUserId.toString());
    });

    it('should return null if user not found', async () => {
      const { User } = require('../../../lib/schema');
      User.findById.mockResolvedValue(null);

      const result = await PDFWhatsAppUtils.populateUserDetails(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('generateServiceQRCodeData', () => {
    it('should generate QR code data with appropriate expiration for each service type', async () => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'] as const;

      for (const serviceType of serviceTypes) {
        const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
          serviceType,
          mockServiceId.toString(),
          { userId: mockUserId.toString() }
        );

        expect(result).toBeDefined();
        const parsedData = JSON.parse(result);
        expect(parsedData.type).toBe(serviceType);
        expect(parsedData.id).toBe(mockServiceId.toString());
        expect(parsedData.validUntil).toBeDefined();
        expect(parsedData.timestamp).toBeDefined();
      }
    });

    it('should use custom checkout date for accommodation expiration', async () => {
      const checkOutDate = new Date('2025-12-31');

      const result = await PDFWhatsAppUtils.generateServiceQRCodeData(
        'accommodation',
        mockServiceId.toString(),
        { checkOutDate: checkOutDate.toISOString() }
      );

      const parsedData = JSON.parse(result);
      expect(parsedData.validUntil).toBe(checkOutDate.toISOString());
    });
  });

  describe('extractServiceInfoFromReference', () => {
    it('should extract service type from payment reference patterns', () => {
      const testCases = [
        { reference: 'conv_123456', expectedType: 'convention' },
        { reference: 'dinner_789012', expectedType: 'dinner' },
        { reference: 'accom_345678', expectedType: 'accommodation' },
        { reference: 'broch_901234', expectedType: 'brochure' },
        { reference: 'good_567890', expectedType: 'goodwill' },
        { reference: 'don_123789', expectedType: 'donation' },
        { reference: 'unknown_456123', expectedType: undefined },
      ];

      testCases.forEach(({ reference, expectedType }) => {
        const result = PDFWhatsAppUtils.extractServiceInfoFromReference(reference);
        expect(result.serviceType).toBe(expectedType);
        expect(result.baseReference).toBe(reference);
      });
    });
  });

  describe('getAllUserPDFData', () => {
    it('should retrieve PDF data from all services for a user', async () => {
      const mockConvention = {
        _id: mockServiceId,
        userId: mockUser,
        paymentReference: 'conv_123',
        amount: 50000,
        quantity: 1,
        confirm: true,
        createdAt: new Date('2025-01-01'),
        persons: [],
      };

      const mockDinner = {
        _id: new Types.ObjectId(),
        userId: mockUser,
        paymentReference: 'dinner_456',
        numberOfGuests: 1,
        totalAmount: 75000,
        confirmed: true,
        createdAt: new Date('2025-01-01'),
        guestDetails: [{ name: 'John Doe' }],
      };

      const { ConventionRegistration, DinnerReservation, Accommodation, ConventionBrochure, GoodwillMessage, Donation } = require('../../../lib/schema');

      ConventionRegistration.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockConvention]),
      });

      DinnerReservation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockDinner]),
      });

      // Mock other services as empty
      Accommodation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });
      ConventionBrochure.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });
      GoodwillMessage.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });
      Donation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      // Mock the individual service methods
      jest.spyOn(PDFWhatsAppUtils, 'getConventionPDFData').mockResolvedValue({
        userDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          registrationId: mockServiceId.toString(),
        },
        operationDetails: {
          type: 'convention',
          amount: 50000,
          paymentReference: 'conv_123',
          date: new Date('2025-01-01'),
          status: 'confirmed',
          description: 'GOSA 2025 Convention Registration',
        },
        qrCodeData: 'mock-qr-data',
      });

      jest.spyOn(PDFWhatsAppUtils, 'getDinnerPDFData').mockResolvedValue({
        userDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          registrationId: mockServiceId.toString(),
        },
        operationDetails: {
          type: 'dinner',
          amount: 75000,
          paymentReference: 'dinner_456',
          date: new Date('2025-01-01'),
          status: 'confirmed',
          description: 'GOSA 2025 Convention Dinner Reservation',
        },
        qrCodeData: 'mock-qr-data',
      });

      const result = await PDFWhatsAppUtils.getAllUserPDFData(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].operationDetails.type).toBe('convention');
      expect(result[1].operationDetails.type).toBe('dinner');
    });
  });
});