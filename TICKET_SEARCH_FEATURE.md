# Admin Ticket Search Feature

## Overview
A comprehensive admin panel feature for searching and managing tickets by payment reference. This feature allows administrators to quickly find tickets, check attendees in/out, regenerate QR codes, and download PDFs.

## Features

### 🔍 Smart Search
- Search tickets by payment reference (e.g., `ul8te9lmyj_23480xxxxxxxx`)
- Automatically extracts search pattern before underscore (`ul8te9lmyj`)
- Searches across all ticket types: Convention, Dinner, Brochure, Accommodation

### 📋 Ticket Management
- **Check In/Out**: Toggle attendee check-in status
- **QR Code Regeneration**: Generate new QR codes and send via WhatsApp
- **PDF Download**: Download ticket PDFs directly to local machine
- **Status Tracking**: View ticket status, payment info, and check-in history

### 📊 Comprehensive Display
- User information (name, email, phone)
- Ticket details (amount, creation date, status)
- Check-in/out timestamps and history
- Guest details for dinner reservations
- Collection status and timestamps

## Usage

### Access
1. Navigate to Admin Dashboard
2. Click on "Ticket Search" tab
3. Or visit `/admin/tickets` directly

### Search Process
1. Enter full or partial payment reference
2. Click "Search" button
3. View results with all matching tickets
4. Use action buttons for ticket management

### Actions Available
- **Check In**: Mark attendee as present
- **Check Out**: Mark attendee as left (temporary)
- **Regenerate & Send**: Create new QR code and send via WhatsApp
- **Download PDF**: Get ticket PDF file

## API Endpoints

### Search Tickets
```
GET /api/v1/admin/tickets/search?reference={paymentReference}
```

### Check In/Out
```
POST /api/v1/scan/check-in
POST /api/v1/scan/check-out
```

### QR Regeneration
```
POST /api/v1/admin/qr/regenerate
```

### PDF Download
```
GET /api/v1/pdf/download?ref={paymentReference}
```

## Files Created/Modified

### New Files
- `app/api/v1/admin/tickets/search/route.ts` - Search API endpoint
- `app/admin/tickets/page.tsx` - Standalone ticket search page
- `components/admin/ticket-search.tsx` - Main search component

### Modified Files
- `components/admin/admin-dashboard.tsx` - Added ticket search tab

## Technical Details

### Search Logic
- Extracts pattern before underscore from payment reference
- Uses regex search across all ticket collections
- Returns unified ticket format with user details populated

### Security
- Admin authentication required
- Rate limiting on API endpoints
- Secure PDF download with proper headers

### Error Handling
- Comprehensive error messages
- Loading states for all actions
- Toast notifications for user feedback

## Example Usage

```typescript
// Search for tickets with reference "ul8te9lmyj_23480123456"
// Will find all tickets starting with "ul8te9lmyj"

const searchResults = await fetch('/api/v1/admin/tickets/search?reference=ul8te9lmyj_23480123456');
```

## Benefits
- **Quick Access**: Find any ticket instantly by reference
- **Unified Management**: Handle all ticket types in one interface  
- **Real-time Actions**: Immediate check-in/out and QR regeneration
- **Complete History**: Full audit trail of all ticket activities
- **Mobile Friendly**: Responsive design for on-site management