import { DeliveryResult } from './whatsapp-pdf.service';
import { WhatsAppPDFData } from '../utils/pdf-whatsapp.utils';
import { PDFErrorType } from './pdf-error-handler.service';
import { Wasender } from '../wasender-api';

export interface DeliveryMetrics {
  timestamp: string;
  paymentReference: string;
  operationType: string;
  userPhone: string;
  success: boolean;
  pdfGenerated: boolean;
  whatsappSent: boolean;
  fallbackUsed: boolean;
  retryAttempts: number;
  errorType?: PDFErrorType;
  processingTime: number;
  messageId?: string | number;
}

export interface ErrorAlert {
  level: 'warning' | 'error' | 'critical';
  service: string;
  event: string;
  message: string;
  context: Record<string, any>;
  timestamp: string;
  requiresImmedateAction: boolean;
}

export interface SystemHealth {
  pdfGenerationSuccess: number;
  whatsappDeliverySuccess: number;
  fallbackUsageRate: number;
  averageProcessingTime: number;
  errorRate: number;
  lastUpdated: string;
}

export class PDFMonitoringService {
  private static readonly METRICS_BUFFER: DeliveryMetrics[] = [];
  private static readonly ERROR_BUFFER: ErrorAlert[] = [];
  private static readonly MAX_BUFFER_SIZE = 1000;
  private static readonly FLUSH_INTERVAL = 60000; // 1 minute

  // Health thresholds
  private static readonly ERROR_RATE_THRESHOLD = 0.1; // 10%
  private static readonly PROCESSING_TIME_THRESHOLD = 30000; // 30 seconds
  private static readonly FALLBACK_RATE_THRESHOLD = 0.2; // 20%

  /**
   * Record delivery metrics
   */
  static async recordDeliveryMetrics(
    data: WhatsAppPDFData,
    result: DeliveryResult,
    processingTime: number
  ): Promise<void> {
    const metrics: DeliveryMetrics = {
      timestamp: new Date().toISOString(),
      paymentReference: data.operationDetails.paymentReference,
      operationType: data.operationDetails.type,
      userPhone: data.userDetails.phone,
      success: result.success,
      pdfGenerated: result.pdfGenerated,
      whatsappSent: result.whatsappSent,
      fallbackUsed: result.fallbackUsed || false,
      retryAttempts: result.retryAttempts || 0,
      errorType: result.errorType,
      processingTime,
      messageId: result.messageId
    };

    // Add to buffer
    this.METRICS_BUFFER.push(metrics);

    // Log immediately for debugging
    console.log('PDF_DELIVERY_METRICS:', JSON.stringify(metrics, null, 2));

    // Check for immediate alerts
    await this.checkForImmediateAlerts(metrics);

    // Flush buffer if needed
    if (this.METRICS_BUFFER.length >= this.MAX_BUFFER_SIZE) {
      await this.flushMetricsBuffer();
    }
  }

  /**
   * Record error for monitoring
   */
  static async recordError(
    level: ErrorAlert['level'],
    service: string,
    event: string,
    message: string,
    context: Record<string, any>,
    requiresImmedateAction: boolean = false
  ): Promise<void> {
    const alert: ErrorAlert = {
      level,
      service,
      event,
      message,
      context,
      timestamp: new Date().toISOString(),
      requiresImmedateAction
    };

    this.ERROR_BUFFER.push(alert);

    // Log immediately
    console.error(`PDF_ERROR_ALERT [${level.toUpperCase()}]:`, JSON.stringify(alert, null, 2));

    // Send immediate notification for critical errors
    if (level === 'critical' || requiresImmedateAction) {
      await this.sendImmediateAlert(alert);
    }

    // Flush buffer if needed
    if (this.ERROR_BUFFER.length >= this.MAX_BUFFER_SIZE) {
      await this.flushErrorBuffer();
    }
  }

  /**
   * Check for immediate alerts based on metrics
   */
  private static async checkForImmediateAlerts(metrics: DeliveryMetrics): Promise<void> {
    // Alert on processing time threshold
    if (metrics.processingTime > this.PROCESSING_TIME_THRESHOLD) {
      await this.recordError(
        'warning',
        'PDF_DELIVERY',
        'SLOW_PROCESSING',
        `PDF delivery took ${metrics.processingTime}ms (threshold: ${this.PROCESSING_TIME_THRESHOLD}ms)`,
        {
          paymentReference: metrics.paymentReference,
          processingTime: metrics.processingTime,
          operationType: metrics.operationType
        }
      );
    }

    // Alert on complete failure
    if (!metrics.success && !metrics.fallbackUsed) {
      await this.recordError(
        'critical',
        'PDF_DELIVERY',
        'COMPLETE_DELIVERY_FAILURE',
        'PDF delivery failed completely - no fallback successful',
        {
          paymentReference: metrics.paymentReference,
          operationType: metrics.operationType,
          userPhone: metrics.userPhone,
          errorType: metrics.errorType
        },
        true
      );
    }

    // Alert on high retry attempts
    if (metrics.retryAttempts >= 3) {
      await this.recordError(
        'warning',
        'PDF_DELIVERY',
        'HIGH_RETRY_COUNT',
        `PDF delivery required ${metrics.retryAttempts} retry attempts`,
        {
          paymentReference: metrics.paymentReference,
          retryAttempts: metrics.retryAttempts,
          operationType: metrics.operationType
        }
      );
    }
  }

  /**
   * Send immediate alert to administrators
   */
  private static async sendImmediateAlert(alert: ErrorAlert): Promise<void> {
    try {
      const adminPhones = this.getAdminPhoneNumbers();

      if (adminPhones.length === 0) {
        console.warn('No admin phone numbers configured for immediate alerts');
        return;
      }

      const alertMessage = this.formatAlertMessage(alert);

      for (const adminPhone of adminPhones) {
        try {
          await Wasender.httpSenderMessage({
            to: adminPhone,
            text: alertMessage
          });
          console.log(`Immediate alert sent to admin: ${adminPhone}`);
        } catch (error) {
          console.error(`Failed to send immediate alert to ${adminPhone}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to send immediate alert:', error);
    }
  }

  /**
   * Format alert message for administrators
   */
  private static formatAlertMessage(alert: ErrorAlert): string {
    const emoji = {
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    }[alert.level];

    let message = `${emoji} *PDF SYSTEM ALERT*\n\n`;
    message += `*Level:* ${alert.level.toUpperCase()}\n`;
    message += `*Service:* ${alert.service}\n`;
    message += `*Event:* ${alert.event}\n`;
    message += `*Message:* ${alert.message}\n`;
    message += `*Time:* ${new Date(alert.timestamp).toLocaleString()}\n`;

    if (alert.context.paymentReference) {
      message += `*Payment Ref:* ${alert.context.paymentReference}\n`;
    }

    if (alert.context.operationType) {
      message += `*Operation:* ${alert.context.operationType}\n`;
    }

    if (alert.context.userPhone) {
      message += `*User Phone:* ${alert.context.userPhone}\n`;
    }

    if (alert.requiresImmedateAction) {
      message += `\n🔥 *IMMEDIATE ACTION REQUIRED*`;
    }

    message += `\n\n*GOSA PDF Monitoring System*`;

    return message;
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000); // Last 24 hours

    if (recentMetrics.length === 0) {
      return {
        pdfGenerationSuccess: 0,
        whatsappDeliverySuccess: 0,
        fallbackUsageRate: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const totalRequests = recentMetrics.length;
    const successfulPdfGeneration = recentMetrics.filter(m => m.pdfGenerated).length;
    const successfulWhatsappDelivery = recentMetrics.filter(m => m.whatsappSent).length;
    const fallbackUsed = recentMetrics.filter(m => m.fallbackUsed).length;
    const totalProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0);
    const errors = recentMetrics.filter(m => !m.success).length;

    return {
      pdfGenerationSuccess: successfulPdfGeneration / totalRequests,
      whatsappDeliverySuccess: successfulWhatsappDelivery / totalRequests,
      fallbackUsageRate: fallbackUsed / totalRequests,
      averageProcessingTime: totalProcessingTime / totalRequests,
      errorRate: errors / totalRequests,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Check system health and send alerts if thresholds are exceeded
   */
  static async checkSystemHealth(): Promise<void> {
    const health = await this.getSystemHealth();

    // Check error rate threshold
    if (health.errorRate > this.ERROR_RATE_THRESHOLD) {
      await this.recordError(
        'error',
        'SYSTEM_HEALTH',
        'HIGH_ERROR_RATE',
        `System error rate is ${(health.errorRate * 100).toFixed(1)}% (threshold: ${(this.ERROR_RATE_THRESHOLD * 100)}%)`,
        { errorRate: health.errorRate, threshold: this.ERROR_RATE_THRESHOLD }
      );
    }

    // Check fallback usage rate
    if (health.fallbackUsageRate > this.FALLBACK_RATE_THRESHOLD) {
      await this.recordError(
        'warning',
        'SYSTEM_HEALTH',
        'HIGH_FALLBACK_USAGE',
        `Fallback usage rate is ${(health.fallbackUsageRate * 100).toFixed(1)}% (threshold: ${(this.FALLBACK_RATE_THRESHOLD * 100)}%)`,
        { fallbackRate: health.fallbackUsageRate, threshold: this.FALLBACK_RATE_THRESHOLD }
      );
    }

    // Check average processing time
    if (health.averageProcessingTime > this.PROCESSING_TIME_THRESHOLD) {
      await this.recordError(
        'warning',
        'SYSTEM_HEALTH',
        'SLOW_AVERAGE_PROCESSING',
        `Average processing time is ${health.averageProcessingTime}ms (threshold: ${this.PROCESSING_TIME_THRESHOLD}ms)`,
        { averageTime: health.averageProcessingTime, threshold: this.PROCESSING_TIME_THRESHOLD }
      );
    }
  }

  /**
   * Get recent metrics within time window
   */
  private static getRecentMetrics(timeWindowMs: number): DeliveryMetrics[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.METRICS_BUFFER.filter(metric =>
      new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Flush metrics buffer to persistent storage
   */
  private static async flushMetricsBuffer(): Promise<void> {
    if (this.METRICS_BUFFER.length === 0) return;

    try {
      // In production, send to monitoring service (DataDog, New Relic, etc.)
      console.log(`Flushing ${this.METRICS_BUFFER.length} metrics to monitoring service`);

      // For now, just log the summary
      const summary = this.createMetricsSummary(this.METRICS_BUFFER);
      console.log('METRICS_SUMMARY:', JSON.stringify(summary, null, 2));

      // Clear buffer
      this.METRICS_BUFFER.length = 0;
    } catch (error) {
      console.error('Failed to flush metrics buffer:', error);
    }
  }

  /**
   * Flush error buffer to persistent storage
   */
  private static async flushErrorBuffer(): Promise<void> {
    if (this.ERROR_BUFFER.length === 0) return;

    try {
      // In production, send to error tracking service (Sentry, Bugsnag, etc.)
      console.log(`Flushing ${this.ERROR_BUFFER.length} errors to error tracking service`);

      // For now, just log the errors
      this.ERROR_BUFFER.forEach(error => {
        console.error('BUFFERED_ERROR:', JSON.stringify(error, null, 2));
      });

      // Clear buffer
      this.ERROR_BUFFER.length = 0;
    } catch (error) {
      console.error('Failed to flush error buffer:', error);
    }
  }

  /**
   * Create metrics summary
   */
  private static createMetricsSummary(metrics: DeliveryMetrics[]): Record<string, any> {
    const total = metrics.length;
    const successful = metrics.filter(m => m.success).length;
    const pdfGenerated = metrics.filter(m => m.pdfGenerated).length;
    const whatsappSent = metrics.filter(m => m.whatsappSent).length;
    const fallbackUsed = metrics.filter(m => m.fallbackUsed).length;

    const processingTimes = metrics.map(m => m.processingTime);
    const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / total;
    const maxProcessingTime = Math.max(...processingTimes);
    const minProcessingTime = Math.min(...processingTimes);

    const operationTypes = metrics.reduce((acc, m) => {
      acc[m.operationType] = (acc[m.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      period: {
        start: metrics[0]?.timestamp,
        end: metrics[metrics.length - 1]?.timestamp,
        totalRequests: total
      },
      success: {
        overall: successful / total,
        pdfGeneration: pdfGenerated / total,
        whatsappDelivery: whatsappSent / total,
        fallbackUsage: fallbackUsed / total
      },
      performance: {
        averageProcessingTime: Math.round(avgProcessingTime),
        maxProcessingTime,
        minProcessingTime
      },
      breakdown: {
        byOperationType: operationTypes
      }
    };
  }

  /**
   * Get admin phone numbers for alerts
   */
  private static getAdminPhoneNumbers(): string[] {
    const adminPhones = process.env.ADMIN_PHONE_NUMBERS;
    if (!adminPhones) {
      return [];
    }
    return adminPhones.split(',').map(phone => phone.trim());
  }

  /**
   * Initialize monitoring service
   */
  static initialize(): void {
    console.log('Initializing PDF Monitoring Service...');

    // Set up periodic health checks
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        console.error('Error during system health check:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Set up periodic buffer flushing
    setInterval(async () => {
      try {
        await this.flushMetricsBuffer();
        await this.flushErrorBuffer();
      } catch (error) {
        console.error('Error during buffer flush:', error);
      }
    }, this.FLUSH_INTERVAL);

    console.log('PDF Monitoring Service initialized successfully');
  }

  /**
   * Generate monitoring report
   */
  static async generateReport(timeWindowHours: number = 24): Promise<string> {
    const health = await this.getSystemHealth();
    const recentMetrics = this.getRecentMetrics(timeWindowHours * 60 * 60 * 1000);
    const recentErrors = this.ERROR_BUFFER.filter(error =>
      new Date(error.timestamp).getTime() > Date.now() - (timeWindowHours * 60 * 60 * 1000)
    );

    let report = `📊 *PDF Delivery System Report*\n`;
    report += `*Period:* Last ${timeWindowHours} hours\n`;
    report += `*Generated:* ${new Date().toLocaleString()}\n\n`;

    report += `📈 *System Health:*\n`;
    report += `• PDF Generation Success: ${(health.pdfGenerationSuccess * 100).toFixed(1)}%\n`;
    report += `• WhatsApp Delivery Success: ${(health.whatsappDeliverySuccess * 100).toFixed(1)}%\n`;
    report += `• Fallback Usage Rate: ${(health.fallbackUsageRate * 100).toFixed(1)}%\n`;
    report += `• Average Processing Time: ${Math.round(health.averageProcessingTime)}ms\n`;
    report += `• Error Rate: ${(health.errorRate * 100).toFixed(1)}%\n\n`;

    report += `📊 *Activity Summary:*\n`;
    report += `• Total Requests: ${recentMetrics.length}\n`;
    report += `• Successful Deliveries: ${recentMetrics.filter(m => m.success).length}\n`;
    report += `• Failed Deliveries: ${recentMetrics.filter(m => !m.success).length}\n`;
    report += `• Fallback Used: ${recentMetrics.filter(m => m.fallbackUsed).length}\n\n`;

    if (recentErrors.length > 0) {
      report += `⚠️ *Recent Errors:*\n`;
      const errorSummary = recentErrors.reduce((acc, error) => {
        const key = `${error.level}: ${error.event}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(errorSummary).forEach(([error, count]) => {
        report += `• ${error}: ${count}\n`;
      });
    }

    return report;
  }

  /**
   * Record blob storage operation metrics
   */
  static async recordBlobOperation(
    operation: 'upload' | 'download' | 'delete',
    success: boolean,
    fileSize?: number,
    processingTime?: number,
    error?: string,
    context?: Record<string, any>
  ): Promise<void> {
    const blobMetrics = {
      timestamp: new Date().toISOString(),
      operation,
      success,
      fileSize: fileSize || 0,
      processingTime: processingTime || 0,
      error,
      context: context || {}
    };

    console.log('[BLOB-METRICS]', blobMetrics);

    // Record error if operation failed
    if (!success && error) {
      await this.recordError(
        'error',
        'BLOB_STORAGE',
        `BLOB_${operation.toUpperCase()}_FAILED`,
        `Blob ${operation} operation failed: ${error}`,
        {
          ...context,
          operation,
          fileSize,
          processingTime,
          error
        },
        operation === 'upload' // Upload failures require immediate attention
      );
    }

    // Alert on large file sizes (>10MB)
    if (fileSize && fileSize > 10 * 1024 * 1024) {
      await this.recordError(
        'warning',
        'BLOB_STORAGE',
        'LARGE_FILE_UPLOAD',
        `Large file uploaded to blob storage: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        {
          ...context,
          operation,
          fileSize,
          fileSizeMB: (fileSize / 1024 / 1024).toFixed(2)
        }
      );
    }

    // Alert on slow blob operations (>10 seconds)
    if (processingTime && processingTime > 10000) {
      await this.recordError(
        'warning',
        'BLOB_STORAGE',
        'SLOW_BLOB_OPERATION',
        `Slow blob ${operation} operation: ${processingTime}ms`,
        {
          ...context,
          operation,
          processingTime,
          threshold: 10000
        }
      );
    }
  }

  /**
   * Monitor blob storage usage and costs
   */
  static async monitorBlobStorageUsage(): Promise<{
    totalFiles: number;
    totalSize: number;
    estimatedCost: number;
    lastUpdated: string;
  }> {
    try {
      // In a real implementation, this would query Vercel Blob API for usage stats
      // For now, we'll return mock data and log the monitoring attempt

      console.log('[BLOB-MONITORING] Checking blob storage usage...');

      const mockUsage = {
        totalFiles: 0,
        totalSize: 0,
        estimatedCost: 0,
        lastUpdated: new Date().toISOString()
      };

      // Log usage for monitoring
      console.log('[BLOB-USAGE]', mockUsage);

      return mockUsage;
    } catch (error) {
      console.error('Failed to monitor blob storage usage:', error);

      await this.recordError(
        'error',
        'BLOB_STORAGE',
        'USAGE_MONITORING_FAILED',
        `Failed to monitor blob storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      );

      return {
        totalFiles: -1,
        totalSize: -1,
        estimatedCost: -1,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get blob storage health metrics
   */
  static getBlobStorageHealth(): {
    configured: boolean;
    operational: boolean;
    lastCheck: string;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if blob storage is configured
    const configured = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (!configured) {
      issues.push('BLOB_READ_WRITE_TOKEN not configured');
    }

    // For now, assume operational if configured
    const operational = configured;

    const health = {
      configured,
      operational,
      lastCheck: new Date().toISOString(),
      issues
    };

    console.log('[BLOB-HEALTH]', health);
    return health;
  }

  /**
   * Record blob storage cost alert
   */
  static async recordBlobCostAlert(
    currentCost: number,
    threshold: number,
    context?: Record<string, any>
  ): Promise<void> {
    await this.recordError(
      'warning',
      'BLOB_STORAGE',
      'COST_THRESHOLD_EXCEEDED',
      `Blob storage cost (${currentCost}) exceeded threshold (${threshold})`,
      {
        currentCost,
        threshold,
        percentageOver: ((currentCost - threshold) / threshold * 100).toFixed(2),
        ...context
      },
      currentCost > threshold * 1.5 // Require immediate action if 50% over threshold
    );
  }
}