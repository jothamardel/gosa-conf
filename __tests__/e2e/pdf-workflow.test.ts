import { NextRequest } from 'next/server';
import { GET as downloadPDF } from '../../app/api/v1/pdf/download/route';
import { GET as secureDownloadPDF } from '../../app/api/v1/pdf/secure-download/route';
import { PDFWhatsAppUtils } from '../../lib/utils/pdf-whatsapp.utils';
import { WhatsAppPDFService } from '../../lib/services/whatsapp-pdf.service';
import { PDFSecurityService } from '../../lib/services/pdf-security.service';
import { PDFPerformanceService } from '../../lib/services/pdf-performance.service';
import { PDFCacheService } from '../../lib/services/pdf-cache.service';

// Mock external dependencies
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
}));

jest.mock('../../lib/wasender-api', () => ({
  Wasender: {
    sendDocument: jest.fn().mockResolvedValue({
      success: true,
      data: { msgId: 'whatsapp-msg-123' }
    }),
    httpSenderMessage: jest.fn().mockResolvedValue({
      success: true,
      data: { msgId: 'fallback-msg-123' }
    })
  }
}));

jest.mock('../../lib/services/pdf-monitoring.service', () => ({
  PDFMonitoringService: {
    recordError: jest.fn().mockResolvedValue(undefined),
    recordDeliveryMetrics: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('PDF Workflow End-to-End Tests', () => {
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
      date: new Date('2025-01-15T10:00:00Z'),
      status: 'confirmed' as const,
      description: 'GOSA 2025 Convention Registration',
      additionalInfo: 'Quantity: 1 | Registration ID: REG123'
    },
    qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
  };

  beforeAll(() => {
    // Initialize services
    PDFPerformanceService.initialize({
      maxConcurrentOperations: 5,
      maxQueueSize: 50,
      operationTimeout: 10000
    });

    PDFCacheService.initialize({
      maxSize: 10 * 1024 * 1024, // 10MB
      maxEntries: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes for testing
      cleanupInterval: 60 * 1000, // 1 minute
      compressionEnabled: false, // Disable for testing
      persistToDisk: false
    });
  });

  afterAll(() => {
    PDFPerformanceService.shutdown();
    PDFCacheService.shutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PDF data retrieval
    jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference').mockResolvedValue(mockPDFData);

    // Clear caches
    PDFCacheService.clearAll();
  });

  describe('Complete PDF Generation and Delivery Workflow', () => {
    it('should complete full PDF generation and WhatsApp delivery workflow', async () => {
      // Step 1: Generate and send PDF via WhatsApp
      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.pdfGenerated).toBe(true);
      expect(deliveryResult.whatsappSent).toBe(true);
      expect(deliveryResult.messageId).toBe('whatsapp-msg-123');

      // Step 2: Verify PDF can be downloaded via basic endpoint
      const downloadRequest = createMockRequest('/api/v1/pdf/download', { ref: 'CONV_123456' });
      const downloadResponse = await downloadPDF(downloadRequest);

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('Content-Type')).toBe('application/pdf');

      // Step 3: Verify secure download works
      const secureURL = PDFSecurityService.generateSecureURL({
        paymentReference: 'CONV_123456',
        userEmail: 'john.doe@example.com',
        expiresIn: 3600
      });

      const token = secureURL.split('token=')[1];
      const secureRequest = createMockRequest('/api/v1/pdf/secure-download', { token });
      const secureResponse = await secureDownloadPDF(secureRequest);

      expect(secureResponse.status).toBe(200);
      expect(secureResponse.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('should handle fallback delivery when WhatsApp fails', async () => {
      const { Wasender } = require('../../lib/wasender-api');

      // Mock WhatsApp document delivery failure
      Wasender.sendDocument.mockResolvedValueOnce({
        success: false,
        error: 'WhatsApp delivery failed'
      });

      // Mock successful fallback message
      Wasender.httpSenderMessage.mockResolvedValueOnce({
        success: true,
        data: { msgId: 'fallback-msg-123' }
      });

      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.pdfGenerated).toBe(true);
      expect(deliveryResult.whatsappSent).toBe(false);
      expect(deliveryResult.fallbackUsed).toBe(true);
      expect(deliveryResult.messageId).toBe('fallback-msg-123');
    });

    it('should use caching for repeated requests', async () => {
      // First request - should generate and cache
      const request1 = createMockRequest('/api/v1/pdf/download', { ref: 'CONV_123456' });
      const response1 = await downloadPDF(request1);
      expect(response1.status).toBe(200);

      // Second request - should use cache
      const request2 = createMockRequest('/api/v1/pdf/download', { ref: 'CONV_123456' });
      const response2 = await downloadPDF(request2);
      expect(response2.status).toBe(200);

      // Verify cache statistics show hits
      const cacheStats = PDFCacheService.getCacheStats();
      expect(cacheStats.totalHits).toBeGreaterThan(0);
    });

    it('should handle different service types correctly', async () => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];

      for (const serviceType of serviceTypes) {
        const serviceData = {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            type: serviceType as any,
            paymentReference: `${serviceType.toUpperCase()}_123456`
          }
        };

        // Mock data retrieval for this service type
        jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference')
          .mockResolvedValueOnce(serviceData);

        // Test WhatsApp delivery
        const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(serviceData);
        expect(deliveryResult.success).toBe(true);

        // Test PDF download
        const request = createMockRequest('/api/v1/pdf/download', {
          ref: `${serviceType.toUpperCase()}_123456`
        });
        const response = await downloadPDF(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle concurrent PDF generation requests', async () => {
      const concurrentRequests = 5;
      const requests = Array(concurrentRequests).fill(null).map((_, index) => {
        const data = {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            paymentReference: `CONCURRENT_${index}_123456`
          }
        };

        jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference')
          .mockResolvedValue(data);

        return WhatsAppPDFService.generateAndSendPDF(data);
      });

      const results = await Promise.allSettled(requests);

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
        }
      });

      // Check performance metrics
      const metrics = PDFPerformanceService.getPerformanceMetrics();
      expect(metrics.throughput).toBeGreaterThan(0);
    });

    it('should handle batch PDF generation efficiently', async () => {
      const batchSize = 3;
      const batchRequests = Array(batchSize).fill(null).map((_, index) => ({
        data: {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            paymentReference: `BATCH_${index}_123456`
          }
        },
        type: 'pdf' as const,
        priority: 5
      }));

      const startTime = Date.now();
      const results = await PDFPerformanceService.batchGenerate(batchRequests);
      const endTime = Date.now();

      expect(results).toHaveLength(batchSize);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Batch processing should be faster than sequential
      expect(endTime - startTime).toBeLessThan(batchSize * 2000); // Less than 2 seconds per PDF
    });

    it('should maintain performance under memory pressure', async () => {
      // Generate many PDFs to test memory management
      const manyRequests = 10;

      for (let i = 0; i < manyRequests; i++) {
        const data = {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            paymentReference: `MEMORY_TEST_${i}_123456`
          }
        };

        jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference')
          .mockResolvedValue(data);

        await WhatsAppPDFService.generateAndSendPDF(data);
      }

      // Check that memory optimization works
      await PDFPerformanceService.optimizeMemory();

      const metrics = PDFPerformanceService.getPerformanceMetrics();
      expect(metrics.memoryUsage.percentage).toBeLessThan(90); // Should not exceed 90%
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    it('should recover from temporary service failures', async () => {
      const { Wasender } = require('../../lib/wasender-api');

      // First attempt fails
      Wasender.sendDocument
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { msgId: 'retry-success-123' }
        });

      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      // Should succeed after retry
      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.messageId).toBe('retry-success-123');
    });

    it('should handle invalid payment references gracefully', async () => {
      jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference').mockResolvedValue(null);

      const request = createMockRequest('/api/v1/pdf/download', { ref: 'INVALID_REF' });
      const response = await downloadPDF(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('PAYMENT_REFERENCE_NOT_FOUND');
    });

    it('should handle malformed PDF data gracefully', async () => {
      const malformedData = {
        ...mockPDFData,
        userDetails: null as any
      };

      jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference').mockResolvedValue(malformedData);

      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(malformedData);

      expect(deliveryResult.success).toBe(false);
      expect(deliveryResult.error).toBeTruthy();
    });

    it('should handle cache failures gracefully', async () => {
      // Mock cache service to throw errors
      jest.spyOn(PDFCacheService, 'getCachedHTML').mockRejectedValue(new Error('Cache error'));
      jest.spyOn(PDFCacheService, 'cacheHTML').mockRejectedValue(new Error('Cache error'));

      // Should still work without cache
      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      expect(deliveryResult.success).toBe(true);
    });
  });

  describe('Security and Access Control Tests', () => {
    it('should enforce rate limiting', async () => {
      // Mock rate limit exceeded
      jest.spyOn(PDFSecurityService as any, 'checkRateLimit').mockReturnValue({
        allowed: false,
        resetIn: 30000
      });

      const request = createMockRequest('/api/v1/pdf/download', { ref: 'CONV_123456' });
      const response = await downloadPDF(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should validate secure tokens correctly', async () => {
      // Generate valid token
      const secureURL = PDFSecurityService.generateSecureURL({
        paymentReference: 'CONV_123456',
        userEmail: 'john.doe@example.com',
        expiresIn: 3600
      });

      const token = secureURL.split('token=')[1];
      const request = createMockRequest('/api/v1/pdf/secure-download', { token });
      const response = await secureDownloadPDF(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid secure tokens', async () => {
      const request = createMockRequest('/api/v1/pdf/secure-download', {
        token: 'invalid.token.here'
      });
      const response = await secureDownloadPDF(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('ACCESS_DENIED');
    });

    it('should reject expired secure tokens', async () => {
      // Generate token that expires immediately
      const secureURL = PDFSecurityService.generateSecureURL({
        paymentReference: 'CONV_123456',
        userEmail: 'john.doe@example.com',
        expiresIn: -1 // Already expired
      });

      const token = secureURL.split('token=')[1];
      const request = createMockRequest('/api/v1/pdf/secure-download', { token });
      const response = await secureDownloadPDF(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('ACCESS_DENIED');
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with WhatsApp API correctly', async () => {
      const { Wasender } = require('../../lib/wasender-api');

      await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      expect(Wasender.sendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          text: expect.stringContaining('GOSA 2025 Convention'),
          documentUrl: expect.stringContaining('/api/v1/pdf/download'),
          fileName: expect.stringContaining('GOSA_2025_convention')
        })
      );
    });

    it('should handle WhatsApp API rate limiting', async () => {
      const { Wasender } = require('../../lib/wasender-api');

      Wasender.sendDocument.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded'
      });

      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(mockPDFData);

      // Should fall back to text message
      expect(deliveryResult.fallbackUsed).toBe(true);
      expect(Wasender.httpSenderMessage).toHaveBeenCalled();
    });
  });

  describe('Data Consistency and Integrity Tests', () => {
    it('should maintain data consistency across service calls', async () => {
      const paymentReference = 'CONSISTENCY_TEST_123456';
      const testData = {
        ...mockPDFData,
        operationDetails: {
          ...mockPDFData.operationDetails,
          paymentReference
        }
      };

      jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference').mockResolvedValue(testData);

      // Generate PDF via WhatsApp
      const deliveryResult = await WhatsAppPDFService.generateAndSendPDF(testData);
      expect(deliveryResult.success).toBe(true);

      // Download same PDF via API
      const request = createMockRequest('/api/v1/pdf/download', { ref: paymentReference });
      const response = await downloadPDF(request);
      expect(response.status).toBe(200);

      // Both should use the same data
      expect(PDFWhatsAppUtils.getPDFDataByReference).toHaveBeenCalledWith(paymentReference);
    });

    it('should handle concurrent access to same payment reference', async () => {
      const paymentReference = 'CONCURRENT_ACCESS_123456';
      const testData = {
        ...mockPDFData,
        operationDetails: {
          ...mockPDFData.operationDetails,
          paymentReference
        }
      };

      jest.spyOn(PDFWhatsAppUtils, 'getPDFDataByReference').mockResolvedValue(testData);

      // Make concurrent requests for same payment reference
      const requests = Array(3).fill(null).map(() => {
        const request = createMockRequest('/api/v1/pdf/download', { ref: paymentReference });
        return downloadPDF(request);
      });

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  // Helper function to create mock requests
  function createMockRequest(pathname: string, searchParams: Record<string, string> = {}): NextRequest {
    const url = new URL(`http://localhost:3000${pathname}`);
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return {
      nextUrl: url,
      headers: {
        get: jest.fn((header: string) => {
          if (header === 'user-agent') return 'Mozilla/5.0 Test Browser';
          if (header === 'x-forwarded-for') return '192.168.1.1';
          return null;
        })
      },
      ip: '192.168.1.1'
    } as unknown as NextRequest;
  }
});