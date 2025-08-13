import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { PDFMonitoringService } from './pdf-monitoring.service';

export interface SecureURLOptions {
  paymentReference: string;
  userEmail?: string;
  userPhone?: string;
  expiresIn?: number; // seconds
  allowedIPs?: string[];
  maxDownloads?: number;
  requireAuth?: boolean;
}

export interface AccessValidationResult {
  valid: boolean;
  reason?: string;
  remainingDownloads?: number;
  expiresAt?: Date;
  userInfo?: {
    email?: string;
    phone?: string;
    ipAddress: string;
    userAgent: string;
  };
}

export interface DownloadAttempt {
  paymentReference: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
  userEmail?: string;
  userPhone?: string;
}

export class PDFSecurityService {
  private static readonly SECRET_KEY = process.env.PDF_SECURITY_SECRET || 'default-pdf-secret-key';
  private static readonly DEFAULT_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
  private static readonly MAX_DOWNLOADS_DEFAULT = 10;
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 5;

  // In-memory storage for demo - in production, use Redis or database
  private static downloadAttempts: Map<string, DownloadAttempt[]> = new Map();
  private static downloadCounts: Map<string, number> = new Map();
  private static rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Generate a secure URL for PDF download
   */
  static generateSecureURL(options: SecureURLOptions): string {
    const {
      paymentReference,
      userEmail,
      userPhone,
      expiresIn = this.DEFAULT_EXPIRY,
      allowedIPs = [],
      maxDownloads = this.MAX_DOWNLOADS_DEFAULT,
      requireAuth = false
    } = options;

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const payload = {
      ref: paymentReference,
      exp: expiresAt,
      email: userEmail,
      phone: userPhone,
      ips: allowedIPs,
      maxDl: maxDownloads,
      auth: requireAuth,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = this.createSecureToken(payload);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.gosa.events';

    return `${baseUrl}/api/v1/pdf/secure-download?token=${token}`;
  }

  /**
   * Validate access to PDF download
   */
  static async validateAccess(
    token: string,
    request: NextRequest
  ): Promise<AccessValidationResult> {
    try {
      // Decode and verify token
      const payload = this.verifySecureToken(token);
      if (!payload) {
        await this.logAccessAttempt({
          paymentReference: 'unknown',
          ipAddress: this.getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date(),
          success: false,
          reason: 'Invalid or expired token'
        });

        return {
          valid: false,
          reason: 'Invalid or expired token'
        };
      }

      const clientIP = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        await this.logAccessAttempt({
          paymentReference: payload.ref,
          ipAddress: clientIP,
          userAgent,
          timestamp: new Date(),
          success: false,
          reason: 'Token expired',
          userEmail: payload.email,
          userPhone: payload.phone
        });

        return {
          valid: false,
          reason: 'Token has expired'
        };
      }

      // Check IP restrictions
      if (payload.ips && payload.ips.length > 0) {
        if (!payload.ips.includes(clientIP)) {
          await this.logAccessAttempt({
            paymentReference: payload.ref,
            ipAddress: clientIP,
            userAgent,
            timestamp: new Date(),
            success: false,
            reason: 'IP address not allowed',
            userEmail: payload.email,
            userPhone: payload.phone
          });

          return {
            valid: false,
            reason: 'Access denied from this IP address'
          };
        }
      }

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(clientIP);
      if (!rateLimitResult.allowed) {
        await this.logAccessAttempt({
          paymentReference: payload.ref,
          ipAddress: clientIP,
          userAgent,
          timestamp: new Date(),
          success: false,
          reason: 'Rate limit exceeded',
          userEmail: payload.email,
          userPhone: payload.phone
        });

        return {
          valid: false,
          reason: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds`
        };
      }

      // Check download count
      const downloadKey = `${payload.ref}:${clientIP}`;
      const currentDownloads = this.downloadCounts.get(downloadKey) || 0;

      if (currentDownloads >= payload.maxDl) {
        await this.logAccessAttempt({
          paymentReference: payload.ref,
          ipAddress: clientIP,
          userAgent,
          timestamp: new Date(),
          success: false,
          reason: 'Download limit exceeded',
          userEmail: payload.email,
          userPhone: payload.phone
        });

        return {
          valid: false,
          reason: 'Maximum download limit reached'
        };
      }

      // Log successful validation
      await this.logAccessAttempt({
        paymentReference: payload.ref,
        ipAddress: clientIP,
        userAgent,
        timestamp: new Date(),
        success: true,
        userEmail: payload.email,
        userPhone: payload.phone
      });

      return {
        valid: true,
        remainingDownloads: payload.maxDl - currentDownloads,
        expiresAt: new Date(payload.exp * 1000),
        userInfo: {
          email: payload.email,
          phone: payload.phone,
          ipAddress: clientIP,
          userAgent
        }
      };

    } catch (error) {
      console.error('Error validating PDF access:', error);

      await this.logAccessAttempt({
        paymentReference: 'unknown',
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        success: false,
        reason: 'Validation error'
      });

      return {
        valid: false,
        reason: 'Access validation failed'
      };
    }
  }

  /**
   * Record a successful download
   */
  static recordDownload(paymentReference: string, clientIP: string): void {
    const downloadKey = `${paymentReference}:${clientIP}`;
    const currentCount = this.downloadCounts.get(downloadKey) || 0;
    this.downloadCounts.set(downloadKey, currentCount + 1);

    // Update rate limit counter
    this.updateRateLimit(clientIP);
  }

  /**
   * Generate secure token with payload
   */
  private static createSecureToken(payload: any): string {
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verify and decode secure token
   */
  private static verifySecureToken(token: string): any | null {
    try {
      const [payloadBase64, signature] = token.split('.');

      if (!payloadBase64 || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(payloadBase64)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payloadString = Buffer.from(payloadBase64, 'base64url').toString();
      return JSON.parse(payloadString);

    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to connection remote address
    return request.ip || 'unknown';
  }

  /**
   * Check rate limiting for IP address
   */
  private static checkRateLimit(ipAddress: string): { allowed: boolean; resetIn: number } {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(ipAddress);

    if (!tracker) {
      this.rateLimitTracker.set(ipAddress, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return { allowed: true, resetIn: this.RATE_LIMIT_WINDOW };
    }

    if (now > tracker.resetTime) {
      // Reset the counter
      this.rateLimitTracker.set(ipAddress, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return { allowed: true, resetIn: this.RATE_LIMIT_WINDOW };
    }

    if (tracker.count >= this.RATE_LIMIT_MAX_ATTEMPTS) {
      return { allowed: false, resetIn: tracker.resetTime - now };
    }

    tracker.count++;
    return { allowed: true, resetIn: tracker.resetTime - now };
  }

  /**
   * Update rate limit counter
   */
  private static updateRateLimit(ipAddress: string): void {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(ipAddress);

    if (!tracker || now > tracker.resetTime) {
      this.rateLimitTracker.set(ipAddress, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
    } else {
      tracker.count++;
    }
  }

  /**
   * Log access attempt for monitoring
   */
  private static async logAccessAttempt(attempt: DownloadAttempt): Promise<void> {
    try {
      // Store in memory (in production, use database)
      const attempts = this.downloadAttempts.get(attempt.paymentReference) || [];
      attempts.push(attempt);
      this.downloadAttempts.set(attempt.paymentReference, attempts);

      // Keep only last 100 attempts per payment reference
      if (attempts.length > 100) {
        attempts.splice(0, attempts.length - 100);
      }

      // Log to monitoring service
      await PDFMonitoringService.recordError(
        attempt.success ? 'warning' : 'error',
        'PDF_SECURITY',
        attempt.success ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        `PDF access ${attempt.success ? 'granted' : 'denied'}: ${attempt.reason || 'Success'}`,
        {
          paymentReference: attempt.paymentReference,
          ipAddress: attempt.ipAddress,
          userAgent: attempt.userAgent,
          userEmail: attempt.userEmail,
          userPhone: attempt.userPhone,
          timestamp: attempt.timestamp.toISOString()
        },
        !attempt.success // Require immediate action for failed attempts
      );

    } catch (error) {
      console.error('Error logging access attempt:', error);
    }
  }

  /**
   * Get access history for a payment reference
   */
  static getAccessHistory(paymentReference: string): DownloadAttempt[] {
    return this.downloadAttempts.get(paymentReference) || [];
  }

  /**
   * Get download statistics
   */
  static getDownloadStats(paymentReference: string): {
    totalAttempts: number;
    successfulDownloads: number;
    failedAttempts: number;
    uniqueIPs: number;
    lastAccess?: Date;
  } {
    const attempts = this.downloadAttempts.get(paymentReference) || [];
    const successfulDownloads = attempts.filter(a => a.success).length;
    const failedAttempts = attempts.filter(a => !a.success).length;
    const uniqueIPs = new Set(attempts.map(a => a.ipAddress)).size;
    const lastAccess = attempts.length > 0 ? attempts[attempts.length - 1].timestamp : undefined;

    return {
      totalAttempts: attempts.length,
      successfulDownloads,
      failedAttempts,
      uniqueIPs,
      lastAccess
    };
  }

  /**
   * Revoke access for a payment reference
   */
  static revokeAccess(paymentReference: string): void {
    // Clear download counts
    const keysToDelete = Array.from(this.downloadCounts.keys())
      .filter(key => key.startsWith(`${paymentReference}:`));

    keysToDelete.forEach(key => {
      this.downloadCounts.delete(key);
    });

    console.log(`Access revoked for payment reference: ${paymentReference}`);
  }

  /**
   * Clean up expired data
   */
  static cleanupExpiredData(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Clean up rate limit tracker
    for (const [ip, tracker] of this.rateLimitTracker.entries()) {
      if (tracker.resetTime < now) {
        this.rateLimitTracker.delete(ip);
      }
    }

    // Clean up old download attempts (keep only last 24 hours)
    for (const [ref, attempts] of this.downloadAttempts.entries()) {
      const recentAttempts = attempts.filter(a => a.timestamp.getTime() > oneHourAgo);
      if (recentAttempts.length === 0) {
        this.downloadAttempts.delete(ref);
      } else {
        this.downloadAttempts.set(ref, recentAttempts);
      }
    }

    console.log('Expired PDF security data cleaned up');
  }

  /**
   * Initialize security service
   */
  static initialize(): void {
    console.log('Initializing PDF Security Service...');

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000); // Every hour

    console.log('PDF Security Service initialized successfully');
  }

  /**
   * Validate payment reference format
   */
  static validatePaymentReference(paymentReference: string): boolean {
    // Basic validation - adjust pattern based on your payment reference format
    const pattern = /^[A-Z]{3,5}_[A-Z0-9]{6,12}$/;
    return pattern.test(paymentReference);
  }

  /**
   * Generate secure download link with user context
   */
  static generateUserSecureLink(
    paymentReference: string,
    userEmail: string,
    userPhone?: string,
    options?: Partial<SecureURLOptions>
  ): string {
    return this.generateSecureURL({
      paymentReference,
      userEmail,
      userPhone,
      expiresIn: options?.expiresIn || this.DEFAULT_EXPIRY,
      maxDownloads: options?.maxDownloads || this.MAX_DOWNLOADS_DEFAULT,
      allowedIPs: options?.allowedIPs || [],
      requireAuth: options?.requireAuth || false
    });
  }

  /**
   * Create time-limited link for WhatsApp delivery
   */
  static generateWhatsAppSecureLink(
    paymentReference: string,
    userPhone: string,
    expiresInHours: number = 48
  ): string {
    return this.generateSecureURL({
      paymentReference,
      userPhone,
      expiresIn: expiresInHours * 60 * 60, // Convert hours to seconds
      maxDownloads: 5, // Limited downloads for WhatsApp links
      requireAuth: false
    });
  }
}