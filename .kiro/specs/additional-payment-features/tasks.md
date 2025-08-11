# Implementation Plan

- [x] 1. Set up database schemas and models for additional services
  - Create MongoDB schemas for dinner reservations, accommodation, brochures, goodwill messages, donations, and badges
  - Implement Mongoose models with proper validation and indexing
  - Add virtual population relationships to existing User schema
  - _Requirements: 1.5, 2.5, 3.5, 4.5, 5.5, 7.5_

- [x] 2. Create utility classes for new payment services
- [x] 2.1 Implement DinnerUtils class
  - Write methods for creating, confirming, and managing dinner reservations
  - Implement QR code generation for multiple guests
  - Add guest detail management and dietary requirement handling
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 2.2 Implement AccommodationUtils class
  - Write methods for creating and confirming accommodation bookings
  - Implement confirmation code generation
  - Add date validation and pricing calculation logic
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 2.3 Implement BrochureUtils class
  - Write methods for creating and confirming brochure orders
  - Implement QR code generation for physical pickup verification
  - Add digital/physical type handling
  - _Requirements: 3.4, 3.5, 3.6_

- [x] 2.4 Implement GoodwillUtils class
  - Write methods for creating, confirming, and approving goodwill messages
  - Implement message validation and approval workflow
  - Add anonymous/attributed message handling
  - _Requirements: 4.4, 4.5, 4.7_

- [x] 2.5 Implement DonationUtils class
  - Write methods for creating and confirming donations
  - Implement receipt number generation
  - Add anonymous donation handling and attribution logic
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 3. Create API endpoints for payment processing
- [x] 3.1 Implement dinner reservation API endpoint
  - Create POST /api/v1/dinner route for payment initialization
  - Implement form validation and multi-person booking support
  - Integrate with existing Paystack payment flow
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_

- [x] 3.2 Implement accommodation booking API endpoint
  - Create POST /api/v1/accommodation route for payment initialization
  - Implement date validation and room type pricing
  - Add multi-guest booking support
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

- [x] 3.3 Implement brochure purchase API endpoint
  - Create POST /api/v1/brochure route for payment initialization
  - Implement digital/physical type selection
  - Add quantity-based pricing calculation
  - _Requirements: 3.1, 3.2, 3.4, 6.1, 6.2_

- [x] 3.4 Implement goodwill message API endpoint
  - Create POST /api/v1/goodwill route for payment initialization
  - Implement message validation and donation amount handling
  - Add attribution and anonymity options
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2_

- [x] 3.5 Implement donation API endpoint
  - Create POST /api/v1/donation route for payment initialization
  - Implement custom amount validation with minimum limits
  - Add anonymous donation and behalf-of functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

- [x] 4. Enhance webhook handling for new payment types
  - Update existing Paystack webhook to handle all new payment types
  - Implement payment type detection from reference patterns
  - Add proper database updates and QR code generation for each service
  - Integrate WASender API notifications for all payment confirmations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [x] 5. Implement badge generation system
- [x] 5.1 Create badge database schema and utilities
  - Implement AttendeeBadge schema with Vercel Blob integration
  - Create BadgeUtils class for badge creation and management
  - Add Vercel Blob service integration for image storage
  - _Requirements: Badge system functionality_

- [x] 5.2 Implement badge generation API endpoints
  - Create POST /api/v1/badge/generate for badge creation
  - Implement image upload and processing logic
  - Add badge template system with GOSA branding
  - Create GET /api/v1/badge/gallery for public badge display
  - _Requirements: Badge system functionality_

- [x] 5.3 Create badge generation frontend components
  - Build BadgeGenerator component with photo upload
  - Implement BadgePreview with real-time preview
  - Create BadgeGallery component for public display
  - Add social media sharing functionality
  - _Requirements: Badge system functionality_

- [x] 6. Build admin dashboard system
- [x] 6.1 Create admin analytics utilities and APIs
  - Implement AdminUtils class with comprehensive analytics methods
  - Create AnalyticsService for data aggregation and reporting
  - Build GET /api/v1/admin/analytics endpoint with full metrics
  - Add GET /api/v1/admin/dashboard for summary data
  - _Requirements: Admin dashboard functionality_

- [x] 6.2 Implement QR code regeneration system
  - Create QRCodeHistory schema for audit trail
  - Implement QR code regeneration logic in QRCodeService
  - Build POST /api/v1/admin/qr/regenerate endpoint
  - Add proper validation and admin authorization
  - _Requirements: Admin QR code management_

- [x] 6.3 Create admin dashboard frontend components
  - Build AdminDashboard main layout component
  - Implement AnalyticsCards for key metrics display
  - Create AttendeeTable with search, filter, and actions
  - Build PaymentHistory component for transaction tracking
  - Add QRCodeManager interface for code regeneration
  - _Requirements: Admin dashboard functionality_

- [x] 7. Update existing form components with payment integration
- [x] 7.1 Enhance dinner form component
  - Update existing dinner form to integrate with new API endpoint
  - Implement multi-person guest selection and details collection
  - Add dietary requirements and special requests handling
  - Integrate with Paystack payment flow and confirmation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 7.2 Enhance accommodation form component
  - Update existing accommodation form with new booking logic
  - Implement date selection and room type pricing display
  - Add multi-guest booking interface
  - Integrate with payment processing and confirmation flow
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

- [x] 7.3 Enhance brochure form component
  - Update existing brochure form with digital/physical options
  - Implement quantity selection and pricing calculation
  - Add recipient details collection for multiple orders
  - Integrate with payment flow and QR code generation
  - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7_

- [x] 7.4 Enhance goodwill message form component
  - Update existing goodwill form with message validation
  - Implement custom donation amount input with validation
  - Add attribution and anonymity option controls
  - Integrate with payment processing and approval workflow
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 7.5 Enhance donation form component
  - Update existing donation form with improved amount selection
  - Implement anonymous donation toggle and behalf-of options
  - Add donor information collection with conditional fields
  - Integrate with payment processing and receipt generation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

- [x] 8. Implement notification system enhancements
  - Update NotificationService to handle all new payment types
  - Create service-specific notification templates for WASender API
  - Implement QR code and confirmation code delivery via WhatsApp
  - Add notification preferences and delivery status tracking
  - _Requirements: 1.6, 2.7, 3.6, 4.6, 5.7, 7.6_

- [x] 9. Create management API endpoints for admin operations
  - Implement GET endpoints for all services with pagination and filtering
  - Create PATCH /api/v1/goodwill/[id]/approve for message approval
  - Add GET /api/v1/admin/attendees with comprehensive attendee data
  - Build GET /api/v1/admin/payments for cross-service payment tracking
  - _Requirements: Admin management functionality_

- [x] 10. Add comprehensive error handling and validation
  - Implement proper error handling for all payment flows
  - Add input validation for all form submissions and API endpoints
  - Create user-friendly error messages and recovery options
  - Add logging and monitoring for payment processing errors
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 11. Implement QR code and confirmation system integration
  - Update existing QR code generation to support all service types
  - Implement unique QR code formats for each service
  - Add QR code validation and usage tracking
  - Create confirmation code systems for non-QR services
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 12. Create admin approval workflow for goodwill messages
  - Build admin interface for reviewing pending goodwill messages
  - Implement approval/rejection workflow with notifications
  - Add bulk approval operations for efficiency
  - Create public display system for approved messages
  - _Requirements: 4.7, Admin goodwill management_

- [x] 13. Add comprehensive testing suite
  - Write unit tests for all utility classes and services
  - Create integration tests for payment flows and webhook handling
  - Add API endpoint testing with various scenarios
  - Implement frontend component testing for forms and dashboard
  - _Requirements: System reliability and quality assurance_

- [x] 14. Implement final integration and deployment preparation
  - Test complete end-to-end flows for all payment types
  - Verify webhook handling and notification delivery
  - Validate admin dashboard functionality and analytics accuracy
  - Perform security audit and performance optimization
  - _Requirements: System integration and production readiness_