import { PDFLoggerService } from './pdf-logger.service';

export interface PerformanceMetrics {
  operationCounts: {
    generation: number;
    delivery: number;
    download: number;
    cache: number;
  };
  averageResponseTimes: {
    generation: number;
    delivery: number;
    download: number;
  };
  successRates: {
    generation: number;
    delivery: number;
    download: number;
    overall: number;
  };
  errorRates: {
    generation: number;
    delivery: number;
    download: number;
    overall: number;
  };
  performanceDistribution: {
    generation: { fast: number; normal: number; slow: number };
    delivery: { fast: number; normal: number; slow: number };
    download: { fast: number; normal: number; slow: number };
  };
  timeRanges: {
    last1Hour: PerformanceSummary;
    last24Hours: PerformanceSummary;
    last7Days: PerformanceSummary;
  };
}

export interface PerformanceSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface PerformanceAlert {
  type: 'high_error_rate' | 'slow_response_time' | 'high_volume' | 'service_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  operation?: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PDFPerformanceMonitorService {
  private static alerts: PerformanceAlert[] = [];
  private static readonly ALERT_THRESHOLDS = {
    errorRate: {
      low: 5,      // 5%
      medium: 10,  // 10%
      high: 20,    // 20%
      critical: 30 // 30%
    },
    responseTime: {
      generation: {
        normal: 3000,   // 3 seconds
        slow: 5000,     // 5 seconds
        critical: 10000 // 10 seconds
      },
      delivery: {
        normal: 5000,   // 5 seconds
        slow: 10000,    // 10 seconds
        critical: 20000 // 20 seconds
      },
      download: {
        normal: 2000,   // 2 seconds
        slow: 5000,     // 5 seconds
        critical: 10000 // 10 seconds
      }
    },
    volume: {
      hourly: 1000,   // Operations per hour
      daily: 10000    // Operations per day
    }
  };

  /**
   * Get comprehensive performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    const logs = PDFLoggerService.getRecentLogs(5000);
    const performanceStats = PDFLoggerService.getPerformanceStats();
    const metrics = PDFLoggerService.getMetrics();

    return {
      operationCounts: {
        generation: metrics.totalGenerations,
        delivery: metrics.totalDeliveries,
        download: this.countOperations(logs, 'download'),
        cache: this.countOperations(logs, 'cache')
      },
      averageResponseTimes: {
        generation: metrics.averageGenerationTime,
        delivery: metrics.averageDeliveryTime,
        download: this.calculateAverageResponseTime(logs, 'download')
      },
      successRates: {
        generation: metrics.totalGenerations > 0 ? (metrics.successfulGenerations / metrics.totalGenerations) * 100 : 0,
        delivery: metrics.totalDeliveries > 0 ? (metrics.successfulDeliveries / metrics.totalDeliveries) * 100 : 0,
        download: this.calculateSuccessRate(logs, 'download'),
        overall: metrics.successRate
      },
      errorRates: {
        generation: metrics.totalGenerations > 0 ? (metrics.failedGenerations / metrics.totalGenerations) * 100 : 0,
        delivery: metrics.totalDeliveries > 0 ? (metrics.failedDeliveries / metrics.totalDeliveries) * 100 : 0,
        download: this.calculateErrorRate(logs, 'download'),
        overall: metrics.errorRate
      },
      performanceDistribution: performanceStats,
      timeRanges: {
        last1Hour: this.getPerformanceSummary(logs, 1),
        last24Hours: this.getPerformanceSummary(logs, 24),
        last7Days: this.getPerformanceSummary(logs, 24 * 7)
      }
    };
  }

  /**
   * Check for performance issues and generate alerts
   */
  static checkPerformanceAlerts(): PerformanceAlert[] {
    const metrics = this.getPerformanceMetrics();
    const newAlerts: PerformanceAlert[] = [];

    // Check error rates
    this.checkErrorRateAlerts(metrics, newAlerts);

    // Check response times
    this.checkResponseTimeAlerts(metrics, newAlerts);

    // Check volume alerts
    this.checkVolumeAlerts(metrics, newAlerts);

    // Check service degradation
    this.checkServiceDegradationAlerts(metrics, newAlerts);

    // Store new alerts
    this.alerts.push(...newAlerts);

    // Keep only recent alerts (last 24 hours)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);

    return newAlerts;
  }

  /**
   * Get recent alerts
   */
  static getRecentAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return this.alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Get system health status
   */
  static getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const recentAlerts = this.getRecentAlerts(1); // Last hour

    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rates
    if (metrics.errorRates.overall > this.ALERT_THRESHOLDS.errorRate.critical) {
      score -= 40;
      issues.push(`Critical error rate: ${metrics.errorRates.overall.toFixed(1)}%`);
      recommendations.push('Investigate and fix critical errors immediately');
    } else if (metrics.errorRates.overall > this.ALERT_THRESHOLDS.errorRate.high) {
      score -= 25;
      issues.push(`High error rate: ${metrics.errorRates.overall.toFixed(1)}%`);
      recommendations.push('Review error logs and implement fixes');
    } else if (metrics.errorRates.overall > this.ALERT_THRESHOLDS.errorRate.medium) {
      score -= 15;
      issues.push(`Elevated error rate: ${metrics.errorRates.overall.toFixed(1)}%`);
      recommendations.push('Monitor error trends and optimize error handling');
    }

    // Check response times
    if (metrics.averageResponseTimes.generation > this.ALERT_THRESHOLDS.responseTime.generation.critical) {
      score -= 30;
      issues.push(`Critical PDF generation time: ${metrics.averageResponseTimes.generation}ms`);
      recommendations.push('Optimize PDF generation process and check server resources');
    } else if (metrics.averageResponseTimes.generation > this.ALERT_THRESHOLDS.responseTime.generation.slow) {
      score -= 15;
      issues.push(`Slow PDF generation: ${metrics.averageResponseTimes.generation}ms`);
      recommendations.push('Review PDF generation performance and caching');
    }

    if (metrics.averageResponseTimes.delivery > this.ALERT_THRESHOLDS.responseTime.delivery.critical) {
      score -= 25;
      issues.push(`Critical delivery time: ${metrics.averageResponseTimes.delivery}ms`);
      recommendations.push('Check WhatsApp API performance and network connectivity');
    } else if (metrics.averageResponseTimes.delivery > this.ALERT_THRESHOLDS.responseTime.delivery.slow) {
      score -= 10;
      issues.push(`Slow delivery time: ${metrics.averageResponseTimes.delivery}ms`);
      recommendations.push('Monitor WhatsApp API performance');
    }

    // Check recent alerts
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical').length;
    const highAlerts = recentAlerts.filter(alert => alert.severity === 'high').length;

    if (criticalAlerts > 0) {
      score -= criticalAlerts * 20;
      issues.push(`${criticalAlerts} critical alert(s) in the last hour`);
      recommendations.push('Address critical alerts immediately');
    }

    if (highAlerts > 2) {
      score -= (highAlerts - 2) * 10;
      issues.push(`${highAlerts} high-priority alerts in the last hour`);
      recommendations.push('Review and address high-priority alerts');
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    if (score >= 90) {
      status = 'healthy';
    } else if (score >= 70) {
      status = 'degraded';
    } else if (score >= 50) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Get performance trends
   */
  static getPerformanceTrends(): {
    errorRateTrend: 'improving' | 'stable' | 'degrading';
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    volumeTrend: 'increasing' | 'stable' | 'decreasing';
    overallTrend: 'improving' | 'stable' | 'degrading';
  } {
    const metrics = this.getPerformanceMetrics();

    // Compare last hour vs last 24 hours
    const hourlyErrorRate = metrics.timeRanges.last1Hour.errorRate;
    const dailyErrorRate = metrics.timeRanges.last24Hours.errorRate;

    const hourlyResponseTime = metrics.timeRanges.last1Hour.averageResponseTime;
    const dailyResponseTime = metrics.timeRanges.last24Hours.averageResponseTime;

    const hourlyVolume = metrics.timeRanges.last1Hour.totalOperations;
    const dailyVolume = metrics.timeRanges.last24Hours.totalOperations / 24; // Average per hour

    return {
      errorRateTrend: this.calculateTrend(hourlyErrorRate, dailyErrorRate, 2),
      responseTimeTrend: this.calculateTrend(hourlyResponseTime, dailyResponseTime, 500),
      volumeTrend: this.calculateTrend(hourlyVolume, dailyVolume, 10),
      overallTrend: this.calculateOverallTrend(metrics)
    };
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(): {
    summary: string;
    metrics: PerformanceMetrics;
    health: ReturnType<typeof PDFPerformanceMonitorService.getHealthStatus>;
    trends: ReturnType<typeof PDFPerformanceMonitorService.getPerformanceTrends>;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const health = this.getHealthStatus();
    const trends = this.getPerformanceTrends();
    const alerts = this.getRecentAlerts(24);

    const summary = this.generateSummaryText(metrics, health, trends);
    const recommendations = this.generateRecommendations(metrics, health, trends);

    return {
      summary,
      metrics,
      health,
      trends,
      alerts,
      recommendations
    };
  }

  // Private helper methods

  private static countOperations(logs: any[], operation: string): number {
    return logs.filter(log => log.operation === operation).length;
  }

  private static calculateAverageResponseTime(logs: any[], operation: string): number {
    const operationLogs = logs.filter(log => log.operation === operation && log.duration);
    if (operationLogs.length === 0) return 0;

    const totalTime = operationLogs.reduce((sum, log) => sum + log.duration, 0);
    return totalTime / operationLogs.length;
  }

  private static calculateSuccessRate(logs: any[], operation: string): number {
    const operationLogs = logs.filter(log => log.operation === operation);
    if (operationLogs.length === 0) return 0;

    const successfulLogs = operationLogs.filter(log => log.success);
    return (successfulLogs.length / operationLogs.length) * 100;
  }

  private static calculateErrorRate(logs: any[], operation: string): number {
    return 100 - this.calculateSuccessRate(logs, operation);
  }

  private static getPerformanceSummary(logs: any[], hours: number): PerformanceSummary {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const recentLogs = logs.filter(log => new Date(log.timestamp) > cutoffTime);
    const successfulLogs = recentLogs.filter(log => log.success);
    const failedLogs = recentLogs.filter(log => !log.success);

    const logsWithDuration = recentLogs.filter(log => log.duration);
    const averageResponseTime = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum, log) => sum + log.duration, 0) / logsWithDuration.length
      : 0;

    return {
      totalOperations: recentLogs.length,
      successfulOperations: successfulLogs.length,
      failedOperations: failedLogs.length,
      averageResponseTime,
      errorRate: recentLogs.length > 0 ? (failedLogs.length / recentLogs.length) * 100 : 0
    };
  }

  private static checkErrorRateAlerts(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    const operations = ['generation', 'delivery', 'download'] as const;

    operations.forEach(operation => {
      const errorRate = metrics.errorRates[operation];

      if (errorRate > this.ALERT_THRESHOLDS.errorRate.critical) {
        alerts.push({
          type: 'high_error_rate',
          severity: 'critical',
          message: `Critical error rate for ${operation}: ${errorRate.toFixed(1)}%`,
          operation,
          threshold: this.ALERT_THRESHOLDS.errorRate.critical,
          currentValue: errorRate,
          timestamp: new Date()
        });
      } else if (errorRate > this.ALERT_THRESHOLDS.errorRate.high) {
        alerts.push({
          type: 'high_error_rate',
          severity: 'high',
          message: `High error rate for ${operation}: ${errorRate.toFixed(1)}%`,
          operation,
          threshold: this.ALERT_THRESHOLDS.errorRate.high,
          currentValue: errorRate,
          timestamp: new Date()
        });
      }
    });
  }

  private static checkResponseTimeAlerts(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    const operations = ['generation', 'delivery', 'download'] as const;

    operations.forEach(operation => {
      const responseTime = metrics.averageResponseTimes[operation];
      const thresholds = this.ALERT_THRESHOLDS.responseTime[operation];

      if (responseTime > thresholds.critical) {
        alerts.push({
          type: 'slow_response_time',
          severity: 'critical',
          message: `Critical response time for ${operation}: ${responseTime}ms`,
          operation,
          threshold: thresholds.critical,
          currentValue: responseTime,
          timestamp: new Date()
        });
      } else if (responseTime > thresholds.slow) {
        alerts.push({
          type: 'slow_response_time',
          severity: 'high',
          message: `Slow response time for ${operation}: ${responseTime}ms`,
          operation,
          threshold: thresholds.slow,
          currentValue: responseTime,
          timestamp: new Date()
        });
      }
    });
  }

  private static checkVolumeAlerts(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    const hourlyVolume = metrics.timeRanges.last1Hour.totalOperations;
    const dailyVolume = metrics.timeRanges.last24Hours.totalOperations;

    if (hourlyVolume > this.ALERT_THRESHOLDS.volume.hourly) {
      alerts.push({
        type: 'high_volume',
        severity: 'medium',
        message: `High volume in last hour: ${hourlyVolume} operations`,
        threshold: this.ALERT_THRESHOLDS.volume.hourly,
        currentValue: hourlyVolume,
        timestamp: new Date()
      });
    }

    if (dailyVolume > this.ALERT_THRESHOLDS.volume.daily) {
      alerts.push({
        type: 'high_volume',
        severity: 'high',
        message: `High volume in last 24 hours: ${dailyVolume} operations`,
        threshold: this.ALERT_THRESHOLDS.volume.daily,
        currentValue: dailyVolume,
        timestamp: new Date()
      });
    }
  }

  private static checkServiceDegradationAlerts(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): void {
    const hourlyMetrics = metrics.timeRanges.last1Hour;
    const dailyMetrics = metrics.timeRanges.last24Hours;

    // Check if recent performance is significantly worse than daily average
    if (hourlyMetrics.errorRate > dailyMetrics.errorRate * 2 && hourlyMetrics.errorRate > 10) {
      alerts.push({
        type: 'service_degradation',
        severity: 'high',
        message: `Service degradation detected: Error rate increased from ${dailyMetrics.errorRate.toFixed(1)}% to ${hourlyMetrics.errorRate.toFixed(1)}%`,
        threshold: dailyMetrics.errorRate * 2,
        currentValue: hourlyMetrics.errorRate,
        timestamp: new Date()
      });
    }

    if (hourlyMetrics.averageResponseTime > dailyMetrics.averageResponseTime * 1.5 && hourlyMetrics.averageResponseTime > 5000) {
      alerts.push({
        type: 'service_degradation',
        severity: 'medium',
        message: `Performance degradation: Response time increased from ${dailyMetrics.averageResponseTime}ms to ${hourlyMetrics.averageResponseTime}ms`,
        threshold: dailyMetrics.averageResponseTime * 1.5,
        currentValue: hourlyMetrics.averageResponseTime,
        timestamp: new Date()
      });
    }
  }

  private static calculateTrend(current: number, baseline: number, threshold: number): 'improving' | 'stable' | 'degrading' {
    const difference = current - baseline;
    const percentageChange = baseline > 0 ? (difference / baseline) * 100 : 0;

    if (Math.abs(percentageChange) < 10) return 'stable';
    return percentageChange > 0 ? 'degrading' : 'improving';
  }

  private static calculateOverallTrend(metrics: PerformanceMetrics): 'improving' | 'stable' | 'degrading' {
    const hourly = metrics.timeRanges.last1Hour;
    const daily = metrics.timeRanges.last24Hours;

    let score = 0;

    // Error rate trend (lower is better)
    if (hourly.errorRate < daily.errorRate) score += 1;
    else if (hourly.errorRate > daily.errorRate) score -= 1;

    // Response time trend (lower is better)
    if (hourly.averageResponseTime < daily.averageResponseTime) score += 1;
    else if (hourly.averageResponseTime > daily.averageResponseTime) score -= 1;

    if (score > 0) return 'improving';
    if (score < 0) return 'degrading';
    return 'stable';
  }

  private static generateSummaryText(
    metrics: PerformanceMetrics,
    health: ReturnType<typeof PDFPerformanceMonitorService.getHealthStatus>,
    trends: ReturnType<typeof PDFPerformanceMonitorService.getPerformanceTrends>
  ): string {
    const totalOps = metrics.operationCounts.generation + metrics.operationCounts.delivery + metrics.operationCounts.download;

    return `System Health: ${health.status.toUpperCase()} (Score: ${health.score}/100)
Total Operations: ${totalOps.toLocaleString()}
Overall Success Rate: ${metrics.successRates.overall.toFixed(1)}%
Overall Error Rate: ${metrics.errorRates.overall.toFixed(1)}%
Average Response Times: Generation ${metrics.averageResponseTimes.generation}ms, Delivery ${metrics.averageResponseTimes.delivery}ms
Trends: Error Rate ${trends.errorRateTrend}, Response Time ${trends.responseTimeTrend}, Volume ${trends.volumeTrend}`;
  }

  private static generateRecommendations(
    metrics: PerformanceMetrics,
    health: ReturnType<typeof PDFPerformanceMonitorService.getHealthStatus>,
    trends: ReturnType<typeof PDFPerformanceMonitorService.getPerformanceTrends>
  ): string[] {
    const recommendations: string[] = [];

    // Add health-based recommendations
    recommendations.push(...health.recommendations);

    // Add trend-based recommendations
    if (trends.errorRateTrend === 'degrading') {
      recommendations.push('Monitor error logs closely as error rate is increasing');
    }

    if (trends.responseTimeTrend === 'degrading') {
      recommendations.push('Investigate performance bottlenecks as response times are increasing');
    }

    if (trends.volumeTrend === 'increasing') {
      recommendations.push('Consider scaling resources to handle increasing volume');
    }

    // Add performance-specific recommendations
    if (metrics.performanceDistribution.generation.slow > metrics.performanceDistribution.generation.fast) {
      recommendations.push('Optimize PDF generation process - more slow generations than fast ones');
    }

    if (metrics.performanceDistribution.delivery.slow > metrics.performanceDistribution.delivery.fast) {
      recommendations.push('Review WhatsApp API performance - delivery times are concerning');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}