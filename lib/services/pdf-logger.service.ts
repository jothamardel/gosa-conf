export interface PDFLogEvent {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: 'generation' | 'delivery' | 'download' | 'cache' | 'security';
  action: string;
  paymentReference?: string;
  userId?: string;
  userPhone?: string;
  serviceType?: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PDFMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageGenerationTime: number;
  averageDeliveryTime: number;
  errorRate: number;
  successRate: number;
  lastUpdated: Date;
}

export class PDFLoggerService {
  private static logs: PDFLogEvent[] = [];
  private static metrics: PDFMetrics = {
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageGenerationTime: 0,
    averageDeliveryTime: 0,
    errorRate: 0,
    successRate: 0,
    lastUpdated: new Date()
  };

  /**
   * Log a PDF operation event
   */
  static logEvent(event: Omit<PDFLogEvent, 'timestamp'>): void {
    const logEvent: PDFLogEvent = {
      ...event,
      timestamp: new Date()
    };

    // Add to in-memory logs (in production, this would go to a proper logging service)
    this.logs.push(logEvent);

    // Update metrics
    this.updateMetrics(logEvent);

    // Console logging with structured format
    this.writeToConsole(logEvent);

    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Log PDF generation start
   */
  static logGenerationStart(paymentReference: string, serviceType: string, userId?: string): void {
    this.logEvent({
      level: 'info',
      operation: 'generation',
      action: 'start',
      paymentReference,
      userId,
      serviceType,
      success: true,
      metadata: {
        stage: 'initialization'
      }
    });
  }

  /**
   * Log PDF generation success
   */
  static logGenerationSuccess(
    paymentReference: string,
    serviceType: string,
    duration: number,
    userId?: string
  ): void {
    this.logEvent({
      level: 'info',
      operation: 'generation',
      action: 'complete',
      paymentReference,
      userId,
      serviceType,
      duration,
      success: true,
      metadata: {
        stage: 'completed',
        performanceCategory: this.categorizePerformance(duration, 'generation')
      }
    });
  }

  /**
   * Log PDF generation failure
   */
  static logGenerationError(
    paymentReference: string,
    serviceType: string,
    error: string,
    duration?: number,
    userId?: string
  ): void {
    this.logEvent({
      level: 'error',
      operation: 'generation',
      action: 'failed',
      paymentReference,
      userId,
      serviceType,
      duration,
      success: false,
      error,
      metadata: {
        stage: 'failed',
        errorCategory: this.categorizeError(error)
      }
    });
  }

  /**
   * Log WhatsApp delivery start
   */
  static logDeliveryStart(
    paymentReference: string,
    serviceType: string,
    userPhone: string,
    userId?: string
  ): void {
    this.logEvent({
      level: 'info',
      operation: 'delivery',
      action: 'start',
      paymentReference,
      userId,
      userPhone: this.maskPhoneNumber(userPhone),
      serviceType,
      success: true,
      metadata: {
        stage: 'initialization',
        deliveryMethod: 'whatsapp_document'
      }
    });
  }

  /**
   * Log WhatsApp delivery success
   */
  static logDeliverySuccess(
    paymentReference: string,
    serviceType: string,
    userPhone: string,
    duration: number,
    deliveryMethod: 'document' | 'text_link',
    userId?: string
  ): void {
    this.logEvent({
      level: 'info',
      operation: 'delivery',
      action: 'complete',
      paymentReference,
      userId,
      userPhone: this.maskPhoneNumber(userPhone),
      serviceType,
      duration,
      success: true,
      metadata: {
        stage: 'completed',
        deliveryMethod: deliveryMethod === 'document' ? 'whatsapp_document' : 'whatsapp_text_link',
        performanceCategory: this.categorizePerformance(duration, 'delivery')
      }
    });
  }

  /**
   * Log WhatsApp delivery failure
   */
  static logDeliveryError(
    paymentReference: string,
    serviceType: string,
    userPhone: string,
    error: string,
    duration?: number,
    userId?: string
  ): void {
    this.logEvent({
      level: 'error',
      operation: 'delivery',
      action: 'failed',
      paymentReference,
      userId,
      userPhone: this.maskPhoneNumber(userPhone),
      serviceType,
      duration,
      success: false,
      error,
      metadata: {
        stage: 'failed',
        errorCategory: this.categorizeError(error),
        deliveryMethod: 'whatsapp_document'
      }
    });
  }

  /**
   * Log PDF download request
   */
  static logDownloadRequest(
    paymentReference: string,
    serviceType: string,
    format: 'pdf' | 'html',
    userAgent?: string,
    ipAddress?: string
  ): void {
    this.logEvent({
      level: 'info',
      operation: 'download',
      action: 'request',
      paymentReference,
      serviceType,
      success: true,
      metadata: {
        format,
        userAgent: userAgent ? this.truncateString(userAgent, 100) : undefined,
        ipAddress: ipAddress ? this.maskIpAddress(ipAddress) : undefined,
        stage: 'request_received'
      }
    });
  }

  /**
   * Log PDF download success
   */
  static logDownloadSuccess(
    paymentReference: string,
    serviceType: string,
    format: 'pdf' | 'html',
    duration: number,
    fileSize?: number
  ): void {
    this.logEvent({
      level: 'info',
      operation: 'download',
      action: 'complete',
      paymentReference,
      serviceType,
      duration,
      success: true,
      metadata: {
        format,
        fileSize,
        stage: 'completed',
        performanceCategory: this.categorizePerformance(duration, 'download')
      }
    });
  }

  /**
   * Log PDF download error
   */
  static logDownloadError(
    paymentReference: string,
    serviceType: string,
    format: 'pdf' | 'html',
    error: string,
    duration?: number
  ): void {
    this.logEvent({
      level: 'error',
      operation: 'download',
      action: 'failed',
      paymentReference,
      serviceType,
      duration,
      success: false,
      error,
      metadata: {
        format,
        stage: 'failed',
        errorCategory: this.categorizeError(error)
      }
    });
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    action: 'unauthorized_access' | 'invalid_reference' | 'rate_limit_exceeded',
    paymentReference?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.logEvent({
      level: 'warn',
      operation: 'security',
      action,
      paymentReference,
      success: false,
      metadata: {
        ipAddress: ipAddress ? this.maskIpAddress(ipAddress) : undefined,
        userAgent: userAgent ? this.truncateString(userAgent, 100) : undefined,
        securityLevel: action === 'unauthorized_access' ? 'high' : 'medium'
      }
    });
  }

  /**
   * Get current metrics
   */
  static getMetrics(): PDFMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent logs
   */
  static getRecentLogs(limit: number = 100): PDFLogEvent[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by operation type
   */
  static getLogsByOperation(operation: PDFLogEvent['operation'], limit: number = 50): PDFLogEvent[] {
    return this.logs
      .filter(log => log.operation === operation)
      .slice(-limit);
  }

  /**
   * Get error logs
   */
  static getErrorLogs(limit: number = 50): PDFLogEvent[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-limit);
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    generation: { fast: number; normal: number; slow: number };
    delivery: { fast: number; normal: number; slow: number };
    download: { fast: number; normal: number; slow: number };
  } {
    const stats = {
      generation: { fast: 0, normal: 0, slow: 0 },
      delivery: { fast: 0, normal: 0, slow: 0 },
      download: { fast: 0, normal: 0, slow: 0 }
    };

    this.logs.forEach(log => {
      if (log.success && log.duration && log.metadata?.performanceCategory) {
        const category = log.metadata.performanceCategory as 'fast' | 'normal' | 'slow';
        if (log.operation === 'generation' || log.operation === 'delivery' || log.operation === 'download') {
          stats[log.operation][category]++;
        }
      }
    });

    return stats;
  }

  /**
   * Clear old logs (for maintenance)
   */
  static clearOldLogs(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);

    return initialCount - this.logs.length;
  }

  /**
   * Update metrics based on log event
   */
  private static updateMetrics(event: PDFLogEvent): void {
    if (event.operation === 'generation') {
      this.metrics.totalGenerations++;
      if (event.success) {
        this.metrics.successfulGenerations++;
      } else {
        this.metrics.failedGenerations++;
      }

      if (event.duration) {
        this.metrics.averageGenerationTime = this.calculateMovingAverage(
          this.metrics.averageGenerationTime,
          event.duration,
          this.metrics.totalGenerations
        );
      }
    }

    if (event.operation === 'delivery') {
      this.metrics.totalDeliveries++;
      if (event.success) {
        this.metrics.successfulDeliveries++;
      } else {
        this.metrics.failedDeliveries++;
      }

      if (event.duration) {
        this.metrics.averageDeliveryTime = this.calculateMovingAverage(
          this.metrics.averageDeliveryTime,
          event.duration,
          this.metrics.totalDeliveries
        );
      }
    }

    // Calculate overall rates
    const totalOperations = this.metrics.totalGenerations + this.metrics.totalDeliveries;
    const totalSuccesses = this.metrics.successfulGenerations + this.metrics.successfulDeliveries;
    const totalFailures = this.metrics.failedGenerations + this.metrics.failedDeliveries;

    this.metrics.successRate = totalOperations > 0 ? (totalSuccesses / totalOperations) * 100 : 0;
    this.metrics.errorRate = totalOperations > 0 ? (totalFailures / totalOperations) * 100 : 0;
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Calculate moving average
   */
  private static calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * Categorize performance based on duration
   */
  private static categorizePerformance(duration: number, operation: string): 'fast' | 'normal' | 'slow' {
    const thresholds = {
      generation: { fast: 2000, slow: 5000 },
      delivery: { fast: 3000, slow: 8000 },
      download: { fast: 1000, slow: 3000 }
    };

    const threshold = thresholds[operation as keyof typeof thresholds] || thresholds.generation;

    if (duration < threshold.fast) return 'fast';
    if (duration > threshold.slow) return 'slow';
    return 'normal';
  }

  /**
   * Categorize error types
   */
  private static categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('network') || errorLower.includes('timeout')) return 'network';
    if (errorLower.includes('auth') || errorLower.includes('unauthorized')) return 'authentication';
    if (errorLower.includes('rate limit') || errorLower.includes('quota')) return 'rate_limiting';
    if (errorLower.includes('validation') || errorLower.includes('invalid')) return 'validation';
    if (errorLower.includes('memory') || errorLower.includes('resource')) return 'resource';
    if (errorLower.includes('qr') || errorLower.includes('generation')) return 'generation';

    return 'unknown';
  }

  /**
   * Mask phone number for privacy
   */
  private static maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 4) + '*'.repeat(phone.length - 8) + phone.substring(phone.length - 4);
  }

  /**
   * Mask IP address for privacy
   */
  private static maskIpAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.***`;
    }
    return ip.substring(0, Math.min(ip.length, 8)) + '*'.repeat(Math.max(0, ip.length - 8));
  }

  /**
   * Truncate string to specified length
   */
  private static truncateString(str: string, maxLength: number): string {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  /**
   * Write structured log to console
   */
  private static writeToConsole(event: PDFLogEvent): void {
    const logMessage = {
      timestamp: event.timestamp.toISOString(),
      level: event.level,
      operation: event.operation,
      action: event.action,
      success: event.success,
      paymentReference: event.paymentReference,
      serviceType: event.serviceType,
      duration: event.duration,
      error: event.error,
      metadata: event.metadata
    };

    switch (event.level) {
      case 'error':
        console.error('[PDF-ERROR]', JSON.stringify(logMessage));
        break;
      case 'warn':
        console.warn('[PDF-WARN]', JSON.stringify(logMessage));
        break;
      case 'debug':
        console.debug('[PDF-DEBUG]', JSON.stringify(logMessage));
        break;
      default:
        console.log('[PDF-INFO]', JSON.stringify(logMessage));
    }
  }
}