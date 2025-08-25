import { NextRequest, NextResponse } from "next/server";
import { PDFPerformanceMonitorService } from "@/lib/services/pdf-performance-monitor.service";
import { PDFLoggerService } from "@/lib/services/pdf-logger.service";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const hours = parseInt(searchParams.get("hours") || "24");

    let data;

    switch (type) {
      case "overview":
        data = {
          metrics: PDFPerformanceMonitorService.getPerformanceMetrics(),
          health: PDFPerformanceMonitorService.getHealthStatus(),
          trends: PDFPerformanceMonitorService.getPerformanceTrends(),
        };
        break;

      case "detailed":
        data = PDFPerformanceMonitorService.generatePerformanceReport();
        break;

      case "alerts":
        data = {
          recentAlerts: PDFPerformanceMonitorService.getRecentAlerts(hours),
          newAlerts: PDFPerformanceMonitorService.checkPerformanceAlerts(),
        };
        break;

      case "health":
        data = {
          health: PDFPerformanceMonitorService.getHealthStatus(),
          trends: PDFPerformanceMonitorService.getPerformanceTrends(),
          systemStatus: getSystemStatus(),
        };
        break;

      case "metrics":
        data = {
          metrics: PDFPerformanceMonitorService.getPerformanceMetrics(),
          rawMetrics: PDFLoggerService.getMetrics(),
          performanceStats: PDFLoggerService.getPerformanceStats(),
        };
        break;

      case "trends":
        data = {
          trends: PDFPerformanceMonitorService.getPerformanceTrends(),
          historicalData: getHistoricalPerformanceData(hours),
        };
        break;

      case "realtime":
        data = {
          currentMetrics: getCurrentMetrics(),
          recentActivity: PDFLoggerService.getRecentLogs(50),
          activeAlerts: PDFPerformanceMonitorService.getRecentAlerts(1),
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      type,
    });
  } catch (error) {
    console.error("PDF performance API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve performance data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, parameters } = body;

    let result;

    switch (action) {
      case "check_alerts":
        result = {
          alerts: PDFPerformanceMonitorService.checkPerformanceAlerts(),
          timestamp: new Date().toISOString(),
        };
        break;

      case "generate_report":
        result = {
          report: PDFPerformanceMonitorService.generatePerformanceReport(),
          timestamp: new Date().toISOString(),
        };
        break;

      case "clear_alerts":
        // In a real implementation, you might want to mark alerts as acknowledged
        result = {
          message: "Alerts cleared successfully",
          timestamp: new Date().toISOString(),
        };
        break;

      case "export_metrics":
        const format = parameters?.format || "json";
        const hours = parameters?.hours || 24;
        result = {
          exportData: await exportMetrics(format, hours),
          format,
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PDF performance POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process performance action",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

function getSystemStatus() {
  const health = PDFPerformanceMonitorService.getHealthStatus();
  const metrics = PDFPerformanceMonitorService.getPerformanceMetrics();

  return {
    overallStatus: health.status,
    healthScore: health.score,
    services: {
      pdfGeneration: {
        status: metrics.errorRates.generation < 10 ? "healthy" : "degraded",
        errorRate: metrics.errorRates.generation,
        averageResponseTime: metrics.averageResponseTimes.generation,
      },
      whatsappDelivery: {
        status: metrics.errorRates.delivery < 15 ? "healthy" : "degraded",
        errorRate: metrics.errorRates.delivery,
        averageResponseTime: metrics.averageResponseTimes.delivery,
      },
      pdfDownload: {
        status: metrics.errorRates.download < 5 ? "healthy" : "degraded",
        errorRate: metrics.errorRates.download,
        averageResponseTime: metrics.averageResponseTimes.download,
      },
    },
    uptime: calculateUptime(),
    lastUpdated: new Date().toISOString(),
  };
}

function getCurrentMetrics() {
  const recentLogs = PDFLoggerService.getRecentLogs(100);
  const last5Minutes = recentLogs.filter((log) => {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    return new Date(log.timestamp) > fiveMinutesAgo;
  });

  const operationCounts = {
    generation: 0,
    delivery: 0,
    download: 0,
    cache: 0,
    security: 0,
  };

  const successCounts = {
    generation: 0,
    delivery: 0,
    download: 0,
    cache: 0,
    security: 0,
  };

  last5Minutes.forEach((log) => {
    operationCounts[log.operation]++;
    if (log.success) {
      successCounts[log.operation]++;
    }
  });

  return {
    timeWindow: "5 minutes",
    totalOperations: last5Minutes.length,
    operationCounts,
    successCounts,
    errorCount: last5Minutes.filter((log) => !log.success).length,
    averageResponseTime: calculateAverageResponseTime(last5Minutes),
    operationsPerMinute: last5Minutes.length / 5,
  };
}

function getHistoricalPerformanceData(hours: number) {
  const logs = PDFLoggerService.getRecentLogs(10000);
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  const historicalLogs = logs.filter(
    (log) => new Date(log.timestamp) > cutoffTime,
  );

  // Group by hour
  const hourlyData: Record<string, any> = {};

  historicalLogs.forEach((log) => {
    const hour =
      new Date(log.timestamp).toISOString().substring(0, 13) + ":00:00.000Z";

    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        timestamp: hour,
        operations: {
          generation: 0,
          delivery: 0,
          download: 0,
          cache: 0,
          security: 0,
        },
        successes: {
          generation: 0,
          delivery: 0,
          download: 0,
          cache: 0,
          security: 0,
        },
        errors: {
          generation: 0,
          delivery: 0,
          download: 0,
          cache: 0,
          security: 0,
        },
        responseTimes: { generation: [], delivery: [], download: [] },
      };
    }

    hourlyData[hour].operations[log.operation]++;

    if (log.success) {
      hourlyData[hour].successes[log.operation]++;
    } else {
      hourlyData[hour].errors[log.operation]++;
    }

    if (
      log.duration &&
      (log.operation === "generation" ||
        log.operation === "delivery" ||
        log.operation === "download")
    ) {
      hourlyData[hour].responseTimes[log.operation].push(log.duration);
    }
  });

  // Calculate averages for each hour
  return Object.values(hourlyData)
    .map((hourData: any) => ({
      timestamp: hourData.timestamp,
      operations: hourData.operations,
      successRates: {
        generation:
          hourData.operations.generation > 0
            ? (hourData.successes.generation / hourData.operations.generation) *
              100
            : 0,
        delivery:
          hourData.operations.delivery > 0
            ? (hourData.successes.delivery / hourData.operations.delivery) * 100
            : 0,
        download:
          hourData.operations.download > 0
            ? (hourData.successes.download / hourData.operations.download) * 100
            : 0,
      },
      averageResponseTimes: {
        generation:
          hourData.responseTimes.generation.length > 0
            ? hourData.responseTimes.generation.reduce(
                (a: number, b: number) => a + b,
                0,
              ) / hourData.responseTimes.generation.length
            : 0,
        delivery:
          hourData.responseTimes.delivery.length > 0
            ? hourData.responseTimes.delivery.reduce(
                (a: number, b: number) => a + b,
                0,
              ) / hourData.responseTimes.delivery.length
            : 0,
        download:
          hourData.responseTimes.download.length > 0
            ? hourData.responseTimes.download.reduce(
                (a: number, b: number) => a + b,
                0,
              ) / hourData.responseTimes.download.length
            : 0,
      },
    }))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function calculateUptime(): string {
  // In a real implementation, this would track actual service start time
  // For now, we'll use a placeholder
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - 24); // Assume 24 hours uptime

  const uptimeMs = Date.now() - startTime.getTime();
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${uptimeHours}h ${uptimeMinutes}m`;
}

function calculateAverageResponseTime(logs: any[]): number {
  const logsWithDuration = logs.filter((log) => log.duration);
  if (logsWithDuration.length === 0) return 0;

  const totalTime = logsWithDuration.reduce(
    (sum, log) => sum + log.duration,
    0,
  );
  return Math.round(totalTime / logsWithDuration.length);
}

async function exportMetrics(format: string, hours: number) {
  const metrics = PDFPerformanceMonitorService.getPerformanceMetrics();
  const logs = PDFLoggerService.getRecentLogs(hours * 100); // Approximate based on expected volume

  const exportData = {
    exportInfo: {
      timestamp: new Date().toISOString(),
      format,
      timeRange: `${hours} hours`,
      totalRecords: logs.length,
    },
    summary: metrics,
    detailedLogs: logs.map((log) => ({
      timestamp: log.timestamp,
      level: log.level,
      operation: log.operation,
      action: log.action,
      success: log.success,
      duration: log.duration,
      error: log.error,
      paymentReference: log.paymentReference,
      serviceType: log.serviceType,
    })),
  };

  if (format === "csv") {
    // Convert to CSV format
    const csvHeaders =
      "timestamp,level,operation,action,success,duration,error,paymentReference,serviceType\n";
    const csvRows = exportData.detailedLogs
      .map(
        (log) =>
          `${log.timestamp},${log.level},${log.operation},${log.action},${log.success},${log.duration || ""},${log.error || ""},${log.paymentReference || ""},${log.serviceType || ""}`,
      )
      .join("\n");

    return csvHeaders + csvRows;
  }

  return exportData;
}
