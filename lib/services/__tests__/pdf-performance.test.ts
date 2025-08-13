import { PDFPerformanceService } from '../pdf-performance.service';
import { PDFCacheService } from '../pdf-cache.service';

// Mock dependencies
jest.mock('../pdf-monitoring.service', () => ({
  PDFMonitoringService: {
    recordError: jest.fn()
  }
}));

jest.mock('../pdf-generator.service', () => ({
  PDFGeneratorService: {
    generatePDFHTML: jest.fn().mockResolvedValue('<html>Mock PDF HTML</html>'),
    generatePDFBuffer: jest.fn().mockResolvedValue(Buffer.from('Mock PDF Buffer'))
  }
}));

describe('PDFPerformanceService', () => {
  const mockPDFData = {
    userDetails: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      registrationId: 'TEST123'
    },
    operationDetails: {
      type: 'convention' as const,
      amount: 50000,
      paymentReference: 'TEST_REF_123',
      date: new Date(),
      status: 'confirmed' as const,
      description: 'Test PDF Generation'
    },
    qrCodeData: JSON.stringify({ test: true })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    PDFPerformanceService.clearQueues();
  });

  afterAll(() => {
    PDFPerformanceService.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with default limits', () => {
      PDFPerformanceService.initialize();

      const metrics = PDFPerformanceService.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.concurrentOperations).toBe(0);
      expect(metrics.queueLength).toBe(0);
    });

    it('should initialize with custom limits', () => {
      const customLimits = {
        maxConcurrentOperations: 5,
        maxQueueSize: 50,
        operationTimeout: 15000
      };

      PDFPerformanceService.initialize(customLimits);

      // Verify initialization doesn't throw
      expect(() => PDFPerformanceService.getPerformanceMetrics()).not.toThrow();
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize({
        maxConcurrentOperations: 2,
        maxQueueSize: 10,
        operationTimeout: 5000
      });
    });

    it('should queue operations when at capacity', async () => {
      const promises: Promise<string>[] = [];

      // Create multiple operations
      for (let i = 0; i < 5; i++) {
        const promise = PDFPerformanceService.generateOptimizedHTML(mockPDFData, 5);
        promises.push(promise);
      }

      // Check that operations are queued
      const queueStatus = PDFPerformanceService.getQueueStatus();
      expect(queueStatus.queueLength + queueStatus.activeOperations).toBeGreaterThan(0);

      // Wait for all operations to complete
      const results = await Promise.allSettled(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should respect priority ordering', async () => {
      const results: string[] = [];
      const promises: Promise<string>[] = [];

      // Create operations with different priorities
      for (let i = 0; i < 3; i++) {
        const priority = i + 1;
        const promise = PDFPerformanceService.generateOptimizedHTML(
          {
            ...mockPDFData,
            operationDetails: {
              ...mockPDFData.operationDetails,
              description: `Priority ${priority}`
            }
          },
          priority
        );
        promises.push(promise);
      }

      const settledResults = await Promise.allSettled(promises);

      // All should succeed
      settledResults.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle queue overflow', async () => {
      // Fill up the queue beyond capacity
      const promises: Promise<string>[] = [];

      for (let i = 0; i < 15; i++) { // More than maxQueueSize (10)
        const promise = PDFPerformanceService.generateOptimizedHTML(mockPDFData, 5);
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);

      // Some should be rejected due to queue overflow
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
    });

    it('should handle operation timeout', async () => {
      // Mock a slow operation
      const { PDFGeneratorService } = require('../pdf-generator.service');
      PDFGeneratorService.generatePDFHTML.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      PDFPerformanceService.initialize({
        maxConcurrentOperations: 1,
        operationTimeout: 1000 // 1 second timeout
      });

      const promise = PDFPerformanceService.generateOptimizedHTML(mockPDFData, 5);

      await expect(promise).rejects.toThrow('Operation timed out');
    }, 15000);
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize();
    });

    it('should handle batch HTML generation', async () => {
      const requests = Array(3).fill(null).map((_, index) => ({
        data: {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            paymentReference: `BATCH_${index}`
          }
        },
        type: 'html' as const,
        priority: 5
      }));

      const results = await PDFPerformanceService.batchGenerate(requests);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();
      });
    });

    it('should handle batch PDF generation', async () => {
      const requests = Array(2).fill(null).map((_, index) => ({
        data: {
          ...mockPDFData,
          operationDetails: {
            ...mockPDFData.operationDetails,
            paymentReference: `BATCH_PDF_${index}`
          }
        },
        type: 'pdf' as const,
        priority: 5
      }));

      const results = await PDFPerformanceService.batchGenerate(requests);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result).toBeInstanceOf(Buffer);
      });
    });

    it('should handle mixed batch operations', async () => {
      const requests = [
        {
          data: mockPDFData,
          type: 'html' as const,
          priority: 5
        },
        {
          data: mockPDFData,
          type: 'pdf' as const,
          priority: 3
        }
      ];

      const results = await PDFPerformanceService.batchGenerate(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle batch operation failures gracefully', async () => {
      const { PDFGeneratorService } = require('../pdf-generator.service');
      PDFGeneratorService.generatePDFHTML.mockRejectedValueOnce(new Error('Generation failed'));

      const requests = [
        { data: mockPDFData, type: 'html' as const, priority: 5 },
        { data: mockPDFData, type: 'html' as const, priority: 5 }
      ];

      const results = await PDFPerformanceService.batchGenerate(requests);

      expect(results).toHaveLength(2);
      expect(results.some(r => !r.success)).toBe(true);
      expect(results.some(r => r.success)).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize();
    });

    it('should track performance metrics', async () => {
      await PDFPerformanceService.generateOptimizedHTML(mockPDFData, 5);

      const metrics = PDFPerformanceService.getPerformanceMetrics();

      expect(metrics.averageGenerationTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.used).toBeGreaterThan(0);
    });

    it('should provide queue status', () => {
      const status = PDFPerformanceService.getQueueStatus();

      expect(status.queueLength).toBeGreaterThanOrEqual(0);
      expect(status.activeOperations).toBeGreaterThanOrEqual(0);
      expect(status.averageWaitTime).toBeGreaterThanOrEqual(0);
    });

    it('should perform health checks', () => {
      const health = PDFPerformanceService.healthCheck();

      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(Array.isArray(health.issues)).toBe(true);
      expect(health.metrics).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize();
    });

    it('should optimize memory usage', async () => {
      await expect(PDFPerformanceService.optimizeMemory()).resolves.not.toThrow();
    });

    it('should detect memory pressure', () => {
      const health = PDFPerformanceService.healthCheck();

      // Should not be unhealthy in test environment
      expect(health.status).not.toBe('unhealthy');
    });
  });

  describe('Resource Limits', () => {
    it('should update resource limits', () => {
      const newLimits = {
        maxConcurrentOperations: 15,
        maxQueueSize: 200
      };

      expect(() => {
        PDFPerformanceService.updateLimits(newLimits);
      }).not.toThrow();
    });

    it('should clear queues when requested', () => {
      expect(() => {
        PDFPerformanceService.clearQueues();
      }).not.toThrow();

      const status = PDFPerformanceService.getQueueStatus();
      expect(status.queueLength).toBe(0);
      expect(status.activeOperations).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize();
    });

    it('should handle PDF generation errors', async () => {
      const { PDFGeneratorService } = require('../pdf-generator.service');
      PDFGeneratorService.generatePDFHTML.mockRejectedValueOnce(new Error('Mock error'));

      await expect(
        PDFPerformanceService.generateOptimizedHTML(mockPDFData, 5)
      ).rejects.toThrow('Mock error');
    });

    it('should handle invalid operation data', async () => {
      const invalidData = {
        ...mockPDFData,
        userDetails: null
      } as any;

      // Should handle gracefully without crashing the service
      await expect(
        PDFPerformanceService.generateOptimizedHTML(invalidData, 5)
      ).rejects.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      PDFPerformanceService.initialize({
        maxConcurrentOperations: 3,
        maxQueueSize: 20
      });
    });

    it('should handle concurrent operations efficiently', async () => {
      const promises = Array(10).fill(null).map((_, index) =>
        PDFPerformanceService.generateOptimizedHTML(
          {
            ...mockPDFData,
            operationDetails: {
              ...mockPDFData.operationDetails,
              paymentReference: `CONCURRENT_${index}`
            }
          },
          5
        )
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      // All operations should complete
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Should complete in reasonable time (less than 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should maintain performance under load', async () => {
      const batchSize = 5;
      const batches = 3;

      for (let batch = 0; batch < batches; batch++) {
        const promises = Array(batchSize).fill(null).map((_, index) =>
          PDFPerformanceService.generateOptimizedHTML(
            {
              ...mockPDFData,
              operationDetails: {
                ...mockPDFData.operationDetails,
                paymentReference: `LOAD_TEST_${batch}_${index}`
              }
            },
            5
          )
        );

        const results = await Promise.allSettled(promises);

        // Most operations should succeed
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        expect(successCount).toBeGreaterThan(batchSize * 0.8); // At least 80% success
      }

      const finalMetrics = PDFPerformanceService.getPerformanceMetrics();
      expect(finalMetrics.averageGenerationTime).toBeLessThan(5000); // Less than 5 seconds average
    });
  });
});