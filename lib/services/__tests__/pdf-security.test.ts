import { PDFSecurityService } from '../pdf-security.service';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('../pdf-monitoring.service', () => ({
  PDFMonitoringService: {
    recordError: jest.fn()
  }
}));

describe('PDFSecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear static data
    PDFSecurityService['downloadAttempts'].clear();
    PDFSecurityService['downloadCounts'].clear();
    PDFSecurityService['rateLimitTracker'].clear();
  });

  describe('generateSecureURL', () => {
    it('should generate a secure URL with default options', () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);

      expect(url).toContain('/api/v1/pdf/secure-download?token=');
      expect(url).toMatch(/^https?:\/\/.+\/api\/v1\/pdf\/secure-download\?token=.+$/);
    });

    it('should generate different tokens for different options', () => {
      const options1 = {
        paymentReference: 'CONV_123456',
        userEmail: 'test1@example.com'
      };

      const options2 = {
        paymentReference: 'CONV_123456',
        userEmail: 'test2@example.com'
      };

      const url1 = PDFSecurityService.generateSecureURL(options1);
      const url2 = PDFSecurityService.generateSecureURL(options2);

      expect(url1).not.toBe(url2);
    });

    it('should include custom expiration and download limits', () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com',
        expiresIn: 3600, // 1 hour
        maxDownloads: 5
      };

      const url = PDFSecurityService.generateSecureURL(options);
      expect(url).toContain('token=');
    });
  });

  describe('validateAccess', () => {
    const createMockRequest = (ip: string = '192.168.1.1', userAgent: string = 'Mozilla/5.0'): NextRequest => {
      const request = {
        ip,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'user-agent') return userAgent;
            if (header === 'x-forwarded-for') return ip;
            return null;
          })
        }
      } as unknown as NextRequest;

      return request;
    };

    it('should validate a valid token', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com',
        expiresIn: 3600
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];
      const request = createMockRequest();

      const result = await PDFSecurityService.validateAccess(token, request);

      expect(result.valid).toBe(true);
      expect(result.remainingDownloads).toBe(10); // Default max downloads
      expect(result.userInfo?.email).toBe('test@example.com');
    });

    it('should reject an invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      const request = createMockRequest();

      const result = await PDFSecurityService.validateAccess(invalidToken, request);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid or expired token');
    });

    it('should reject an expired token', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com',
        expiresIn: -1 // Already expired
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];
      const request = createMockRequest();

      const result = await PDFSecurityService.validateAccess(token, request);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token has expired');
    });

    it('should enforce IP restrictions', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com',
        allowedIPs: ['192.168.1.100'] // Different from request IP
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];
      const request = createMockRequest('192.168.1.1'); // Different IP

      const result = await PDFSecurityService.validateAccess(token, request);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Access denied from this IP address');
    });

    it('should allow access from permitted IP', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com',
        allowedIPs: ['192.168.1.1']
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];
      const request = createMockRequest('192.168.1.1');

      const result = await PDFSecurityService.validateAccess(token, request);

      expect(result.valid).toBe(true);
    });

    it('should enforce rate limiting', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];
      const request = createMockRequest();

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) { // Exceeds default limit of 5
        await PDFSecurityService.validateAccess(token, request);
      }

      const result = await PDFSecurityService.validateAccess(token, request);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });
  });

  describe('recordDownload', () => {
    it('should record download and increment counter', () => {
      const paymentReference = 'CONV_123456';
      const clientIP = '192.168.1.1';

      PDFSecurityService.recordDownload(paymentReference, clientIP);

      const stats = PDFSecurityService.getDownloadStats(paymentReference);
      expect(stats.totalAttempts).toBe(1);
    });

    it('should track multiple downloads from same IP', () => {
      const paymentReference = 'CONV_123456';
      const clientIP = '192.168.1.1';

      PDFSecurityService.recordDownload(paymentReference, clientIP);
      PDFSecurityService.recordDownload(paymentReference, clientIP);
      PDFSecurityService.recordDownload(paymentReference, clientIP);

      // Downloads are tracked internally, but stats come from access attempts
      // This test verifies the method doesn't throw errors
      expect(() => {
        PDFSecurityService.recordDownload(paymentReference, clientIP);
      }).not.toThrow();
    });
  });

  describe('getDownloadStats', () => {
    it('should return empty stats for unknown payment reference', () => {
      const stats = PDFSecurityService.getDownloadStats('UNKNOWN_REF');

      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulDownloads).toBe(0);
      expect(stats.failedAttempts).toBe(0);
      expect(stats.uniqueIPs).toBe(0);
      expect(stats.lastAccess).toBeUndefined();
    });

    it('should calculate stats correctly', async () => {
      const paymentReference = 'CONV_123456';
      const options = {
        paymentReference,
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];

      // Create mock requests from different IPs
      const request1 = {
        ip: '192.168.1.1',
        headers: { get: () => 'Mozilla/5.0' }
      } as unknown as NextRequest;

      const request2 = {
        ip: '192.168.1.2',
        headers: { get: () => 'Mozilla/5.0' }
      } as unknown as NextRequest;

      // Make some successful and failed attempts
      await PDFSecurityService.validateAccess(token, request1);
      await PDFSecurityService.validateAccess(token, request2);
      await PDFSecurityService.validateAccess('invalid-token', request1);

      const stats = PDFSecurityService.getDownloadStats(paymentReference);
      expect(stats.totalAttempts).toBeGreaterThan(0);
      expect(stats.uniqueIPs).toBeGreaterThan(0);
    });
  });

  describe('validatePaymentReference', () => {
    it('should validate correct payment reference formats', () => {
      const validRefs = [
        'CONV_123456',
        'DINNER_ABC123',
        'ACCOM_XYZ789',
        'BROCH_DEF456'
      ];

      validRefs.forEach(ref => {
        expect(PDFSecurityService.validatePaymentReference(ref)).toBe(true);
      });
    });

    it('should reject invalid payment reference formats', () => {
      const invalidRefs = [
        'invalid',
        '123456',
        'CONV_',
        '_123456',
        'CONV-123456',
        'conv_123456', // lowercase
        'TOOLONGPREFIX_123456'
      ];

      invalidRefs.forEach(ref => {
        expect(PDFSecurityService.validatePaymentReference(ref)).toBe(false);
      });
    });
  });

  describe('generateUserSecureLink', () => {
    it('should generate secure link with user context', () => {
      const link = PDFSecurityService.generateUserSecureLink(
        'CONV_123456',
        'user@example.com',
        '+1234567890'
      );

      expect(link).toContain('/api/v1/pdf/secure-download?token=');
    });

    it('should apply custom options', () => {
      const link = PDFSecurityService.generateUserSecureLink(
        'CONV_123456',
        'user@example.com',
        '+1234567890',
        {
          expiresIn: 7200, // 2 hours
          maxDownloads: 3
        }
      );

      expect(link).toContain('token=');
    });
  });

  describe('generateWhatsAppSecureLink', () => {
    it('should generate WhatsApp-specific secure link', () => {
      const link = PDFSecurityService.generateWhatsAppSecureLink(
        'CONV_123456',
        '+1234567890',
        24 // 24 hours
      );

      expect(link).toContain('/api/v1/pdf/secure-download?token=');
    });

    it('should use default expiration if not specified', () => {
      const link = PDFSecurityService.generateWhatsAppSecureLink(
        'CONV_123456',
        '+1234567890'
      );

      expect(link).toContain('token=');
    });
  });

  describe('revokeAccess', () => {
    it('should revoke access for payment reference', () => {
      const paymentReference = 'CONV_123456';
      const clientIP = '192.168.1.1';

      // Record some downloads first
      PDFSecurityService.recordDownload(paymentReference, clientIP);

      // Revoke access
      PDFSecurityService.revokeAccess(paymentReference);

      // This should not throw an error
      expect(() => {
        PDFSecurityService.revokeAccess(paymentReference);
      }).not.toThrow();
    });
  });

  describe('cleanupExpiredData', () => {
    it('should clean up expired data without errors', () => {
      // Add some test data
      const paymentReference = 'CONV_123456';
      const clientIP = '192.168.1.1';

      PDFSecurityService.recordDownload(paymentReference, clientIP);

      // Run cleanup
      expect(() => {
        PDFSecurityService.cleanupExpiredData();
      }).not.toThrow();
    });
  });

  describe('Token Security', () => {
    it('should create tokens that cannot be easily tampered with', () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];

      // Try to tamper with the token
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      const request = {
        ip: '192.168.1.1',
        headers: { get: () => 'Mozilla/5.0' }
      } as unknown as NextRequest;

      return PDFSecurityService.validateAccess(tamperedToken, request).then(result => {
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Invalid or expired token');
      });
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        'not.a.token',
        'onlyonepart',
        '',
        'too.many.parts.here.invalid'
      ];

      const request = {
        ip: '192.168.1.1',
        headers: { get: () => 'Mozilla/5.0' }
      } as unknown as NextRequest;

      for (const token of malformedTokens) {
        const result = await PDFSecurityService.validateAccess(token, request);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];

      const request = {
        ip: undefined,
        headers: { get: () => null }
      } as unknown as NextRequest;

      const result = await PDFSecurityService.validateAccess(token, request);
      // Should still work with 'unknown' IP
      expect(result.valid).toBe(true);
    });

    it('should handle concurrent access validation', async () => {
      const options = {
        paymentReference: 'CONV_123456',
        userEmail: 'test@example.com'
      };

      const url = PDFSecurityService.generateSecureURL(options);
      const token = url.split('token=')[1];

      const request = {
        ip: '192.168.1.1',
        headers: { get: () => 'Mozilla/5.0' }
      } as unknown as NextRequest;

      // Make multiple concurrent validation requests
      const promises = Array(5).fill(null).map(() =>
        PDFSecurityService.validateAccess(token, request)
      );

      const results = await Promise.all(promises);

      // All should succeed (within rate limit)
      results.forEach(result => {
        expect(result.valid).toBe(true);
      });
    });
  });
});