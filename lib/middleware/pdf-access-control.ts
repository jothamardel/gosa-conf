import { NextRequest, NextResponse } from 'next/server';
import { PDFSecurityService } from '../services/pdf-security.service';
import { PDFMonitoringService } from '../services/pdf-monitoring.service';

export interface AccessControlOptions {
  requireSecureToken?: boolean;
  allowBasicAccess?: boolean;
  maxRequestsPerMinute?: number;
  blockSuspiciousIPs?: boolean;
  logAllAccess?: boolean;
}

export class PDFAccessControlMiddleware {
  private static readonly DEFAULT_OPTIONS: AccessControlOptions = {
    requireSecureToken: false,
    allowBasicAccess: true,
    maxRequestsPerMinute: 10,
    blockSuspiciousIPs: true,
    logAllAccess: true
  };

  private static suspiciousIPs: Set<string> = new Set();
  private static blockedIPs: Map<string, number> = new Map(); // IP -> unblock timestamp

  /**
   * Main access control middleware
   */
  static async checkAccess(
    request: NextRequest,
    options: AccessControlOptions = {}
  ): Promise<NextResponse | null> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const path = request.nextUrl.pathname;

    try {
      // Check if IP is blocked
      if (this.isIPBlocked(clientIP)) {
        await this.logSecurityEvent('IP_BLOCKED', {
          ipAddress: clientIP,
          userAgent,
          path,
          reason: 'IP temporarily blocked due to suspicious activity'
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Access temporarily restricted',
            code: 'IP_BLOCKED'
          },
          { status: 403 }
        );
      }

      // Check for suspicious patterns
      if (config.blockSuspiciousIPs && this.isSuspiciousRequest(request)) {
        this.markIPAsSuspicious(clientIP);

        await this.logSecurityEvent('SUSPICIOUS_REQUEST', {
          ipAddress: clientIP,
          userAgent,
          path,
          reason: 'Request pattern flagged as suspicious'
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Request blocked due to suspicious activity',
            code: 'SUSPICIOUS_ACTIVITY'
          },
          { status: 403 }
        );
      }

      // Rate limiting check
      if (config.maxRequestsPerMinute) {
        const rateLimitResult = PDFSecurityService['checkRateLimit'](clientIP);
        if (!rateLimitResult.allowed) {
          await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            ipAddress: clientIP,
            userAgent,
            path,
            resetIn: rateLimitResult.resetIn
          });

          return NextResponse.json(
            {
              success: false,
              error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds`,
              code: 'RATE_LIMIT_EXCEEDED'
            },
            { status: 429 }
          );
        }
      }

      // Log access if enabled
      if (config.logAllAccess) {
        await this.logSecurityEvent('ACCESS_ATTEMPT', {
          ipAddress: clientIP,
          userAgent,
          path,
          allowed: true
        });
      }

      // Access allowed
      return null;

    } catch (error) {
      console.error('Error in PDF access control middleware:', error);

      await this.logSecurityEvent('MIDDLEWARE_ERROR', {
        ipAddress: clientIP,
        userAgent,
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Allow access on middleware error to prevent service disruption
      return null;
    }
  }

  /**
   * Check if request appears suspicious
   */
  private static isSuspiciousRequest(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const clientIP = this.getClientIP(request);

    // Check for bot-like user agents
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      return true;
    }

    // Check for missing or suspicious user agent
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    // Check for suspicious referers
    if (referer && !this.isValidReferer(referer)) {
      return true;
    }

    // Check if IP is already marked as suspicious
    if (this.suspiciousIPs.has(clientIP)) {
      return true;
    }

    return false;
  }

  /**
   * Validate referer header
   */
  private static isValidReferer(referer: string): boolean {
    try {
      const url = new URL(referer);
      const allowedDomains = [
        process.env.NEXTAUTH_URL,
        'localhost',
        '127.0.0.1'
      ].filter(Boolean);

      return allowedDomains.some(domain =>
        url.hostname.includes(domain as string) ||
        (domain as string).includes(url.hostname)
      );
    } catch {
      return false;
    }
  }

  /**
   * Mark IP as suspicious
   */
  private static markIPAsSuspicious(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);

    // Block IP for 1 hour
    const unblockTime = Date.now() + (60 * 60 * 1000);
    this.blockedIPs.set(ipAddress, unblockTime);

    console.log(`IP ${ipAddress} marked as suspicious and temporarily blocked`);
  }

  /**
   * Check if IP is currently blocked
   */
  private static isIPBlocked(ipAddress: string): boolean {
    const unblockTime = this.blockedIPs.get(ipAddress);
    if (!unblockTime) {
      return false;
    }

    if (Date.now() > unblockTime) {
      // Unblock IP
      this.blockedIPs.delete(ipAddress);
      this.suspiciousIPs.delete(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
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

    return request.ip || 'unknown';
  }

  /**
   * Log security events
   */
  private static async logSecurityEvent(
    event: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_ACCESS_CONTROL',
        event,
        `PDF access control event: ${event}`,
        {
          ...details,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    suspiciousIPs: number;
    blockedIPs: number;
    totalBlocked: number;
  } {
    return {
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size,
      totalBlocked: this.suspiciousIPs.size
    };
  }

  /**
   * Manually block an IP address
   */
  static blockIP(ipAddress: string, durationHours: number = 24): void {
    const unblockTime = Date.now() + (durationHours * 60 * 60 * 1000);
    this.blockedIPs.set(ipAddress, unblockTime);
    this.suspiciousIPs.add(ipAddress);

    console.log(`IP ${ipAddress} manually blocked for ${durationHours} hours`);
  }

  /**
   * Manually unblock an IP address
   */
  static unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    this.suspiciousIPs.delete(ipAddress);

    console.log(`IP ${ipAddress} manually unblocked`);
  }

  /**
   * Clean up expired blocks
   */
  static cleanupExpiredBlocks(): void {
    const now = Date.now();

    const ipsToUnblock: string[] = [];
    this.blockedIPs.forEach((unblockTime, ip) => {
      if (now > unblockTime) {
        ipsToUnblock.push(ip);
      }
    });

    ipsToUnblock.forEach(ip => {
      this.blockedIPs.delete(ip);
      this.suspiciousIPs.delete(ip);
    });
  }

  /**
   * Initialize middleware
   */
  static initialize(): void {
    console.log('Initializing PDF Access Control Middleware...');

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60 * 60 * 1000); // Every hour

    console.log('PDF Access Control Middleware initialized successfully');
  }
}