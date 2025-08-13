import { NextRequest, NextResponse } from 'next/server';
import { PDFBlobService } from '@/lib/services/pdf-blob.service';
import { PDFMonitoringService } from '@/lib/services/pdf-monitoring.service';

/**
 * GET /api/v1/admin/blob-monitoring
 * Get blob storage monitoring information
 */
export async function GET(request: NextRequest) {
  try {
    // Get blob storage status and health
    const blobStatus = await PDFBlobService.getBlobStorageStatus();

    // Get recent blob operations (mock for now)
    const recentOperations = {
      uploads: 0,
      downloads: 0,
      failures: 0,
      averageUploadTime: 0,
      totalStorageUsed: 0
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      blobStorage: {
        status: blobStatus,
        recentOperations,
        alerts: {
          costThresholdExceeded: false,
          slowOperations: 0,
          failedOperations: 0,
          largeFiles: 0
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Blob monitoring API error:', error);

    // Record the monitoring error
    try {
      await PDFMonitoringService.recordError(
        'error',
        'BLOB_MONITORING_API',
        'MONITORING_API_FAILED',
        `Blob monitoring API failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          endpoint: '/api/v1/admin/blob-monitoring',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      );
    } catch (recordError) {
      console.error('Failed to record monitoring API error:', recordError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve blob monitoring data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}