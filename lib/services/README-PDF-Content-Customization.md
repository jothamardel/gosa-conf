# PDF Content Customization for Each Service Type

This document describes the enhanced PDF content customization implemented for each service type in the GOSA 2025 Convention system.

## Overview

The PDF Generator Service now provides highly customized PDF content for each service type, with detailed information, service-specific features, and enhanced user experience. Each PDF includes:

- Service-specific branding and styling
- Detailed information relevant to the service
- QR codes for verification and access
- Professional formatting with GOSA branding
- Comprehensive instructions and guidelines

## Service-Specific Customizations

### 1. Convention Registration PDF

**Features:**
- Complete convention schedule and highlights
- Registration details with accommodation information
- Additional attendees information (if applicable)
- Convention access instructions
- Daily schedule overview

**Content Sections:**
- Personal Information
- Convention Registration Information
- Convention Schedule Highlights
- QR Code for entrance

**Additional Information Parsing:**
- Quantity of attendees
- Accommodation type (Standard, Premium, Luxury)
- Additional persons details
- Special requests

**Example Content:**
```
Convention Registration Information
- Registration Type: Full Convention Access
- Convention Dates: December 26-29, 2025
- Venue: GOSA Convention Center
- Check-in Time: 8:00 AM - 10:00 AM Daily
- Total Attendees: 2 person(s)
- Accommodation: Premium Room

Convention Schedule Highlights:
Day 1 (Dec 26): Registration, Welcome Ceremony, Opening Sessions
Day 2 (Dec 27): Workshops, Panel Discussions, Cultural Activities
Day 3 (Dec 28): Main Sessions, Gala Dinner, Awards Ceremony
Day 4 (Dec 29): Final Sessions, Closing Ceremony, Networking
```

### 2. Dinner Reservation PDF

**Features:**
- Detailed event information and schedule
- Guest information with individual details
- Evening program timeline
- Complete dinner menu
- Dress code and arrival instructions

**Content Sections:**
- Personal Information
- Dinner Reservation Details
- Guest Information (if multiple guests)
- Evening Program
- Dinner Menu
- Special Requests
- Important Notes

**Additional Information Parsing:**
- Number of guests
- Guest details (names, emails, dietary restrictions)
- Special requests
- Seating preferences

**Example Content:**
```
Dinner Reservation Details
- Event: GOSA 2025 Convention Gala Dinner
- Date & Time: December 28, 2025 at 7:00 PM
- Venue: Grand Ballroom, GOSA Convention Center
- Dress Code: Formal/Black Tie
- Total Guests: 3 person(s)

Evening Program:
6:30 PM: Cocktail reception and networking
7:00 PM: Welcome remarks and dinner service begins
8:30 PM: Cultural performances and entertainment
9:00 PM: Awards ceremony and recognition
9:30 PM: Dancing and continued networking
11:00 PM: Event conclusion

Dinner Menu:
Appetizer: Pan-seared scallops with cauliflower purée
Main Course: Choice of herb-crusted salmon or beef tenderloin
Dessert: Chocolate lava cake with vanilla ice cream
Beverages: Wine pairings, soft drinks, coffee, and tea
```

### 3. Accommodation Booking PDF

**Features:**
- Detailed hotel and room information
- Room type-specific amenities
- Check-in/check-out instructions
- Hotel facilities and services
- Confirmation code and contact information

**Content Sections:**
- Personal Information
- Accommodation Booking Details
- Room Features & Amenities (type-specific)
- Hotel Amenities Included
- Special Requests
- Check-in Instructions

**Room Types:**
- **Standard Room**: Basic amenities, standard view, essential services
- **Premium Room**: Enhanced amenities, better view, continental breakfast
- **Luxury Suite**: Premium amenities, city view, full breakfast, concierge

**Example Content:**
```
Accommodation Booking Details
- Hotel: GOSA Convention Hotel
- Room Type: Premium Room
- Check-in Date: December 25, 2025 (3:00 PM)
- Check-out Date: December 30, 2025 (11:00 AM)
- Number of Guests: 2 person(s)
- Confirmation Code: GOSA-ABC12345

Premium Room Features:
• Comfortable room with modern furnishings
• Queen-size bed with quality linens
• Updated bathroom with shower/tub combo
• City or garden view
• Coffee maker and mini-fridge
• 42" Smart TV with cable channels
• Work desk and chair
• Complimentary continental breakfast
• Enhanced room service options
```

### 4. Brochure Order PDF

**Features:**
- Detailed brochure contents (120+ pages)
- Format-specific delivery information
- Recipient information for multiple copies
- Processing timeline
- Comprehensive content overview

**Content Sections:**
- Personal Information
- Brochure Order Information
- Recipient Information (if multiple)
- Brochure Contents (10 sections)
- Additional Features
- Delivery Instructions

**Brochure Sections:**
1. Welcome & Convention Overview
2. Complete program schedule and session details
3. Keynote speakers and presenter profiles
4. Workshop descriptions and learning objectives
5. Venue maps and facility information
6. Local area guide and dining recommendations
7. GOSA history and organizational structure
8. Member directory and networking guide
9. Sponsor recognition and advertisements
10. Contact information and resources

**Example Content:**
```
Brochure Order Information
- Publication: GOSA 2025 Convention Brochure
- Format: Physical
- Quantity: 3 copies
- Delivery Method: Pickup
- Processing Time: 2-3 business days

Additional Features:
• High-quality full-color printing (physical copies)
• Interactive links and bookmarks (digital copies)
• QR codes for quick access to online resources
• Tear-out maps and quick reference guides
• Note-taking sections for each session
• Convention evaluation forms
• Post-convention resource links
```

### 5. Goodwill Message PDF

**Features:**
- Personal message display
- Donation impact information
- Attribution handling (anonymous/named)
- Approval status
- Community impact details

**Content Sections:**
- Personal Information
- Goodwill Message & Donation
- Your Message (formatted display)
- Impact of Your Contribution
- Thank You message

**Example Content:**
```
Goodwill Message & Donation
- Message Type: Convention Goodwill Message
- Donation Amount: ₦25,000
- Attribution: John Doe
- Status: CONFIRMED

Your Message:
"Wishing everyone a successful and inspiring convention. 
May this gathering bring light and truth to all who attend."

Impact of Your Contribution:
• Supports convention programming and activities
• Helps provide scholarships for attendees in need
• Contributes to GOSA's community outreach programs
• Enables enhanced convention experiences for all
• Supports the organization's mission of "Light and Truth"
```

### 6. Donation Receipt PDF

**Features:**
- Official tax-deductible receipt
- Detailed fund allocation breakdown
- Tax information and compliance
- Organization details
- Impact statement

**Content Sections:**
- Personal Information
- Official Donation Receipt
- Donation Made On Behalf Of (if applicable)
- How Your Donation Helps (with percentages)
- Tax Information
- Thank You & Official Acknowledgment

**Fund Allocation:**
- Educational Initiatives (40%)
- Community Outreach (30%)
- Convention & Events (20%)
- Organizational Operations (10%)

**Example Content:**
```
Official Donation Receipt
- Donation Type: General Convention Support
- Amount: ₦50,000
- Receipt Number: GOSA-123456-ABCD
- Tax Year: 2025
- Donor Attribution: Named Donor
- Tax Deductible: Yes (where applicable by law)

How Your Donation Helps:
Your generous contribution of ₦50,000 directly supports GOSA's mission:

Educational Initiatives (40%):
• Workshops and professional development programs
• Educational scholarships and grants
• Research and publication projects

Community Outreach (30%):
• Community service projects
• Youth mentorship programs
• Cultural preservation activities

Tax Information:
• Organization: GOSA (Graduate Organization of Student Affairs)
• Tax-Exempt Status: 501(c)(3) equivalent (where applicable)
• Tax ID: XX-XXXXXXX
• No goods or services were provided in exchange for this donation
```

## Technical Implementation

### Data Parsing

Each service type has dedicated parsing methods to extract relevant information from the `additionalInfo` field:

- `parseConventionAdditionalInfo()` - Extracts quantity, accommodation type, additional persons
- `parseDinnerAdditionalInfo()` - Extracts guest count, guest details, special requests
- `parseAccommodationAdditionalInfo()` - Extracts room type, dates, guest count, special requests
- `parseBrochureAdditionalInfo()` - Extracts format, quantity, delivery method, recipients
- `parseDonationAdditionalInfo()` - Extracts anonymity, donor name, "on behalf of" information

### Content Formatting

Each service type has a dedicated formatting method:

- `formatConventionContent()` - Convention-specific sections and information
- `formatDinnerContent()` - Dinner event details and guest management
- `formatAccommodationContent()` - Hotel and room information with amenities
- `formatBrochureContent()` - Publication details and delivery information
- `formatGoodwillContent()` - Message display and donation impact
- `formatDonationContent()` - Official receipt with tax information

### Helper Methods

Supporting methods provide additional functionality:

- `getRoomFeatures()` - Room type-specific amenities
- `getBrochureDeliveryInstructions()` - Format-specific delivery instructions
- `generateReceiptNumber()` - Unique receipt number generation
- `extractMessageFromAdditionalInfo()` - Message extraction from goodwill data
- `getAttributionFromAdditionalInfo()` - Attribution handling for donations/goodwill

## Styling and Design

### Visual Elements

- **Color Scheme**: GOSA green (#16A34A) and amber (#F59E0B)
- **Typography**: Arial font family with hierarchical sizing
- **Layout**: Grid-based responsive design
- **Branding**: GOSA logo placeholder and consistent branding

### Section Styling

- **Headers**: Gradient backgrounds with decorative elements
- **Sections**: Rounded corners with subtle shadows
- **Info Items**: Clean grid layout with labeled values
- **Status Indicators**: Color-coded status badges
- **QR Codes**: Centered with instructions and styling

### Responsive Design

- Print-optimized layouts
- Mobile-friendly viewing
- Consistent spacing and typography
- Professional appearance across devices

## Usage Examples

### Basic PDF Generation

```typescript
import { PDFGeneratorService } from '@/lib/services/pdf-generator.service';

const pdfData = {
  userDetails: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    registrationId: 'REG123'
  },
  operationDetails: {
    type: 'convention',
    amount: 50000,
    paymentReference: 'CONV_123456',
    date: new Date(),
    status: 'confirmed',
    description: 'GOSA 2025 Convention Registration',
    additionalInfo: 'Quantity: 2 | Premium accommodation | Additional Persons: 1'
  },
  qrCodeData: JSON.stringify({ type: 'convention', id: 'REG123' })
};

const html = await PDFGeneratorService.generatePDFHTML(pdfData);
const buffer = await PDFGeneratorService.generatePDFBuffer(pdfData);
```

### Service-Specific Examples

```typescript
// Dinner reservation with guests
const dinnerData = {
  // ... user details
  operationDetails: {
    type: 'dinner',
    // ... other details
    additionalInfo: 'Guests: 3 | Guest Names: Jane Doe, Bob Smith | Special Requests: Vegetarian meals'
  }
};

// Luxury accommodation
const accommodationData = {
  // ... user details
  operationDetails: {
    type: 'accommodation',
    // ... other details
    additionalInfo: 'Type: Luxury | Guests: 2 | Special Requests: Late checkout'
  }
};

// Anonymous donation
const donationData = {
  // ... user details
  operationDetails: {
    type: 'donation',
    // ... other details
    additionalInfo: 'Anonymous: Yes | On Behalf Of: Family Foundation'
  }
};
```

## Testing

Comprehensive test suite covers:

- All service types with various configurations
- Edge cases and error handling
- Content parsing and formatting
- PDF generation and styling
- Filename generation and sanitization

Run tests:
```bash
npm test lib/services/__tests__/pdf-content-customization.test.ts
```

## Future Enhancements

### Planned Features

1. **Multi-language Support**: Localized content for different languages
2. **Custom Branding**: Organization-specific branding and colors
3. **Interactive Elements**: Clickable links and form fields in PDFs
4. **Digital Signatures**: Secure document signing capabilities
5. **Template Customization**: User-configurable PDF templates

### Performance Optimizations

1. **Template Caching**: Cache compiled templates for faster generation
2. **Image Optimization**: Optimize images and QR codes for smaller file sizes
3. **Lazy Loading**: Load content sections on demand
4. **Batch Processing**: Generate multiple PDFs efficiently

### Integration Enhancements

1. **Email Integration**: Direct PDF delivery via email
2. **Cloud Storage**: Automatic PDF backup to cloud storage
3. **Analytics**: Track PDF generation and download metrics
4. **API Endpoints**: RESTful APIs for external PDF generation

## Troubleshooting

### Common Issues

1. **Missing Content**: Check `additionalInfo` parsing methods
2. **Styling Issues**: Verify CSS classes and template structure
3. **QR Code Errors**: Ensure QR code data is valid JSON
4. **Performance**: Monitor PDF generation time and optimize templates

### Debug Mode

Enable debug logging:
```typescript
process.env.PDF_DEBUG = 'true';
```

### Error Handling

The system includes comprehensive error handling:
- Graceful fallbacks for missing data
- Validation of input parameters
- Detailed error logging
- User-friendly error messages

## Support

For technical support or questions about PDF content customization:

- Email: tech-support@gosa.org
- Documentation: [Internal Wiki]
- Issue Tracking: [GitHub Issues]
- Code Reviews: [Pull Request Process]