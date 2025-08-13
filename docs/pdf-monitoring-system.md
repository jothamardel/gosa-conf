# PDF WhatsApp Integration Monitoring & Logging System

## Overview

The PDF WhatsApp Integration system includes comprehensive monitoring and logging capabilities to track performance, detect issues, and provide insights into system behavior. This document outlines the monitoring architecture, available metrics, and how to use the monitoring tools.

## Architecture

### Core Components

1. **PDFLoggerService** - Structured logging for all PDF operations
2. **PDFPerformanceMonitorService** - Performance metrics and alerting
3. **Monitoring APIs** - RESTful endpoints for accessing monitoring data
4. **Dashboard Components** - React components for visualizing metrics

### Data Flow

```
PDF Operations → PDFLoggerService → In-Memory Storage → Monitoring APIs → Dashboard
                      ↓
              Performance Analysis → Alerts → Admin Notifications
```

## Logging System

### PDFLoggerService

The `PDFLoggerService` provides structured logging for all PDF-related operations:

#### Key Features

- **Structured Logging**: JSON-formatted logs with consistent schema
- **Performance Tracking**: Duration measurement for all operations
- **Error Categorization**: Automatic classification of error types
- **Privacy Protection**: Automatic masking of sensitive data (phone numbers, IPs)
- **Metrics Aggregation**: Real-time calculation of success rates and averages

#### Log Event Types

1. **Generation Events**
   - `generation/start` - PDF generation initiated
   - `generation/complete` - PDF generation successful
   - `generation/failed` - PDF generation failed

2. **Delivery Events**
   - `delivery/start` - WhatsApp delivery initiated
   - `delivery/complete` - WhatsApp delivery successful
   - `delivery/failed` - WhatsApp delivery failed

3. **Download Events**
   - `download/request` - PDF download requested
   - `download/complete` - PDF download successful
   - `download/failed` - PDF download failed

4. **Security Events**
   - `security/unauthorized_access` - Unauthorized access attempt
   - `security/invalid_reference` - Invalid payment reference
   - `security/rate_limit_exceeded` - Rate limit exceeded

#### Usage Examples

```typescript
// Log PDF generation start
PDFLoggerService.logGenerationStart(paymentReference, serviceType, userId);

// Log successful generation
PDFLoggerService.logGenerationSuccess(paymentReference, serviceType, duration, userId);

// Log generation error
PDFLoggerService.logGenerationError(paymentReference, serviceType, error, duration, userId);

// Log security event
PDFLoggerService.logSecurityEvent('unauthorized_access', paymentReference, ipAddress, userAgent);
```

### Log Data Structure

```typescript
interface PDFLogEvent {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: 'generation' | 'delivery' | 'download' | 'cache' | 'security';
  action: string;
  paymentReference?: string;
  userId?: string;
  userPhone?: string; // Automatically masked
  serviceType?: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}
```

## Performance Monitoring

### PDFPerformanceMonitorService

Provides comprehensive performance analysis and alerting:

#### Key Metrics

1. **Operation Counts**
   - Total operations by type (generation, delivery, download)
   - Success/failure counts
   - Operations per time period

2. **Response Times**
   - Average response times by operation
   - Performance distribution (fast/normal/slow)
   - Percentile analysis (P95, P99)

3. **Success Rates**
   - Overall system success rate
   - Success rates by operation type
   - Success rate trends over time

4. **Error Analysis**
   - Error rates by operation and category
   - Error trend analysis
   - Common error patterns

#### Performance Thresholds

```typescript
const ALERT_THRESHOLDS = {
  errorRate: {
    low: 5,      // 5%
    medium: 10,  // 10%
    high: 20,    // 20%
    critical: 30 // 30%
  },
  responseTime: {
    generation: { normal: 3000, slow: 5000, critical: 10000 },
    delivery: { normal: 5000, slow: 10000, critical: 20000 },
    download: { normal: 2000, slow: 5000, critical: 10000 }
  }
};
```

### Health Status Calculation

The system calculates an overall health score (0-100) based on:

- Error rates (40% weight)
- Response times (30% weight)
- Recent alerts (20% weight)
- System trends (10% weight)

Health statuses:
- **Healthy** (90-100): System operating optimally
- **Degraded** (70-89): Minor issues, monitoring recommended
- **Unhealthy** (50-69): Significant issues, intervention needed
- **Critical** (0-49): System failure, immediate action required

## Alerting System

### Alert Types

1. **High Error Rate** - Error rate exceeds threshold
2. **Slow Response Time** - Response time exceeds threshold
3. **High Volume** - Operation volume exceeds capacity
4. **Service Degradation** - Performance significantly worse than baseline

### Alert Severities

- **Critical** - Immediate action required
- **High** - Action required within 1 hour
- **Medium** - Action required within 4 hours
- **Low** - Monitoring recommended

### Alert Example

```typescript
interface PerformanceAlert {
  type: 'high_error_rate' | 'slow_response_time' | 'high_volume' | 'service_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  operation?: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

## API Endpoints

### Monitoring API (`/api/v1/admin/pdf-monitoring`)

#### GET Parameters
- `type`: Data type to retrieve
  - `recent` - Recent logs
  - `metrics` - Current metrics
  - `errors` - Error logs
  - `performance` - Performance data
  - `operation` - Operation-specific logs

- `limit`: Number of records to return (default: 100)
- `operation`: Filter by operation type

#### Examples

```bash
# Get recent logs
GET /api/v1/admin/pdf-monitoring?type=recent&limit=50

# Get error logs
GET /api/v1/admin/pdf-monitoring?type=errors&limit=100

# Get generation operation logs
GET /api/v1/admin/pdf-monitoring?type=operation&operation=generation&limit=50
```

### Performance API (`/api/v1/admin/pdf-performance`)

#### GET Parameters
- `type`: Performance data type
  - `overview` - Complete overview
  - `detailed` - Detailed report
  - `alerts` - Alert information
  - `health` - Health status
  - `metrics` - Raw metrics
  - `trends` - Trend analysis
  - `realtime` - Real-time data

- `hours`: Time range in hours (default: 24)

#### Examples

```bash
# Get performance overview
GET /api/v1/admin/pdf-performance?type=overview

# Get alerts from last 6 hours
GET /api/v1/admin/pdf-performance?type=alerts&hours=6

# Get detailed performance report
GET /api/v1/admin/pdf-performance?type=detailed
```

#### POST Actions
- `check_alerts` - Check for new alerts
- `generate_report` - Generate performance report
- `clear_alerts` - Clear acknowledged alerts
- `export_metrics` - Export metrics data

## Dashboard Usage

### Accessing the Dashboard

The monitoring dashboard is available as a React component that can be integrated into admin interfaces:

```typescript
import { PDFMonitoringDashboard } from '@/components/admin/pdf-monitoring-dashboard';

function AdminPage() {
  return (
    <div>
      <PDFMonitoringDashboard />
    </div>
  );
}
```

### Dashboard Features

1. **System Health Overview**
   - Health score and status
   - Success/error rates
   - Active alerts count

2. **Operations Tab**
   - Operation counts and success rates
   - Average response times
   - Performance trends

3. **Performance Tab**
   - Response time distribution
   - Time range analysis
   - Performance categories

4. **Alerts Tab**
   - Active alerts with severity
   - Alert history
   - Alert details and timestamps

5. **Logs Tab**
   - Recent system activity
   - Filterable log entries
   - Real-time updates

### Auto-Refresh

The dashboard supports auto-refresh with configurable intervals:
- Default: 30 seconds
- Can be toggled on/off
- Manual refresh available

## Integration with Existing Services

### PDF Generator Service

```typescript
// Automatic logging integration
static async generatePDFHTML(data: PDFData): Promise<string> {
  const startTime = Date.now();
  
  PDFLoggerService.logGenerationStart(/* ... */);
  
  try {
    // PDF generation logic
    const html = await generateHTML(data);
    
    PDFLoggerService.logGenerationSuccess(/* ... */, Date.now() - startTime);
    return html;
  } catch (error) {
    PDFLoggerService.logGenerationError(/* ... */, error.message, Date.now() - startTime);
    throw error;
  }
}
```

### WhatsApp PDF Service

```typescript
// Automatic delivery logging
static async generateAndSendPDF(data: WhatsAppPDFData): Promise<DeliveryResult> {
  const startTime = Date.now();
  
  PDFLoggerService.logDeliveryStart(/* ... */);
  
  try {
    // Delivery logic
    const result = await sendPDF(data);
    
    PDFLoggerService.logDeliverySuccess(/* ... */, Date.now() - startTime, 'document');
    return result;
  } catch (error) {
    PDFLoggerService.logDeliveryError(/* ... */, error.message, Date.now() - startTime);
    throw error;
  }
}
```

### PDF Download API

```typescript
// Request and response logging
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  PDFLoggerService.logDownloadRequest(/* ... */);
  
  try {
    // Download logic
    const response = await generateResponse();
    
    PDFLoggerService.logDownloadSuccess(/* ... */, Date.now() - startTime);
    return response;
  } catch (error) {
    PDFLoggerService.logDownloadError(/* ... */, error.message, Date.now() - startTime);
    throw error;
  }
}
```

## Best Practices

### Logging

1. **Log at appropriate levels**
   - `info` for normal operations
   - `warn` for recoverable issues
   - `error` for failures
   - `debug` for detailed troubleshooting

2. **Include context**
   - Always include payment reference
   - Include user identifiers when available
   - Add relevant metadata

3. **Protect sensitive data**
   - Phone numbers are automatically masked
   - IP addresses are partially masked
   - Avoid logging full user details

### Monitoring

1. **Set appropriate thresholds**
   - Adjust based on system capacity
   - Consider business requirements
   - Review and update regularly

2. **Monitor trends**
   - Look for gradual degradation
   - Identify patterns in errors
   - Track performance over time

3. **Respond to alerts**
   - Critical alerts require immediate attention
   - High alerts should be addressed within 1 hour
   - Document resolution steps

### Performance

1. **Regular maintenance**
   - Clear old logs periodically
   - Archive historical data
   - Monitor storage usage

2. **Optimization**
   - Use log data to identify bottlenecks
   - Optimize slow operations
   - Implement caching where appropriate

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check error logs for patterns
   - Verify external service availability
   - Review recent code changes

2. **Slow Response Times**
   - Check system resources
   - Review database performance
   - Analyze network connectivity

3. **Missing Logs**
   - Verify service integration
   - Check log retention settings
   - Ensure proper error handling

### Debugging Steps

1. **Check recent logs**
   ```bash
   GET /api/v1/admin/pdf-monitoring?type=recent&limit=100
   ```

2. **Review error patterns**
   ```bash
   GET /api/v1/admin/pdf-monitoring?type=errors&limit=50
   ```

3. **Analyze performance trends**
   ```bash
   GET /api/v1/admin/pdf-performance?type=trends
   ```

4. **Check system health**
   ```bash
   GET /api/v1/admin/pdf-performance?type=health
   ```

## Future Enhancements

### Planned Features

1. **External Logging Integration**
   - Support for external logging services
   - Log forwarding and aggregation
   - Long-term log storage

2. **Advanced Analytics**
   - Machine learning for anomaly detection
   - Predictive performance analysis
   - Automated optimization suggestions

3. **Enhanced Alerting**
   - Email/SMS notifications
   - Integration with incident management
   - Escalation policies

4. **Custom Dashboards**
   - User-configurable dashboards
   - Custom metric definitions
   - Exportable reports

### Configuration Options

Future versions will support configuration files for:
- Alert thresholds
- Log retention policies
- Performance targets
- Dashboard preferences

This monitoring system provides comprehensive visibility into the PDF WhatsApp Integration system, enabling proactive maintenance and rapid issue resolution.