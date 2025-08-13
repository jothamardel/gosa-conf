import { PDFPerformanceService } from '../../lib/services/pdf-performance.service';
import { PDFCacheService } from '../../lib/services/pdf-cache.service';
import { WhatsAppPDFService } from '../../lib/services/whatsapp-pdf.service';
import { PDFGeneratorService } from '../../lib/services/pdf-generator.service';

// Mock external dependencies
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
}));

jest.mock('../../lib/wasender-api', () => ({
  Wasender: {
    sendDocument: jest.fn().mockResolvedValue({
      success: true,
      data: { msgId: 'load-test-msg' }
    })
  }
}));

jest.mock('../../lib/services/pdf-monitoring.service', () => ({
  PDFMonitoringService: {
    recordError: jest.fn().mockResolvedValue(undefined),
    recordDeliveryMetrics: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('PDF Load and Performance Tests', () => {
  const createTestPDFData = (index: number) => ({
    userDetails: {
      name: `Test User ${index}`,
      email: `test${index}@example.com`,
      phone: `+123456789${index % 10}`,
      registrationId: `TEST_${index}`
    },
    operationDetails: {
      type: 'convention' as const,
      amount: 50000 + (index * 1000),
      paymentReference: `LOAD_TEST_${index}_123456`,
      date: new Date(),
      status: 'confirmed' as const,
      description: `Load Test Registration ${index}`,
      additionalInfo: `Test data for load testing - ${index}`
    },
    qrCodeData: JSON.stringify({ type: 'convention', id: `TEST_${index}`, index })
  });

  beforeAll(() => {
    // Initialize services with test configuration
    PDFPerformanceService.initialize({
      maxConcurrentOperations: 20,
      maxQueueSize: 500,
      operationTimeout: 30000
    });

    PDFCacheService.initialize({
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 2 * 60 * 1000, // 2 minutes
      compressionEnabled: true,
      persistToDisk: false
    });
  });

  afterAll(() => {
    PDFPerformanceService.shutdown();
    PDFCacheService.shutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    PDFCacheService.clearAll();
  });

  describe('High Volume PDF Generation', () => {
    it('should handle 50 concurrent PDF generations within acceptable time', async () => {
      const concurrentCount = 50;
      const maxAcceptableTime = 30000; // 30 seconds

      const requests = Array(concurrentCount).fill(null).map((_, index) =>
        PDFPerformanceService.generateOptimizedHTML(createTestPDFData(index), 5)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      console.log(`Load Test Results:
        - Total Requests: ${concurrentCount}
        - Successful: ${successCount}
        - Failed: ${failureCount}
        - Processing Time: ${processingTime}ms
        - Average Time per Request: ${processingTime / concurrentCount}ms
        - Success Rate: ${(successCount / concurrentCount * 100).toFixed(2)}%`);

      expect(processingTime).toBeLessThan(maxAcceptableTime);
      expect(successCount).toBeGreaterThan(concurrentCount * 0.9); // At least 90% success rate
    }, 45000);

    it('should maintain performance with mixed service types', async () => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];
      const requestsPerType = 10;
      const totalRequests = serviceTypes.length * requestsPerType;

      const requests = serviceTypes.flatMap(serviceType =>
        Array(requestsPerType).fill(null).map((_, index) => {
          const data = {
            ...createTestPDFData(index),
            operationDetails: {
              ...createTestPDFData(index).operationDetails,
              type: serviceType as any,
              paymentReference: `${serviceType.toUpperCase()}_LOAD_${index}`
            }
          };
          return PDFPerformanceService.generateOptimizedPDF(data, 5);
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      console.log(`Mixed Service Types Load Test:
        - Total Requests: ${totalRequests}
        - Service Types: ${serviceTypes.join(', ')}
        - Successful: ${successCount}
        - Processing Time: ${processingTime}ms
        - Success Rate: ${(successCount / totalRequests * 100).toFixed(2)}%`);

      expect(successCount).toBeGreaterThan(totalRequests * 0.85); // At least 85% success rate
      expect(processingTime / totalRequests).toBeLessThan(2000); // Less than 2 seconds average
    }, 60000);

    it('should handle batch processing efficiently', async () => {
      const batchSizes = [5, 10, 20, 30];
      const results: Array<{ batchSize: number; processingTime: number; successRate: number }> = [];

      for (const batchSize of batchSizes) {
        const batchRequests = Array(batchSize).fill(null).map((_, index) => ({
          data: createTestPDFData(index),
          type: 'html' as const,
          priority: 5
        }));

        const startTime = Date.now();
        const batchResults = await PDFPerformanceService.batchGenerate(batchRequests);
        const endTime = Date.now();

        const processingTime = endTime - startTime;
        const successCount = batchResults.filter(r => r.success).length;
        const successRate = successCount / batchSize;

        results.push({ batchSize, processingTime, successRate });

        console.log(`Batch Size ${batchSize}: ${processingTime}ms, ${(successRate * 100).toFixed(2)}% success`);

        expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate
      }

      // Verify that larger batches are more efficient per item
      const efficiency = results.map(r => r.processingTime / r.batchSize);
      expect(efficiency[efficiency.length - 1]).toBeLessThan(efficiency[0] * 1.5); // Not more than 50% slower per item
    }, 45000);
  });

  describe('Cache Performance Tests', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const testData = createTestPDFData(1);
      const iterations = 10;

      // First run - populate cache
      await PDFGeneratorService.generatePDFHTML(testData);

      // Measure cache hits
      const cacheHitTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await PDFGeneratorService.generatePDFHTML(testData);
        const endTime = Date.now();
        cacheHitTimes.push(endTime - startTime);
      }

      // Clear cache and measure cache misses
      PDFCacheService.clearAll();
      const cacheMissTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await PDFGeneratorService.generatePDFHTML(createTestPDFData(i + 100)); // Different data
        const endTime = Date.now();
        cacheMissTimes.push(endTime - startTime);
      }

      const avgCacheHitTime = cacheHitTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const avgCacheMissTime = cacheMissTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const performanceImprovement = avgCacheMissTime / avgCacheHitTime;

      console.log(`Cache Performance:
        - Average Cache Hit Time: ${avgCacheHitTime.toFixed(2)}ms
        - Average Cache Miss Time: ${avgCacheMissTime.toFixed(2)}ms
        - Performance Improvement: ${performanceImprovement.toFixed(2)}x`);

      expect(performanceImprovement).toBeGreaterThan(2); // At least 2x improvement
      expect(avgCacheHitTime).toBeLessThan(100); // Cache hits should be very fast
    });

    it('should maintain cache efficiency under load', async () => {
      const uniqueRequests = 20;
      const duplicateRequests = 80;
      const totalRequests = uniqueRequests + duplicateRequests;

      // Generate unique requests first
      const uniqueData = Array(uniqueRequests).fill(null).map((_, index) =>
        createTestPDFData(index)
      );

      for (const data of uniqueData) {
        await PDFGeneratorService.generatePDFHTML(data);
      }

      // Generate duplicate requests (should hit cache)
      const duplicatePromises = Array(duplicateRequests).fill(null).map((_, index) => {
        const dataIndex = index % uniqueRequests;
        return PDFGeneratorService.generatePDFHTML(uniqueData[dataIndex]);
      });

      const startTime = Date.now();
      await Promise.all(duplicatePromises);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const cacheStats = PDFCacheService.getCacheStats();

      console.log(`Cache Load Test:
        - Total Requests: ${totalRequests}
        - Unique Requests: ${uniqueRequests}
        - Duplicate Requests: ${duplicateRequests}
        - Processing Time: ${processingTime}ms
        - Cache Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%
        - Cache Entries: ${cacheStats.totalEntries}`);

      expect(cacheStats.hitRate).toBeGreaterThan(0.7); // At least 70% hit rate
      expect(processingTime / duplicateRequests).toBeLessThan(50); // Very fast for cached requests
    });

    it('should handle cache eviction gracefully under memory pressure', async () => {
      const largeDataCount = 100;
      const requests = Array(largeDataCount).fill(null).map((_, index) =>
        PDFGeneratorService.generatePDFHTML(createTestPDFData(index))
      );

      await Promise.all(requests);

      const cacheStats = PDFCacheService.getCacheStats();

      console.log(`Cache Eviction Test:
        - Requests Generated: ${largeDataCount}
        - Cache Entries: ${cacheStats.totalEntries}
        - Cache Size: ${Math.round(cacheStats.totalSize / 1024)}KB
        - Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);

      // Cache should not exceed configured limits
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(1000); // Max entries limit
      expect(cacheStats.totalSize).toBeLessThanOrEqual(50 * 1024 * 1024); // Max size limit
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const iterations = 5;
      const requestsPerIteration = 20;
      const memorySnapshots: number[] = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        const requests = Array(requestsPerIteration).fill(null).map((_, index) =>
          PDFPerformanceService.generateOptimizedHTML(
            createTestPDFData(iteration * requestsPerIteration + index),
            5
          )
        );

        await Promise.allSettled(requests);

        // Take memory snapshot
        const memoryUsage = process.memoryUsage();
        memorySnapshots.push(memoryUsage.heapUsed);

        // Run memory optimization
        await PDFPerformanceService.optimizeMemory();

        console.log(`Iteration ${iteration + 1}: Memory usage ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
      }

      // Check that memory usage doesn't grow unbounded
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = (lastSnapshot - firstSnapshot) / firstSnapshot;

      console.log(`Memory Growth: ${(memoryGrowth * 100).toFixed(2)}%`);

      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% memory growth
    }, 60000);

    it('should handle queue management under high load', async () => {
      const highLoadRequests = 100;
      const maxQueueLength = 50; // From service configuration

      // Generate more requests than queue can handle
      const requests = Array(highLoadRequests).fill(null).map((_, index) =>
        PDFPerformanceService.generateOptimizedHTML(createTestPDFData(index), 5)
      );

      const results = await Promise.allSettled(requests);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      const queueStatus = PDFPerformanceService.getQueueStatus();

      console.log(`Queue Management Test:
        - Total Requests: ${highLoadRequests}
        - Successful: ${successCount}
        - Failed: ${failureCount}
        - Final Queue Length: ${queueStatus.queueLength}
        - Active Operations: ${queueStatus.activeOperations}`);

      // Some requests should be rejected due to queue limits
      expect(failureCount).toBeGreaterThan(0);
      expect(successCount).toBeGreaterThan(0);
      expect(queueStatus.queueLength).toBeLessThanOrEqual(maxQueueLength);
    }, 45000);
  });

  describe('WhatsApp Delivery Performance', () => {
    it('should handle high volume WhatsApp deliveries', async () => {
      const deliveryCount = 25;
      const maxAcceptableTime = 20000; // 20 seconds

      const deliveryPromises = Array(deliveryCount).fill(null).map((_, index) =>
        WhatsAppPDFService.generateAndSendPDF(createTestPDFData(index))
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(deliveryPromises);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const successCount = results.filter(r =>
        r.status === 'fulfilled' && r.value.success
      ).length;

      console.log(`WhatsApp Delivery Load Test:
        - Total Deliveries: ${deliveryCount}
        - Successful: ${successCount}
        - Processing Time: ${processingTime}ms
        - Average Time per Delivery: ${processingTime / deliveryCount}ms
        - Success Rate: ${(successCount / deliveryCount * 100).toFixed(2)}%`);

      expect(processingTime).toBeLessThan(maxAcceptableTime);
      expect(successCount).toBeGreaterThan(deliveryCount * 0.8); // At least 80% success rate
    }, 30000);

    it('should maintain delivery performance with different message sizes', async () => {
      const messageSizes = ['small', 'medium', 'large'];
      const requestsPerSize = 5;

      for (const size of messageSizes) {
        let additionalInfo = 'Basic info';

        if (size === 'medium') {
          additionalInfo = 'Medium length additional information with more details about the registration and services included in the package';
        } else if (size === 'large') {
          additionalInfo = 'Very long additional information with extensive details about the registration, services, accommodation preferences, dietary requirements, special requests, guest information, and comprehensive notes about the booking that would result in a much larger message size when delivered via WhatsApp to test the performance impact of message size on delivery speed and success rates';
        }

        const requests = Array(requestsPerSize).fill(null).map((_, index) => {
          const data = {
            ...createTestPDFData(index),
            operationDetails: {
              ...createTestPDFData(index).operationDetails,
              additionalInfo
            }
          };
          return WhatsAppPDFService.generateAndSendPDF(data);
        });

        const startTime = Date.now();
        const results = await Promise.allSettled(requests);
        const endTime = Date.now();

        const processingTime = endTime - startTime;
        const successCount = results.filter(r =>
          r.status === 'fulfilled' && r.value.success
        ).length;

        console.log(`Message Size ${size}:
          - Processing Time: ${processingTime}ms
          - Success Rate: ${(successCount / requestsPerSize * 100).toFixed(2)}%
          - Avg Time per Message: ${processingTime / requestsPerSize}ms`);

        expect(successCount).toBeGreaterThan(requestsPerSize * 0.8);
      }
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should provide accurate performance metrics under load', async () => {
      const testRequests = 30;

      // Generate load
      const requests = Array(testRequests).fill(null).map((_, index) =>
        PDFPerformanceService.generateOptimizedHTML(createTestPDFData(index), 5)
      );

      await Promise.allSettled(requests);

      const metrics = PDFPerformanceService.getPerformanceMetrics();
      const cacheStats = PDFCacheService.getCacheStats();

      console.log(`Performance Metrics:
        - Average Generation Time: ${metrics.averageGenerationTime.toFixed(2)}ms
        - Cache Efficiency: ${(metrics.cacheEfficiency * 100).toFixed(2)}%
        - Throughput: ${metrics.throughput.toFixed(2)} ops/sec
        - Memory Usage: ${metrics.memoryUsage.percentage.toFixed(2)}%
        - Queue Length: ${metrics.queueLength}
        - Cache Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);

      expect(metrics.averageGenerationTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.memoryUsage.percentage).toBeLessThan(90);
    });

    it('should maintain healthy system status under load', async () => {
      const loadRequests = 40;

      // Generate sustained load
      const requests = Array(loadRequests).fill(null).map((_, index) =>
        PDFPerformanceService.generateOptimizedPDF(createTestPDFData(index), 5)
      );

      await Promise.allSettled(requests);

      const health = PDFPerformanceService.healthCheck();

      console.log(`System Health Check:
        - Status: ${health.status}
        - Issues: ${health.issues.length > 0 ? health.issues.join(', ') : 'None'}
        - Memory Usage: ${health.metrics.memoryUsage.percentage.toFixed(2)}%
        - Queue Length: ${health.metrics.queueLength}
        - Cache Efficiency: ${(health.metrics.cacheEfficiency * 100).toFixed(2)}%`);

      expect(health.status).not.toBe('unhealthy');
      expect(health.metrics.memoryUsage.percentage).toBeLessThan(95);
    });
  });
});