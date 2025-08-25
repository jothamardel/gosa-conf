import { NextRequest, NextResponse } from "next/server";
import { PDFLoggerService } from "@/lib/services/pdf-logger.service";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation") as
      | "generation"
      | "delivery"
      | "download"
      | null;
    const limit = parseInt(searchParams.get("limit") || "100");
    const type = searchParams.get("type") || "recent";

    let data;

    switch (type) {
      case "metrics":
        data = {
          metrics: PDFLoggerService.getMetrics(),
          performanceStats: PDFLoggerService.getPerformanceStats(),
        };
        break;

      case "errors":
        data = {
          errorLogs: PDFLoggerService.getErrorLogs(limit),
          errorSummary: getErrorSummary(),
        };
        break;

      case "performance":
        data = {
          performanceStats: PDFLoggerService.getPerformanceStats(),
          recentPerformance: getRecentPerformanceData(limit),
        };
        break;

      case "operation":
        if (!operation) {
          return NextResponse.json(
            { error: "Operation parameter required for operation type" },
            { status: 400 },
          );
        }
        data = {
          logs: PDFLoggerService.getLogsByOperation(operation, limit),
          operationStats: getOperationStats(operation),
        };
        break;

      default:
        data = {
          recentLogs: PDFLoggerService.getRecentLogs(limit),
          summary: getLogSummary(),
        };
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PDF monitoring API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve monitoring data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, days } = body;

    if (action === "clear_old_logs") {
      const daysToKeep = days || 7;
      const clearedCount = PDFLoggerService.clearOldLogs(daysToKeep);

      return NextResponse.json({
        success: true,
        message: `Cleared ${clearedCount} old log entries`,
        clearedCount,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PDF monitoring POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process monitoring action",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

function getErrorSummary() {
  const errorLogs = PDFLoggerService.getErrorLogs(200);
  const errorCategories: Record<string, number> = {};
  const errorOperations: Record<string, number> = {};

  errorLogs.forEach((log) => {
    const category = log.metadata?.errorCategory || "unknown";
    errorCategories[category] = (errorCategories[category] || 0) + 1;
    errorOperations[log.operation] = (errorOperations[log.operation] || 0) + 1;
  });

  return {
    totalErrors: errorLogs.length,
    errorsByCategory: errorCategories,
    errorsByOperation: errorOperations,
    recentErrorRate: calculateRecentErrorRate(errorLogs),
  };
}

function getRecentPerformanceData(limit: number) {
  const recentLogs = PDFLoggerService.getRecentLogs(limit);
  const performanceData = {
    generation: [] as number[],
    delivery: [] as number[],
    download: [] as number[],
  };

  recentLogs
    .filter((log) => log.success && log.duration)
    .forEach((log) => {
      if (
        log.operation === "generation" ||
        log.operation === "delivery" ||
        log.operation === "download"
      ) {
        performanceData[log.operation].push(log.duration!);
      }
    });

  return {
    averageTimes: {
      generation: calculateAverage(performanceData.generation),
      delivery: calculateAverage(performanceData.delivery),
      download: calculateAverage(performanceData.download),
    },
    medianTimes: {
      generation: calculateMedian(performanceData.generation),
      delivery: calculateMedian(performanceData.delivery),
      download: calculateMedian(performanceData.download),
    },
    p95Times: {
      generation: calculatePercentile(performanceData.generation, 95),
      delivery: calculatePercentile(performanceData.delivery, 95),
      download: calculatePercentile(performanceData.download, 95),
    },
  };
}

function getOperationStats(operation: string) {
  const logs = PDFLoggerService.getLogsByOperation(operation as any, 500);
  const successful = logs.filter((log) => log.success).length;
  const failed = logs.filter((log) => !log.success).length;
  const total = logs.length;

  const durations = logs
    .filter((log) => log.duration)
    .map((log) => log.duration!);

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageDuration: calculateAverage(durations),
    medianDuration: calculateMedian(durations),
    p95Duration: calculatePercentile(durations, 95),
  };
}

function getLogSummary() {
  const recentLogs = PDFLoggerService.getRecentLogs(500);
  const last24Hours = recentLogs.filter((log) => {
    const hoursDiff = (Date.now() - log.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  const operationCounts = {
    generation: 0,
    delivery: 0,
    download: 0,
    cache: 0,
    security: 0,
  };

  const levelCounts = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0,
  };

  last24Hours.forEach((log) => {
    operationCounts[log.operation]++;
    levelCounts[log.level]++;
  });

  return {
    totalLogs: recentLogs.length,
    last24Hours: last24Hours.length,
    operationCounts,
    levelCounts,
    errorRate:
      last24Hours.length > 0
        ? (levelCounts.error / last24Hours.length) * 100
        : 0,
  };
}

function calculateRecentErrorRate(errorLogs: any[]) {
  const last24Hours = errorLogs.filter((log) => {
    const hoursDiff = (Date.now() - log.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  const lastHour = errorLogs.filter((log) => {
    const hoursDiff = (Date.now() - log.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 1;
  });

  return {
    last24Hours: last24Hours.length,
    lastHour: lastHour.length,
  };
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculatePercentile(numbers: number[], percentile: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
