# Deployment Guide - Additional Payment Features

This guide covers the deployment of the additional payment features for the GOSA Convention Management System.

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are set in your production environment:

```bash
# Database
MONGODB_URI=mongodb://your-production-mongodb-uri

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-production-domain.com

# Payment Processing
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

# WhatsApp Notifications
WASENDER_API_KEY=your_wasender_api_key
WASENDER_BASE_URL=https://api.wasender.com

# File Storage
VERCEL_BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### 2. Database Setup

Ensure your MongoDB database is properly configured with:

- Proper indexing for all collections
- Connection pooling configured
- Backup strategy in place
- Monitoring enabled

### 3. Payment Gateway Configuration

#### Paystack Setup
1. Switch to live keys in production
2. Configure webhook URL: `https://your-domain.com/api/webhook/paystack`
3. Enable required webhook events:
   - `charge.success`
   - `charge.failed`
   - `transfer.success`
   - `transfer.failed`

#### WASender API Setup
1. Verify API credentials are active
2. Test message delivery
3. Configure rate limiting if needed

### 4. File Storage Setup

#### Vercel Blob Configuration
1. Create production blob store
2. Configure access tokens
3. Set up CDN if needed
4. Configure file size limits

## Deployment Steps

### 1. Run Validation Script

Before deployment, run the validation script to ensure all components are ready:

```bash
node scripts/deployment-validation.js
```

This script checks:
- Environment variables
- API endpoints
- Utility classes
- Database schemas
- Service classes
- Form components
- Admin components
- Badge components
- Test suite
- Security configuration

### 2. Build and Test

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Run test coverage
npm run test:coverage

# Build for production
npm run build

# Start production server (for testing)
npm run start
```

### 3. Database Migration

If deploying to a new database, ensure all schemas are properly created:

```bash
# Run any necessary database migrations
# This depends on your specific setup
```

### 4. Deploy Application

Deploy using your preferred method (Vercel, AWS, etc.):

```bash
# Example for Vercel
vercel --prod

# Example for Docker
docker build -t convention-app .
docker run -p 3000:3000 convention-app
```

## Post-Deployment Verification

### 1. Health Checks

Verify all API endpoints are responding:

```bash
# Check dinner endpoint
curl -X GET https://your-domain.com/api/v1/dinner

# Check accommodation endpoint
curl -X GET https://your-domain.com/api/v1/accommodation

# Check admin analytics
curl -X GET https://your-domain.com/api/v1/admin/analytics
```

### 2. Payment Flow Testing

Test complete payment flows:

1. **Dinner Reservation**
   - Create reservation
   - Process payment
   - Verify webhook handling
   - Check QR code generation
   - Confirm notifications sent

2. **Accommodation Booking**
   - Create booking
   - Process payment
   - Verify confirmation codes
   - Check notifications

3. **Badge Generation**
   - Upload photo
   - Generate badge
   - Verify Vercel Blob storage
   - Test social sharing

### 3. Admin Dashboard Testing

Verify admin functionality:

1. Access admin dashboard
2. Check analytics data
3. Test attendee management
4. Verify QR code regeneration
5. Test payment history

### 4. Notification Testing

Test notification delivery:

1. Complete a payment flow
2. Verify WhatsApp messages sent
3. Check QR code attachments
4. Confirm message formatting

## Monitoring and Maintenance

### 1. Application Monitoring

Set up monitoring for:

- API response times
- Error rates
- Payment success rates
- Database performance
- File storage usage

### 2. Payment Monitoring

Monitor payment-related metrics:

- Payment success/failure rates
- Webhook delivery success
- Refund processing
- Revenue tracking

### 3. Notification Monitoring

Track notification delivery:

- Message delivery rates
- Failed notifications
- QR code generation success
- File attachment delivery

### 4. Database Monitoring

Monitor database performance:

- Query performance
- Connection pool usage
- Storage usage
- Backup success

## Troubleshooting

### Common Issues

#### 1. Payment Webhook Failures

**Symptoms:** Payments processed but not confirmed in system

**Solutions:**
- Check webhook URL configuration
- Verify webhook signature validation
- Check server logs for errors
- Test webhook endpoint manually

#### 2. QR Code Generation Failures

**Symptoms:** Reservations confirmed but no QR codes generated

**Solutions:**
- Check QR code service configuration
- Verify image generation libraries
- Check file storage permissions
- Review error logs

#### 3. Notification Delivery Issues

**Symptoms:** Confirmations processed but notifications not sent

**Solutions:**
- Verify WASender API credentials
- Check API rate limits
- Verify phone number formats
- Test API connectivity

#### 4. Badge Generation Issues

**Symptoms:** Photo uploads fail or badges not generated

**Solutions:**
- Check Vercel Blob configuration
- Verify file size limits
- Check image processing libraries
- Review storage permissions

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| PAY001 | Payment initialization failed | Check Paystack credentials |
| PAY002 | Webhook verification failed | Verify webhook signature |
| QR001 | QR code generation failed | Check QR service configuration |
| NOT001 | Notification delivery failed | Verify WASender API |
| BAD001 | Badge generation failed | Check Vercel Blob setup |
| DB001 | Database connection failed | Check MongoDB URI |

## Security Considerations

### 1. API Security

- All API endpoints use proper authentication
- Input validation on all endpoints
- Rate limiting implemented
- CORS properly configured

### 2. Payment Security

- PCI compliance maintained
- Webhook signatures verified
- Sensitive data encrypted
- Audit trails maintained

### 3. Data Protection

- User data encrypted at rest
- Secure transmission (HTTPS)
- GDPR compliance maintained
- Data retention policies enforced

## Performance Optimization

### 1. Database Optimization

- Proper indexing on frequently queried fields
- Connection pooling configured
- Query optimization implemented
- Caching strategy in place

### 2. API Optimization

- Response caching where appropriate
- Pagination implemented
- Bulk operations optimized
- Rate limiting configured

### 3. File Storage Optimization

- CDN configured for static assets
- Image optimization implemented
- File size limits enforced
- Cleanup processes automated

## Backup and Recovery

### 1. Database Backups

- Automated daily backups
- Point-in-time recovery available
- Backup verification process
- Recovery procedures documented

### 2. File Storage Backups

- Badge images backed up
- QR codes archived
- Recovery procedures tested
- Retention policies defined

### 3. Configuration Backups

- Environment variables documented
- API configurations saved
- Deployment scripts versioned
- Recovery procedures tested

## Support and Maintenance

### 1. Regular Maintenance

- Weekly health checks
- Monthly performance reviews
- Quarterly security audits
- Annual disaster recovery tests

### 2. Updates and Patches

- Security patches applied promptly
- Dependency updates scheduled
- Feature updates planned
- Rollback procedures ready

### 3. Support Procedures

- Issue escalation process
- Emergency contact information
- Documentation maintenance
- User support procedures

## Rollback Procedures

In case of deployment issues:

### 1. Immediate Rollback

```bash
# Revert to previous deployment
vercel rollback

# Or restore from backup
# Restore database from backup
# Revert code to previous version
```

### 2. Partial Rollback

- Disable specific features via feature flags
- Route traffic away from problematic endpoints
- Restore specific database collections
- Revert specific service configurations

### 3. Full System Restore

- Restore complete database backup
- Revert to previous application version
- Restore file storage backup
- Reset all configurations

## Contact Information

For deployment support:

- **Technical Lead:** [Contact Information]
- **DevOps Team:** [Contact Information]
- **Emergency Contact:** [Contact Information]

## Additional Resources

- [API Documentation](./API.md)
- [Database Schema Documentation](./DATABASE.md)
- [Security Guidelines](./SECURITY.md)
- [Performance Monitoring Guide](./MONITORING.md)