import { NextRequest, NextResponse } from 'next/server';
import { PDFMonitoringService } from '@/lib/services/pdf-monitoring.service';

/**
 * GET /api/v1/admin/test-alert
 * Test admin alert system
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing admin alert system...');

    // Test the admin phone configuration
    const adminPhones = process.env.ADMIN_PHONE_NUMBERS;
    console.log('Admin phones configured:', adminPhones || 'None');

    if (!adminPhones) {
      return NextResponse.json({
        success: false,
        error: 'No admin phone numbers configured',
        message: 'Please set ADMIN_PHONE_NUMBERS environment variable'
      });
    }

    // Send a test alert
    await PDFMonitoringService.recordError(
      'warning',
      'ADMIN_TEST',
      'TEST_ALERT',
      'This is a test alert to verify the admin notification system is working correctly.',
      {
        testType: 'admin_alert_test',
        timestamp: new Date().toISOString(),
        triggeredBy: 'manual_test',
        adminPhones: adminPhones.split(',').map(p => p.trim())
      },
      true // Require immediate action to trigger WhatsApp alert
    );

    return NextResponse.json({
      success: true,
      message: 'Test alert sent successfully',
      adminPhones: adminPhones.split(',').map(p => p.trim()),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test alert error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}