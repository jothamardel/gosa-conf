import { NextRequest } from 'next/server';
import { PDFData } from '../../lib/services/pdf-generator.service';

/**
 * Test utilities for PDF functionality testing
 */

export interface TestPDFData extends PDFData {
  testId?: string;
  testType?: string;
}

export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

export class PDFTestHelpers {
  /**
   * Create mock PDF data for testing
   */
  static createMockPDFData(overrides: Partial<TestPDFData> = {}): TestPDFData {
    const baseData: TestPDFData = {
      userDetails: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        registrationId: 'TEST123'
      },
      operationDetails: {
        type: 'convention',
        amount: 50000,
        paymentReference: 'TEST_REF_123456',
        date: new Date('2025-01-15T10:00:00Z'),
        status: 'confirmed',
        description: 'Test PDF Generation',
        additionalInfo: 'Test additional information'
      },
      qrCodeData: JSON.stringify({ type: 'convention', id: 'TEST123', test: true }),
      testId: 'test-pdf-data',
      testType: 'unit-test'
    };

    return { ...baseData, ...overrides };
  }

  /**
   * Create mock PDF data for different service types
   */
  static createServiceTypePDFData(serviceType: string, index: number = 1): TestPDFData {
    const baseData = this.createMockPDFData({
      testId: `${serviceType}-test-${index}`,
      testType: 'service-type-test'
    });

    switch (serviceType) {
      case 'convention':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'convention',
            paymentReference: `CONV_TEST_${index}`,
            description: 'GOSA 2025 Convention Registration',
            additionalInfo: `Quantity: ${index} | Registration ID: REG${index}`
          }
        };

      case 'dinner':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'dinner',
            amount: 75000,
            paymentReference: `DINNER_TEST_${index}`,
            description: 'GOSA 2025 Convention Gala Dinner',
            additionalInfo: `Guests: ${index + 1} | Guest Names: Guest ${index} | Special Requests: Test dietary requirements`
          }
        };

      case 'accommodation':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'accommodation',
            amount: 200000,
            paymentReference: `ACCOM_TEST_${index}`,
            description: 'GOSA 2025 Convention Accommodation',
            additionalInfo: `Type: ${index % 3 === 0 ? 'Luxury' : index % 2 === 0 ? 'Premium' : 'Standard'} | Guests: ${index} | Special Requests: Test requests`
          }
        };

      case 'brochure':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'brochure',
            amount: 10000,
            paymentReference: `BROCH_TEST_${index}`,
            description: 'GOSA 2025 Convention Brochure',
            additionalInfo: `Type: ${index % 2 === 0 ? 'Physical' : 'Digital'} | Quantity: ${index} | Recipients: Test Recipient ${index}`
          }
        };

      case 'goodwill':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'goodwill',
            amount: 25000,
            paymentReference: `GOOD_TEST_${index}`,
            description: 'GOSA 2025 Convention Goodwill Message',
            additionalInfo: `Message: "Test goodwill message ${index}" | Attribution: Test User ${index} | Anonymous: ${index % 2 === 0 ? 'No' : 'Yes'}`
          }
        };

      case 'donation':
        return {
          ...baseData,
          operationDetails: {
            ...baseData.operationDetails,
            type: 'donation',
            amount: 50000,
            paymentReference: `DONA_TEST_${index}`,
            description: 'GOSA 2025 Convention Donation',
            additionalInfo: `Donor: Test Donor ${index} | On Behalf Of: Test Organization ${index} | Anonymous: ${index % 2 === 0 ? 'No' : 'Yes'}`
          }
        };

      default:
        return baseData;
    }
  }

  /**
   * Create mock NextRequest for testing
   */
  static createMockRequest(url: string, options: MockRequestOptions = {}): NextRequest {
    const {
      method = 'GET',
      headers = {},
      body,
      searchParams = {},
      ip = '192.168.1.1',
      userAgent = 'Mozilla/5.0 Test Browser'
    } = options;

    const requestUrl = new URL(url.startsWith('http') ? url : `http://localhost:3000${url}`);

    // Add search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      requestUrl.searchParams.set(key, value);
    });

    const mockHeaders = {
      'user-agent': userAgent,
      'x-forwarded-for': ip,
      ...headers
    };

    return {
      method,
      nextUrl: requestUrl,
      headers: {
        get: jest.fn((header: string) => mockHeaders[header.toLowerCase()] || null)
      },
      json: jest.fn().mockResolvedValue(body),
      ip,
      ...options
    } as unknown as NextRequest;
  }

  /**
   * Create batch test data for performance testing
   */
  static createBatchTestData(count: number, serviceTypes?: string[]): TestPDFData[] {
    const types = serviceTypes || ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];

    return Array(count).fill(null).map((_, index) => {
      const serviceType = types[index % types.length];
      return this.createServiceTypePDFData(serviceType, index + 1);
    });
  }

  /**
   * Create performance test configuration
   */
  static createPerformanceTestConfig(overrides: any = {}) {
    return {
      concurrentRequests: 10,
      maxProcessingTime: 30000,
      minSuccessRate: 0.9,
      maxMemoryUsage: 0.8,
      cacheHitRateThreshold: 0.7,
      ...overrides
    };
  }

  /**
   * Validate PDF HTML content
   */
  static validatePDFHTML(html: string, expectedData: TestPDFData): boolean {
    const validations = [
      // Basic structure
      html.includes('<!DOCTYPE html>'),
      html.includes('<html lang="en">'),
      html.includes('GOSA 2025 Convention'),
      html.includes('For Light and Truth'),

      // User details
      html.includes(expectedData.userDetails.name),
      html.includes(expectedData.userDetails.email),
      html.includes(expectedData.userDetails.phone),

      // Operation details
      html.includes(expectedData.operationDetails.paymentReference),
      html.includes(`₦${expectedData.operationDetails.amount.toLocaleString()}`),

      // QR code
      html.includes('data:image/png;base64,'),
      html.includes('QR Code'),

      // Styling
      html.includes('<style>'),
      html.includes('#16A34A'), // Primary color
      html.includes('#F59E0B'), // Secondary color
    ];

    return validations.every(validation => validation);
  }

  /**
   * Measure execution time of async function
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();

    return {
      result,
      executionTime: endTime - startTime
    };
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelay: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
          await this.wait(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Generate random test data
   */
  static generateRandomTestData(count: number): TestPDFData[] {
    return Array(count).fill(null).map((_, index) => {
      const serviceTypes = ['convention', 'dinner', 'accommodation', 'brochure', 'goodwill', 'donation'];
      const randomServiceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];

      return this.createServiceTypePDFData(randomServiceType, index + 1);
    });
  }

  /**
   * Create mock error for testing error handling
   */
  static createMockError(type: string, message: string): Error {
    const error = new Error(message);
    error.name = type;
    return error;
  }

  /**
   * Validate delivery result structure
   */
  static validateDeliveryResult(result: any): boolean {
    const requiredFields = ['success', 'pdfGenerated', 'whatsappSent'];
    const optionalFields = ['fallbackUsed', 'messageId', 'error', 'retryAttempts', 'errorType'];

    // Check required fields
    const hasRequiredFields = requiredFields.every(field => field in result);

    // Check field types
    const validTypes =
      typeof result.success === 'boolean' &&
      typeof result.pdfGenerated === 'boolean' &&
      typeof result.whatsappSent === 'boolean';

    return hasRequiredFields && validTypes;
  }

  /**
   * Create test environment setup
   */
  static setupTestEnvironment() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.PDF_SECURITY_SECRET = 'test-secret-key';

    // Mock console methods to reduce test noise
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = jest.fn();
    console.error = jest.fn();

    return {
      restore: () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
    };
  }

  /**
   * Clean up test environment
   */
  static cleanupTestEnvironment() {
    // Clear environment variables
    delete process.env.PDF_SECURITY_SECRET;

    // Clear any test data
    jest.clearAllMocks();
  }

  /**
   * Assert performance metrics
   */
  static assertPerformanceMetrics(
    metrics: any,
    thresholds: {
      maxAverageTime?: number;
      minCacheHitRate?: number;
      maxMemoryUsage?: number;
      minThroughput?: number;
    }
  ) {
    if (thresholds.maxAverageTime !== undefined) {
      expect(metrics.averageGenerationTime).toBeLessThan(thresholds.maxAverageTime);
    }

    if (thresholds.minCacheHitRate !== undefined) {
      expect(metrics.cacheEfficiency).toBeGreaterThan(thresholds.minCacheHitRate);
    }

    if (thresholds.maxMemoryUsage !== undefined) {
      expect(metrics.memoryUsage.percentage).toBeLessThan(thresholds.maxMemoryUsage * 100);
    }

    if (thresholds.minThroughput !== undefined) {
      expect(metrics.throughput).toBeGreaterThan(thresholds.minThroughput);
    }
  }

  /**
   * Create test report
   */
  static createTestReport(testName: string, results: any): string {
    const timestamp = new Date().toISOString();

    return `
# Test Report: ${testName}
Generated: ${timestamp}

## Results Summary
${JSON.stringify(results, null, 2)}

## Performance Metrics
- Success Rate: ${results.successRate ? (results.successRate * 100).toFixed(2) + '%' : 'N/A'}
- Average Processing Time: ${results.averageTime ? results.averageTime.toFixed(2) + 'ms' : 'N/A'}
- Total Requests: ${results.totalRequests || 'N/A'}
- Failed Requests: ${results.failedRequests || 'N/A'}

## System Health
- Memory Usage: ${results.memoryUsage ? results.memoryUsage.toFixed(2) + '%' : 'N/A'}
- Cache Hit Rate: ${results.cacheHitRate ? (results.cacheHitRate * 100).toFixed(2) + '%' : 'N/A'}
- Queue Length: ${results.queueLength || 'N/A'}
`;
  }
}

/**
 * Test data generators for specific scenarios
 */
export class TestDataGenerators {
  /**
   * Generate data for cache testing
   */
  static forCacheTesting(uniqueCount: number, duplicateCount: number): TestPDFData[] {
    const uniqueData = Array(uniqueCount).fill(null).map((_, index) =>
      PDFTestHelpers.createMockPDFData({
        testId: `cache-unique-${index}`,
        operationDetails: {
          ...PDFTestHelpers.createMockPDFData().operationDetails,
          paymentReference: `CACHE_UNIQUE_${index}`
        }
      })
    );

    const duplicateData = Array(duplicateCount).fill(null).map((_, index) => {
      const originalIndex = index % uniqueCount;
      return uniqueData[originalIndex];
    });

    return [...uniqueData, ...duplicateData];
  }

  /**
   * Generate data for error testing
   */
  static forErrorTesting(): {
    validData: TestPDFData;
    invalidData: TestPDFData[];
  } {
    const validData = PDFTestHelpers.createMockPDFData({
      testId: 'error-test-valid'
    });

    const invalidData = [
      // Missing user name
      PDFTestHelpers.createMockPDFData({
        testId: 'error-test-no-name',
        userDetails: {
          ...validData.userDetails,
          name: ''
        }
      }),
      // Invalid phone number
      PDFTestHelpers.createMockPDFData({
        testId: 'error-test-invalid-phone',
        userDetails: {
          ...validData.userDetails,
          phone: 'invalid-phone'
        }
      }),
      // Zero amount
      PDFTestHelpers.createMockPDFData({
        testId: 'error-test-zero-amount',
        operationDetails: {
          ...validData.operationDetails,
          amount: 0
        }
      }),
      // Missing QR code data
      PDFTestHelpers.createMockPDFData({
        testId: 'error-test-no-qr',
        qrCodeData: ''
      })
    ];

    return { validData, invalidData };
  }

  /**
   * Generate data for load testing
   */
  static forLoadTesting(requestCount: number, serviceTypeDistribution?: Record<string, number>): TestPDFData[] {
    const defaultDistribution = {
      convention: 0.3,
      dinner: 0.2,
      accommodation: 0.2,
      brochure: 0.1,
      goodwill: 0.1,
      donation: 0.1
    };

    const distribution = serviceTypeDistribution || defaultDistribution;
    const data: TestPDFData[] = [];

    Object.entries(distribution).forEach(([serviceType, percentage]) => {
      const count = Math.floor(requestCount * percentage);
      for (let i = 0; i < count; i++) {
        data.push(PDFTestHelpers.createServiceTypePDFData(serviceType, i + 1));
      }
    });

    // Fill remaining slots with random service types
    while (data.length < requestCount) {
      const serviceTypes = Object.keys(distribution);
      const randomType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      data.push(PDFTestHelpers.createServiceTypePDFData(randomType, data.length + 1));
    }

    return data;
  }
}