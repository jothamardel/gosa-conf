# PDF Security and Access Control System

This document describes the comprehensive PDF security and access control system implemented for the GOSA 2025 Convention PDF delivery system.

## Overview

The PDF security system provides multiple layers of protection for PDF documents, including secure URL generation, access validation, rate limiting, and comprehensive monitoring. The system ensures that only authorized users can access PDF documents while preventing abuse and unauthorized distribution.

## Security Features

### 1. Secure Token-Based Authentication

**Token Structure:**
- HMAC-SHA256 signed tokens
- Base64URL encoded payload and signature
- Tamper-proof design with cryptographic verification

**Token Payload:**
```typescript
{
  ref: string;           // Payment reference
  exp: number;           // Expiration timestamp
  email?: string;        // User email
  phone?: string;        // User phone
  ips?: string[];        // Allowed IP addresses
  maxDl: number;         // Maximum downloads
  auth: boolean;         // Requires authentication
  iat: number;           // Issued at timestamp
}
```

### 2. Access Control Mechanisms

**IP Address Restrictions:**
- Optional IP whitelisting
- Automatic IP detection from various headers
- Support for proxy and CDN environments

**Rate Limiting:**
- Per-IP rate limiting (default: 5 requests/minute)
- Exponential backoff for repeated violations
- Automatic cleanup of expired rate limit data

**Download Limits:**
- Configurable maximum downloads per token
- Per-IP download tracking
- Automatic counter reset after token expiration

### 3. Security Headers

**Enhanced HTTP Headers:**
```http
Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'none'
```

**Custom Tracking Headers:**
```http
X-Download-ID: <unique-uuid>
X-Remaining-Downloads: <count>
X-Expires-At: <iso-timestamp>
X-Security-Level: <basic|secure>
```

## Components

### 1. PDFSecurityService

The core security service providing token generation, validation, and access control.

#### Key Methods:

**generateSecureURL(options)**
```typescript
const secureURL = PDFSecurityService.generateSecureURL({
  paymentReference: 'CONV_123456',
  userEmail: 'user@example.com',
  userPhone: '+1234567890',
  expiresIn: 24 * 60 * 60,    // 24 hours
  maxDownloads: 10,
  allowedIPs: ['192.168.1.1'],
  requireAuth: false
});
```

**validateAccess(token, request)**
```typescript
const validation = await PDFSecurityService.validateAccess(token, request);
if (validation.valid) {
  // Allow access
  console.log(`Remaining downloads: ${validation.remainingDownloads}`);
} else {
  // Deny access
  console.log(`Access denied: ${validation.reason}`);
}
```

**recordDownload(paymentReference, clientIP)**
```typescript
PDFSecurityService.recordDownload('CONV_123456', '192.168.1.1');
```

#### Security Validation Checks:

1. **Token Integrity**: HMAC signature verification
2. **Expiration**: Timestamp-based expiration check
3. **IP Restrictions**: Optional IP address validation
4. **Rate Limiting**: Per-IP request rate limiting
5. **Download Limits**: Maximum download count enforcement
6. **Format Validation**: Payment reference format validation

### 2. Secure Download Endpoint

**Endpoint:** `/api/v1/pdf/secure-download`

**Methods:**
- `GET` - Download PDF with secure token
- `POST` - Generate secure download link
- `PATCH` - Get statistics and manage access

**GET Request:**
```http
GET /api/v1/pdf/secure-download?token=<secure-token>&format=pdf
```

**POST Request:**
```json
{
  "paymentReference": "CONV_123456",
  "userEmail": "user@example.com",
  "userPhone": "+1234567890",
  "expiresIn": 86400,
  "maxDownloads": 5,
  "allowedIPs": ["192.168.1.1"],
  "requireAuth": false
}
```

**Response:**
```json
{
  "success": true,
  "secureURL": "https://app.com/api/v1/pdf/secure-download?token=...",
  "expiresIn": 86400,
  "maxDownloads": 5
}
```

### 3. Access Control Middleware

**PDFAccessControlMiddleware** provides additional security layers:

- Suspicious request detection
- Bot and crawler blocking
- IP-based blocking system
- Comprehensive access logging

**Usage:**
```typescript
const accessResult = await PDFAccessControlMiddleware.checkAccess(request, {
  requireSecureToken: true,
  allowBasicAccess: false,
  maxRequestsPerMinute: 10,
  blockSuspiciousIPs: true,
  logAllAccess: true
});

if (accessResult) {
  // Access denied
  return accessResult;
}
// Continue with request processing
```

## Security Levels

### Level 1: Basic Security (Default PDF Endpoint)

**Features:**
- Payment reference validation
- Rate limiting (5 requests/minute)
- Basic security headers
- Access logging

**Use Case:** General PDF downloads with basic protection

**Endpoint:** `/api/v1/pdf/download?ref=<payment-reference>`

### Level 2: Enhanced Security (Secure PDF Endpoint)

**Features:**
- Secure token authentication
- IP address restrictions
- Download count limits
- Time-based expiration
- Enhanced monitoring

**Use Case:** Sensitive documents requiring controlled access

**Endpoint:** `/api/v1/pdf/secure-download?token=<secure-token>`

### Level 3: Maximum Security (With Middleware)

**Features:**
- All Level 2 features
- Suspicious request detection
- Automatic IP blocking
- Bot detection and blocking
- Comprehensive audit logging

**Use Case:** Highly sensitive documents with maximum protection

## Configuration

### Environment Variables

```bash
# PDF Security Configuration
PDF_SECURITY_SECRET=your-secret-key-here
ADMIN_PHONE_NUMBERS=+1234567890,+0987654321

# Application Configuration
NEXTAUTH_URL=https://your-app.com

# Rate Limiting
PDF_RATE_LIMIT_WINDOW=60000      # 1 minute in milliseconds
PDF_RATE_LIMIT_MAX_ATTEMPTS=5   # Maximum attempts per window
PDF_DEFAULT_EXPIRY=86400         # 24 hours in seconds
PDF_MAX_DOWNLOADS_DEFAULT=10     # Default maximum downloads
```

### Security Options

```typescript
interface SecureURLOptions {
  paymentReference: string;
  userEmail?: string;
  userPhone?: string;
  expiresIn?: number;        // Seconds (default: 24 hours)
  allowedIPs?: string[];     // IP whitelist
  maxDownloads?: number;     // Download limit (default: 10)
  requireAuth?: boolean;     // Require authentication
}
```

## Usage Examples

### 1. Generate Secure Link for WhatsApp Delivery

```typescript
import { PDFSecurityService } from '@/lib/services/pdf-security.service';

// Generate 48-hour link for WhatsApp delivery
const whatsappLink = PDFSecurityService.generateWhatsAppSecureLink(
  'CONV_123456',
  '+1234567890',
  48 // hours
);

console.log('WhatsApp secure link:', whatsappLink);
```

### 2. Create User-Specific Secure Link

```typescript
// Generate secure link with user context
const userLink = PDFSecurityService.generateUserSecureLink(
  'DINNER_789012',
  'user@example.com',
  '+1234567890',
  {
    expiresIn: 7200,     // 2 hours
    maxDownloads: 3,
    allowedIPs: ['192.168.1.100']
  }
);
```

### 3. Validate Access in API Route

```typescript
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  const validation = await PDFSecurityService.validateAccess(token, request);
  
  if (!validation.valid) {
    return NextResponse.json({ 
      error: validation.reason 
    }, { status: 403 });
  }

  // Process secure download
  // ...
}
```

### 4. Get Download Statistics

```typescript
// Get download statistics for a payment reference
const stats = PDFSecurityService.getDownloadStats('CONV_123456');

console.log('Download Statistics:', {
  totalAttempts: stats.totalAttempts,
  successfulDownloads: stats.successfulDownloads,
  failedAttempts: stats.failedAttempts,
  uniqueIPs: stats.uniqueIPs,
  lastAccess: stats.lastAccess
});
```

### 5. Revoke Access

```typescript
// Revoke all access for a payment reference
PDFSecurityService.revokeAccess('CONV_123456');
console.log('Access revoked for CONV_123456');
```

## Monitoring and Logging

### Access Logging

All PDF access attempts are logged with the following information:

```typescript
interface DownloadAttempt {
  paymentReference: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
  userEmail?: string;
  userPhone?: string;
}
```

### Security Events

Security events are automatically logged to the monitoring system:

- `ACCESS_GRANTED` - Successful access validation
- `ACCESS_DENIED` - Failed access attempt
- `RATE_LIMIT_EXCEEDED` - Rate limit violation
- `IP_BLOCKED` - IP address blocked
- `SUSPICIOUS_REQUEST` - Suspicious activity detected
- `TOKEN_EXPIRED` - Expired token usage attempt
- `INVALID_TOKEN` - Invalid token format

### Statistics and Analytics

**Download Statistics:**
```typescript
{
  totalAttempts: number;
  successfulDownloads: number;
  failedAttempts: number;
  uniqueIPs: number;
  lastAccess?: Date;
}
```

**Security Statistics:**
```typescript
{
  suspiciousIPs: number;
  blockedIPs: number;
  totalBlocked: number;
}
```

## API Reference

### Secure Download Endpoints

#### GET /api/v1/pdf/secure-download

Download PDF with secure token.

**Parameters:**
- `token` (required) - Secure access token
- `format` (optional) - Response format (default: 'pdf')

**Response:**
- Success: PDF file with security headers
- Error: JSON error response

#### POST /api/v1/pdf/secure-download

Generate secure download link.

**Body:**
```json
{
  "paymentReference": "string",
  "userEmail": "string",
  "userPhone": "string",
  "expiresIn": "number",
  "maxDownloads": "number",
  "allowedIPs": ["string"],
  "requireAuth": "boolean"
}
```

**Response:**
```json
{
  "success": true,
  "secureURL": "string",
  "expiresIn": "number",
  "maxDownloads": "number"
}
```

#### PATCH /api/v1/pdf/secure-download

Manage access and get statistics.

**Body:**
```json
{
  "paymentReference": "string",
  "action": "stats|history|revoke"
}
```

**Response:**
- `stats`: Download statistics
- `history`: Access history
- `revoke`: Confirmation message

### Enhanced Basic Download Endpoint

#### GET /api/v1/pdf/download

Download PDF with basic security.

**Parameters:**
- `ref` (required) - Payment reference
- `format` (optional) - Response format (default: 'pdf')

**Enhanced Features:**
- Payment reference format validation
- Rate limiting (5 requests/minute per IP)
- Enhanced security headers
- Access logging and monitoring

## Security Best Practices

### 1. Token Management

- **Short Expiration**: Use short expiration times for sensitive documents
- **Limited Downloads**: Set appropriate download limits
- **IP Restrictions**: Use IP whitelisting for high-security scenarios
- **Regular Rotation**: Regenerate tokens periodically for long-term access

### 2. Monitoring

- **Real-time Alerts**: Set up alerts for suspicious activity
- **Regular Audits**: Review access logs regularly
- **Statistics Analysis**: Monitor download patterns and anomalies
- **Incident Response**: Have procedures for security incidents

### 3. Configuration

- **Strong Secrets**: Use cryptographically strong secret keys
- **Environment Separation**: Use different secrets for different environments
- **Regular Updates**: Update security configurations regularly
- **Backup Plans**: Have fallback mechanisms for security failures

### 4. User Education

- **Link Sharing**: Educate users about secure link sharing
- **Expiration Awareness**: Inform users about link expiration
- **Security Reporting**: Provide channels for reporting security issues
- **Best Practices**: Share security best practices with users

## Troubleshooting

### Common Issues

1. **Token Validation Failures**
   - Check token format and signature
   - Verify expiration timestamps
   - Confirm IP address restrictions

2. **Rate Limit Exceeded**
   - Check request frequency
   - Verify IP address detection
   - Review rate limit configuration

3. **Download Limit Reached**
   - Check download counter
   - Verify token parameters
   - Consider regenerating token

4. **Access Denied**
   - Verify payment reference exists
   - Check token validity
   - Review security logs

### Debug Mode

Enable debug logging:
```bash
export PDF_SECURITY_DEBUG=true
```

### Log Analysis

Check security logs for patterns:
```bash
grep "PDF_SECURITY" logs/application.log | tail -100
```

## Performance Considerations

### Memory Usage

- In-memory storage for demo purposes
- Production should use Redis or database
- Regular cleanup of expired data
- Configurable storage limits

### Scalability

- Stateless token design
- Horizontal scaling support
- Load balancer compatibility
- CDN integration ready

### Optimization

- Token caching strategies
- Efficient IP detection
- Minimal database queries
- Asynchronous logging

## Future Enhancements

### Planned Features

1. **Database Integration**: Persistent storage for production
2. **Advanced Analytics**: Detailed security analytics dashboard
3. **Machine Learning**: AI-powered threat detection
4. **Multi-factor Authentication**: Additional authentication layers
5. **Blockchain Verification**: Immutable access logs

### Integration Opportunities

1. **Identity Providers**: OAuth/SAML integration
2. **Security Services**: Integration with security platforms
3. **Monitoring Tools**: Enhanced monitoring integrations
4. **Compliance Tools**: Audit and compliance reporting

## Compliance and Standards

### Security Standards

- **OWASP**: Following OWASP security guidelines
- **HTTPS**: Enforced secure connections
- **Data Protection**: Minimal data collection and storage
- **Privacy**: User privacy protection measures

### Audit Trail

- Complete access logging
- Immutable log storage
- Regular log analysis
- Compliance reporting

This comprehensive security system ensures that PDF documents are protected while maintaining usability and performance for legitimate users.