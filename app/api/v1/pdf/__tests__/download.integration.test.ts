import { NextRequest } from 'next/server';
import { GET, POST, HEAD } from '../download/route';
import { PDFWhatsAppUtils } from '@/lib/utils/pdf-whatsapp.utils';
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';
import { PDFPerformanceService } from '@/lib/services/pdf-performance.service';
import { PDFSecurityService } from '@/lib/services/pdf-security.service';
import { PDFMonitoringService } from '@/lib/services/pdf-monitoring.service';

// Mock dependencies
jest.mock('@/lib/utils/pdf-whatsapp.utils');
jest.mock('@/lib/services/pdf-generator.service');
jest.mock('@/lib/services/pdf-performance.service');
jest.mock('@/lib/services/pdf-security.service');
jest.mock('@/lib/services/pdf-monitoring.service');

describe('PDF Download API Integration Tests', () => {
  const mockPDFWhatsAppUtils = PDFWhatsAppUtils as jest.Mocked<typeof PDFWhatsAppUtils>;
  const mockPDFGeneratorService = PDFGeneratorService as jest.Mocked<typeof PDFGeneratorService>;
  const mockPDFPerformanceService = PDFPerformanceService as jest.Mocked<typeof PDFPerformanceService>;
  const mockPDFSecurityService = PDFSecurityService as jest.Mocked<typeof PDFSecurityService>;
  const mockPDFMonitoringService = PDFMonitoringService as jest.Mocked<typeof PDFMonitoringService>;

  const mockPDFData = {
    userDetails: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      registrationId: 'REG123'
    },
    operationDetails: {
      type: 'convention' as const,
      amount: 50000,
      paymentReference: 'CONV_123456',
      date: new Date(),
      status: 'confirmed' as const,
      description: 'GOSA 2025 Convention Registration'
    },
    qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
  };

  const mockPDFBuffer = Buffer.from('Mock PDF content');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPDFSecurityService.validatePaymentReference.mockReturnValue(true);
    mockPDFSecurityService['getClientIP'] = jest.fn().mockReturnValue('192.168.1.1');
    mockPDFSecurityService['checkRateLimit'] = jest.fn().mockReturnValue({ allowed: true, resetIn: 0 });
    mockPDFSecurityService['updateRateLimit'] = jest.fn();

    mockPDFWhatsAppUtils.getPDFDataByReference.mockResolvedValue(mockPDFData);
    mockPDFPerformanceService.generateOptimizedPDF.mockResolvedValue(mockPDFBuffer);
    mockPDFGeneratorService.generateFilename.mockReturnValue('GOSA_2025_convention_John_Doe_2025-01-15.pdf');
    mockPDFMonitoringService.recordDeliveryMetrics.mockResolvedValue(undefined);
    mockPDFMonitoringService.recordError.mockResolvedValue(undefined);
  });

  describe('GET /api/v1/pdf/download', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/v1/pdf/download');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return {
        nextUrl: url,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'user-agent') return 'Mozilla/5.0 Test Browser';
            return null;
          })
        },
        ip: '192.168.1.1'
      } as unknown as NextRequest;
    };

    it('should successfully download PDF with valid payment reference', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('GOSA_2025_convention_John_Doe_2025-01-15.pdf');

      // Check security headers
      expect(response.headers.get('Cache-Control')).toContain('private, no-cache');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');

      // Verify service calls
      expect(mockPDFSecurityService.validatePaymentReference).toHaveBeenCalledWith('CONV_123456');
      expect(mockPDFWhatsAppUtils.getPDFDataByReference).toHaveBeenCalledWith('CONV_123456');
      expect(mockPDFPerformanceService.generateOptimizedPDF).toHaveBeenCalledWith(mockPDFData, 7);
      expect(mockPDFMonitoringService.recordDeliveryMetrics).toHaveBeenCalled();
    });

    it('should return 400 for missing payment reference', async () => {
      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Payment reference is required');
      expect(data.code).toBe('MISSING_PAYMENT_REFERENCE');
      expect(mockPDFMonitoringService.recordError).toHaveBeenCalledWith(
        'warning',
        'PDF_DOWNLOAD',
        'MISSING_PAYMENT_REFERENCE',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return 400 for invalid payment reference format', async () => {
      mockPDFSecurityService.validatePaymentReference.mockReturnValue(false);
      const request = createMockRequest({ ref: 'invalid-ref' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid payment reference format');
      expect(data.code).toBe('INVALID_PAYMENT_REFERENCE');
    });

    it('should return 429 for rate limit exceeded', async () => {
      mockPDFSecurityService['checkRateLimit'] = jest.fn().mockReturnValue({
        allowed: false,
        resetIn: 30000
      });
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many requests');
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should return 404 for non-existent payment reference', async () => {
      mockPDFWhatsAppUtils.getPDFDataByReference.mockResolvedValue(null);
      const request = createMockRequest({ ref: 'CONV_NONEXISTENT' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Payment reference not found');
      expect(data.code).toBe('PAYMENT_REFERENCE_NOT_FOUND');
    });

    it('should return 503 for PDF generation failure', async () => {
      mockPDFPerformanceService.generateOptimizedPDF.mockRejectedValue(
        new Error('PDF generation failed')
      );
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unable to generate PDF document. Please try again later.');
      expect(data.code).toBe('PDF_GENERATION_FAILED');
    });

    it('should handle different service types correctly', async () => {
      const dinnerPDFData = {
        ...mockPDFData,
        operationDetails: {
          ...mockPDFData.operationDetails,
          type: 'dinner' as const
        }
      };
      mockPDFWhatsAppUtils.getPDFDataByReference.mockResolvedValue(dinnerPDFData);
      mockPDFGeneratorService.generateFilename.mockReturnValue('GOSA_2025_dinner_John_Doe_2025-01-15.pdf');

      const request = createMockRequest({ ref: 'DINNER_123456' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('GOSA_2025_dinner_John_Doe_2025-01-15.pdf');
    });

    it('should include tracking headers', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);

      expect(response.headers.get('X-Download-ID')).toBeTruthy();
      expect(response.headers.get('X-Download-Time')).toBeTruthy();
      expect(response.headers.get('X-Security-Level')).toBe('basic');
    });
  });

  describe('POST /api/v1/pdf/download', () => {
    const createMockPostRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        }
      } as unknown as NextRequest;
    };

    it('should return download URL for valid payment reference', async () => {
      const request = createMockPostRequest({ paymentReference: 'CONV_123456' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.downloadUrl).toContain('/api/v1/pdf/download?ref=CONV_123456');
    });

    it('should regenerate PDF when requested', async () => {
      const request = createMockPostRequest({
        paymentReference: 'CONV_123456',
        regenerate: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('PDF regenerated successfully');
      expect(data.downloadUrl).toContain('/api/v1/pdf/download?ref=CONV_123456');
      expect(data.size).toBe(mockPDFBuffer.length);
    });

    it('should return 400 for missing payment reference', async () => {
      const request = createMockPostRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Payment reference is required');
    });

    it('should return 404 for non-existent payment reference during regeneration', async () => {
      mockPDFWhatsAppUtils.getPDFDataByReference.mockResolvedValue(null);
      const request = createMockPostRequest({
        paymentReference: 'CONV_NONEXISTENT',
        regenerate: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Payment reference not found');
    });
  });

  describe('HEAD /api/v1/pdf/download', () => {
    const createMockHeadRequest = () => {
      return {
        headers: {
          get: jest.fn().mockReturnValue('test-agent')
        }
      } as unknown as NextRequest;
    };

    it('should return healthy status when PDF service is working', async () => {
      mockPDFGeneratorService.generatePDFHTML.mockResolvedValue('<html>Test</html>');
      const request = createMockHeadRequest();

      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Service-Status')).toBe('healthy');
      expect(response.headers.get('X-Service-Name')).toBe('PDF-Generation-Service');
      expect(response.headers.get('X-Timestamp')).toBeTruthy();
    });

    it('should return unhealthy status when PDF service fails', async () => {
      mockPDFGeneratorService.generatePDFHTML.mockRejectedValue(new Error('Service failed'));
      const request = createMockHeadRequest();

      const response = await HEAD(request);

      expect(response.status).toBe(503);
      expect(response.headers.get('X-Service-Status')).toBe('unhealthy');
      expect(response.headers.get('X-Error')).toBe('Service failed');
    });
  });

  describe('Error handling and monitoring', () => {
    it('should log all successful downloads', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFMonitoringService.recordError).toHaveBeenCalledWith(
        'warning',
        'PDF_DOWNLOAD',
        'DOWNLOAD_SUCCESS',
        'PDF downloaded successfully via basic endpoint',
        expect.objectContaining({
          paymentReference: 'CONV_123456',
          ipAddress: '192.168.1.1',
          filename: expect.stringContaining('GOSA_2025_convention_John_Doe'),
          fileSize: mockPDFBuffer.length
        })
      );
    });

    it('should log all error attempts', async () => {
      const request = createMockRequest({ ref: 'INVALID' });
      mockPDFSecurityService.validatePaymentReference.mockReturnValue(false);

      await GET(request);

      expect(mockPDFMonitoringService.recordError).toHaveBeenCalledWith(
        'warning',
        'PDF_DOWNLOAD',
        'INVALID_PAYMENT_REFERENCE_FORMAT',
        expect.stringContaining('Invalid payment reference format'),
        expect.objectContaining({
          paymentReference: 'INVALID',
          ipAddress: '192.168.1.1'
        })
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      mockPDFWhatsAppUtils.getPDFDataByReference.mockRejectedValue(
        new Error('Unexpected database error')
      );
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('An error occurred while processing your request. Please try again later.');
      expect(data.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should record delivery metrics for successful downloads', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFMonitoringService.recordDeliveryMetrics).toHaveBeenCalledWith(
        mockPDFData,
        {
          success: true,
          pdfGenerated: true,
          whatsappSent: false,
          fallbackUsed: false,
          retryAttempts: 0
        },
        expect.any(Number)
      );
    });
  });

  describe('Performance and caching', () => {
    it('should use performance service for PDF generation', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFPerformanceService.generateOptimizedPDF).toHaveBeenCalledWith(
        mockPDFData,
        7 // Higher priority for direct downloads
      );
    });

    it('should handle performance service errors', async () => {
      mockPDFPerformanceService.generateOptimizedPDF.mockRejectedValue(
        new Error('Performance service unavailable')
      );
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Security features', () => {
    it('should validate payment reference format', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFSecurityService.validatePaymentReference).toHaveBeenCalledWith('CONV_123456');
    });

    it('should check rate limits', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFSecurityService['checkRateLimit']).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should update rate limit counters on successful downloads', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      await GET(request);

      expect(mockPDFSecurityService['updateRateLimit']).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should include comprehensive security headers', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);

      const securityHeaders = [
        'Cache-Control',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Content-Security-Policy'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers.get(header)).toBeTruthy();
      });
    });
  });

  describe('Content type handling', () => {
    it('should handle different format parameters', async () => {
      const request = createMockRequest({ ref: 'CONV_123456', format: 'pdf' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('should default to PDF format when format not specified', async () => {
      const request = createMockRequest({ ref: 'CONV_123456' });

      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });
  });
});