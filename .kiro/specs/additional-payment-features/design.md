# Design Document

## Overview

This design extends the existing GOSA Convention Management System to support additional payment features beyond basic registration. The system will maintain the current architecture patterns while adding new database schemas, API endpoints, utility classes, and form integrations for dinner tickets, accommodation, brochures, goodwill messages, and donations.

The design leverages the existing Paystack payment integration, WASender API for notifications, and MongoDB with Mongoose for data persistence. All new features will follow the established patterns of user management, payment processing, and multi-person booking support.

## Architecture

### High-Level Architecture
The system follows the existing Next.js App Router architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Forms     │ │    Pages    │ │ Components  │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Routes    │ │  Webhooks   │ │ Middleware  │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Utils     │ │   Services  │ │ Validation  │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   MongoDB   │ │   Schemas   │ │   Models    │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 External Services                           │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │   Paystack  │ │  WASender   │                           │
│  │             │ │             │                           │
│  └─────────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Pattern
Each payment feature follows this consistent flow:
1. **Form Submission** → Validate data and create payment request
2. **Payment Processing** → Initialize Paystack payment with callback
3. **Webhook Handling** → Receive payment confirmation and update database
4. **Notification** → Send confirmation via WASender API
5. **QR/Code Generation** → Generate access codes for services

## Components and Interfaces

### Frontend Components

#### Admin Dashboard Components
- `AdminDashboard` - Main dashboard layout with analytics overview
- `AnalyticsCards` - Revenue and attendance statistics cards
- `AttendeeTable` - Searchable table of all attendees with actions
- `PaymentHistory` - Comprehensive payment tracking across all services
- `QRCodeManager` - Interface for regenerating QR codes
- `ServiceBreakdown` - Visual breakdown of service utilization

#### Badge System Components
- `BadgeGenerator` - Photo upload and badge creation interface
- `BadgePreview` - Real-time preview of generated badge
- `BadgeGallery` - Public gallery of all generated badges
- `SocialShareButtons` - Share badge on social media platforms

#### Enhanced Form Components
- `MultiPersonSelector` - Component for adding multiple beneficiaries
- `PaymentSummary` - Detailed breakdown of costs before payment
- `ServiceSelector` - Unified service selection interface

### Database Schemas

#### DinnerReservation Schema
```typescript
interface IDinnerReservation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  numberOfGuests: number;
  guestDetails: Array<{
    name: string;
    email?: string;
    phone?: string;
    dietaryRequirements?: string;
  }>;
  specialRequests?: string;
  totalAmount: number;
  confirmed: boolean;
  qrCodes: Array<{
    guestName: string;
    qrCode: string;
    used: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Accommodation Schema
```typescript
interface IAccommodation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  accommodationType: 'standard' | 'premium' | 'luxury';
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  guestDetails: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  specialRequests?: string;
  totalAmount: number;
  confirmed: boolean;
  confirmationCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ConventionBrochure Schema
```typescript
interface IConventionBrochure extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  quantity: number;
  brochureType: 'digital' | 'physical'; // digital download or physical pickup
  recipientDetails: Array<{
    name: string;
    email?: string;
    phone?: string;
  }>;
  totalAmount: number;
  confirmed: boolean;
  qrCode: string; // For physical pickup verification
  collected: boolean; // Track if physical brochures were collected
  createdAt: Date;
  updatedAt: Date;
}
```

#### GoodwillMessage Schema
```typescript
interface IGoodwillMessage extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  message: string;
  donationAmount: number;
  attributionName?: string;
  anonymous: boolean;
  approved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Donation Schema
```typescript
interface IDonation extends Document {
  userId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  anonymous: boolean;
  onBehalfOf?: string;
  confirmed: boolean;
  receiptNumber: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### AttendeeBadge Schema
```typescript
interface IAttendeeBadge extends Document {
  userId: Types.ObjectId;
  badgeImageUrl: string; // Vercel Blob storage URL
  profilePhotoUrl: string; // Original uploaded photo
  attendeeName: string;
  attendeeTitle?: string;
  organization?: string;
  socialMediaShared: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### QRCodeHistory Schema
```typescript
interface IQRCodeHistory extends Document {
  userId: Types.ObjectId;
  serviceType: 'convention' | 'dinner' | 'accommodation' | 'brochure';
  serviceId: Types.ObjectId;
  oldQRCode: string;
  newQRCode: string;
  regeneratedBy: Types.ObjectId; // Admin who regenerated
  reason?: string;
  createdAt: Date;
}
```

### API Endpoints

#### Core Payment Endpoints
- `POST /api/v1/dinner` - Initialize dinner reservation payment
- `POST /api/v1/accommodation` - Initialize accommodation booking payment
- `POST /api/v1/brochure` - Initialize brochure purchase payment
- `POST /api/v1/goodwill` - Initialize goodwill message payment
- `POST /api/v1/donation` - Initialize donation payment

#### Badge System Endpoints
- `POST /api/v1/badge/generate` - Generate attendee badge with photo
- `GET /api/v1/badge/gallery` - Get all generated badges for gallery
- `POST /api/v1/badge/upload` - Upload badge image to Vercel Blob

#### Admin Dashboard Endpoints
- `GET /api/v1/admin/analytics` - Get comprehensive analytics
- `GET /api/v1/admin/attendees` - Get all attendees with details
- `GET /api/v1/admin/payments` - Get all payments across services
- `POST /api/v1/admin/qr/regenerate` - Regenerate QR code for attendee
- `GET /api/v1/admin/dashboard` - Get dashboard summary data

#### Management Endpoints
- `GET /api/v1/dinner` - Get dinner reservations (with pagination)
- `GET /api/v1/accommodation` - Get accommodation bookings
- `GET /api/v1/brochure` - Get brochure orders
- `GET /api/v1/goodwill` - Get goodwill messages
- `GET /api/v1/donation` - Get donations
- `PATCH /api/v1/goodwill/[id]/approve` - Approve goodwill message

#### Webhook Endpoints
- `POST /api/webhook/paystack` - Enhanced to handle all payment types
- `POST /api/webhook/whatsapp` - Enhanced for delivery confirmations

### Utility Classes

#### DinnerUtils
```typescript
class DinnerUtils {
  static async createReservation(data: DinnerReservationData): Promise<IDinnerReservation>
  static async confirmReservation(paymentReference: string): Promise<IDinnerReservation>
  static async generateQRCodes(reservationId: string): Promise<string[]>
  static async getUserReservations(userId: string): Promise<IDinnerReservation[]>
}
```

#### AccommodationUtils
```typescript
class AccommodationUtils {
  static async createBooking(data: AccommodationData): Promise<IAccommodation>
  static async confirmBooking(paymentReference: string): Promise<IAccommodation>
  static async generateConfirmationCode(): Promise<string>
  static async getUserBookings(userId: string): Promise<IAccommodation[]>
}
```

#### BrochureUtils
```typescript
class BrochureUtils {
  static async createOrder(data: BrochureOrderData): Promise<IConventionBrochure>
  static async confirmOrder(paymentReference: string): Promise<IConventionBrochure>
  static async generateTrackingNumber(): Promise<string>
  static async getUserOrders(userId: string): Promise<IConventionBrochure[]>
}
```

#### GoodwillUtils
```typescript
class GoodwillUtils {
  static async createMessage(data: GoodwillMessageData): Promise<IGoodwillMessage>
  static async confirmMessage(paymentReference: string): Promise<IGoodwillMessage>
  static async approveMessage(messageId: string, approvedBy: string): Promise<IGoodwillMessage>
  static async getPendingMessages(): Promise<IGoodwillMessage[]>
}
```

#### DonationUtils
```typescript
class DonationUtils {
  static async createDonation(data: DonationData): Promise<IDonation>
  static async confirmDonation(paymentReference: string): Promise<IDonation>
  static async generateReceiptNumber(): Promise<string>
  static async getUserDonations(userId: string): Promise<IDonation[]>
}
```

#### BadgeUtils
```typescript
class BadgeUtils {
  static async createBadge(data: BadgeData): Promise<IAttendeeBadge>
  static async uploadToVercelBlob(imageBuffer: Buffer, filename: string): Promise<string>
  static async generateBadgeImage(userPhoto: string, userDetails: UserDetails): Promise<Buffer>
  static async getAllBadges(): Promise<IAttendeeBadge[]>
  static async incrementDownloadCount(badgeId: string): Promise<void>
}
```

#### AdminUtils
```typescript
class AdminUtils {
  static async getAnalytics(): Promise<AnalyticsData>
  static async getAllAttendees(): Promise<AttendeeData[]>
  static async getAllPayments(): Promise<PaymentSummary[]>
  static async regenerateQRCode(serviceType: string, serviceId: string, adminId: string): Promise<string>
  static async getDashboardSummary(): Promise<DashboardSummary>
}
```

### Enhanced Services

#### PaymentService
```typescript
class PaymentService {
  static async initializePayment(data: PaymentInitData): Promise<PaystackResponse>
  static async verifyPayment(reference: string): Promise<PaymentVerification>
  static async handleWebhook(payload: PaystackWebhook): Promise<void>
  static determinePaymentType(reference: string): PaymentType
}
```

#### NotificationService
```typescript
class NotificationService {
  static async sendDinnerConfirmation(reservation: IDinnerReservation): Promise<void>
  static async sendAccommodationConfirmation(booking: IAccommodation): Promise<void>
  static async sendBrochureConfirmation(order: IConventionBrochure): Promise<void>
  static async sendGoodwillConfirmation(message: IGoodwillMessage): Promise<void>
  static async sendDonationThankYou(donation: IDonation): Promise<void>
}
```

#### QRCodeService
```typescript
class QRCodeService {
  static async generateQRCode(data: string): Promise<string>
  static async generateMultipleQRCodes(dataArray: string[]): Promise<string[]>
  static async validateQRCode(qrCode: string): Promise<boolean>
  static async regenerateQRCode(oldCode: string, serviceData: any): Promise<string>
}
```

#### VercelBlobService
```typescript
class VercelBlobService {
  static async uploadImage(imageBuffer: Buffer, filename: string): Promise<string>
  static async deleteImage(url: string): Promise<boolean>
  static async getImageMetadata(url: string): Promise<ImageMetadata>
}
```

#### AnalyticsService
```typescript
class AnalyticsService {
  static async getTotalAttendees(): Promise<number>
  static async getTotalRevenue(): Promise<RevenueBreakdown>
  static async getServiceBreakdown(): Promise<ServiceAnalytics>
  static async getPaymentTrends(): Promise<PaymentTrends>
  static async getTopDonors(): Promise<DonorData[]>
}
```

## Data Models

### Payment Reference Pattern
All payment references follow the pattern: `{type}_{timestamp}_{userPhone}`
- Dinner: `DINNER_1703123456_08012345678`
- Accommodation: `ACCOM_1703123456_08012345678`
- Brochure: `BROCH_1703123456_08012345678`
- Goodwill: `GOOD_1703123456_08012345678`
- Donation: `DONA_1703123456_08012345678`

### Multi-Person Data Structure
```typescript
interface PersonDetails {
  name: string;
  email?: string;
  phone?: string;
  additionalInfo?: Record<string, any>;
}

interface MultiPersonPayment {
  payerDetails: PersonDetails;
  beneficiaries: PersonDetails[];
  totalAmount: number;
  individualAmount: number;
}
```

### QR Code Format
```typescript
interface QRCodeData {
  type: 'convention' | 'dinner' | 'accommodation' | 'brochure' | 'goodwill' | 'donation';
  id: string;
  userId: string;
  guestName?: string;
  validUntil: Date;
  metadata: Record<string, any>;
}
```

### Badge Generation Data
```typescript
interface BadgeData {
  userId: string;
  profilePhoto: File | Buffer;
  attendeeName: string;
  attendeeTitle?: string;
  organization?: string;
}

interface BadgeTemplate {
  width: number;
  height: number;
  backgroundColor: string;
  logoUrl: string;
  fontFamily: string;
  textColor: string;
}
```

### Analytics Data Models
```typescript
interface AnalyticsData {
  totalAttendees: number;
  totalRevenue: number;
  revenueBreakdown: {
    convention: number;
    dinner: number;
    accommodation: number;
    brochure: number;
    goodwill: number;
    donations: number;
  };
  serviceStats: {
    conventionRegistrations: number;
    dinnerReservations: number;
    accommodationBookings: number;
    brochureOrders: number;
    goodwillMessages: number;
    totalDonations: number;
  };
  paymentTrends: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

interface DashboardSummary {
  todayStats: {
    newRegistrations: number;
    totalPayments: number;
    revenue: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    amount?: number;
  }>;
  pendingApprovals: {
    goodwillMessages: number;
    brochureOrders: number;
  };
}
```

## Error Handling

### Payment Error Handling
```typescript
enum PaymentErrorType {
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DUPLICATE_REFERENCE = 'DUPLICATE_REFERENCE',
  WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED'
}

interface PaymentError {
  type: PaymentErrorType;
  message: string;
  reference?: string;
  userId?: string;
}
```

### Database Error Handling
- Implement transaction rollback for failed payments
- Handle duplicate key errors gracefully
- Provide meaningful error messages to users
- Log all errors for debugging

### External Service Error Handling
- Retry logic for Paystack API calls
- Fallback mechanisms for WASender API failures
- Circuit breaker pattern for external service calls

## Testing Strategy

### Unit Testing
- Test all utility classes with mock data
- Test payment processing logic
- Test QR code generation and validation
- Test multi-person payment calculations

### Integration Testing
- Test complete payment flows end-to-end
- Test webhook handling with mock Paystack events
- Test database operations with test database
- Test external API integrations with mock services

### API Testing
- Test all API endpoints with various input scenarios
- Test error handling and edge cases
- Test authentication and authorization
- Test rate limiting and request validation

### Frontend Testing
- Test form validation and submission
- Test payment flow user experience
- Test responsive design across devices
- Test accessibility compliance

### Performance Testing
- Load testing for concurrent payments
- Database query optimization testing
- API response time testing
- Memory usage monitoring

## Security Considerations

### Payment Security
- Validate all payment amounts server-side
- Implement payment reference uniqueness
- Secure webhook endpoint verification
- PCI compliance for payment data handling

### Data Protection
- Encrypt sensitive user data
- Implement proper access controls
- Audit trail for all payment operations
- GDPR compliance for user data

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Authentication & Authorization
- Secure user session management
- Role-based access control for admin functions
- API key management for external services
- Secure password handling

## Admin Dashboard Features

### Dashboard Overview
- **Real-time Analytics**: Live updates of registrations, payments, and revenue
- **Service Breakdown**: Visual charts showing utilization of each service
- **Recent Activity Feed**: Timeline of recent registrations and payments
- **Quick Actions**: One-click access to common admin tasks

### Attendee Management
- **Comprehensive Attendee List**: All registered attendees with service details
- **Search and Filter**: Find attendees by name, email, service type, or payment status
- **QR Code Regeneration**: Ability to regenerate QR codes for any service
- **Bulk Operations**: Export attendee data, send bulk notifications

### Payment Analytics
- **Revenue Dashboard**: Total revenue with breakdown by service type
- **Payment Trends**: Historical payment data with trend analysis
- **Outstanding Payments**: Track pending and failed payments
- **Refund Management**: Handle refund requests and processing

### Content Management
- **Goodwill Message Approval**: Review and approve submitted goodwill messages
- **Badge Gallery Management**: Moderate badge submissions and featured badges
- **Brochure Distribution**: Track digital downloads and physical pickups

### Badge System Features

#### Badge Generation Process
1. **Photo Upload**: Users upload profile photo (max 5MB, JPG/PNG)
2. **Information Input**: Name, title, organization details
3. **Template Selection**: Choose from predefined badge templates
4. **Preview Generation**: Real-time preview with user data
5. **Final Generation**: Create high-resolution badge image
6. **Vercel Blob Upload**: Store generated badge in cloud storage
7. **Database Record**: Save badge metadata and URLs

#### Badge Gallery
- **Public Gallery**: Display all generated badges (with user consent)
- **Social Sharing**: Direct sharing to Facebook, Twitter, LinkedIn, Instagram
- **Download Tracking**: Monitor badge download statistics
- **Featured Badges**: Admin-curated featured badge section

#### Badge Template System
- **Responsive Design**: Badges work across different social media platforms
- **Brand Consistency**: GOSA branding and color scheme
- **Multiple Formats**: Square (Instagram), Rectangle (Facebook/Twitter), Story format
- **High Resolution**: Print-quality output for physical use

This design provides a comprehensive foundation for implementing all additional payment features, admin dashboard, and badge system while maintaining consistency with the existing system architecture and ensuring scalability, security, and maintainability.