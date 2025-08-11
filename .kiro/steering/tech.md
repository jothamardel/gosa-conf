# Technology Stack

## Framework & Runtime
- **Next.js 13.5.1** - React framework with App Router
- **React 18.2.0** - UI library
- **TypeScript 5.2.2** - Type safety
- **Node.js** - Runtime environment

## Database & Data
- **MongoDB** - Primary database with Mongoose ODM
- **Mongoose 8.16.5** - MongoDB object modeling
- Mock database layer in `lib/database.ts` for development

## Styling & UI
- **Tailwind CSS 3.3.3** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI primitives
- **Radix UI** - Headless UI components for accessibility
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

## Forms & Validation
- **React Hook Form 7.53.0** - Form state management
- **Zod 3.23.8** - Schema validation
- **@hookform/resolvers** - Form validation integration

## Authentication & Session
- **NextAuth.js 4.24.5** - Authentication solution
- **next-themes** - Theme management

## Payment & External APIs
- **Paystack** - Payment processing (custom integration in `lib/paystack-api/`)
- **WASender API** - WhatsApp messaging (integration in `lib/wasender-api/`)
- **Axios 1.11.0** - HTTP client

## QR Code & Scanning
- **qrcode 1.5.4** - QR code generation
- **react-qr-scanner** - QR code scanning component

## Development Tools
- **ESLint** - Code linting (builds ignore linting errors)
- **tsx** - TypeScript execution for development

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
# MongoDB connection via MONGODB_URI environment variable
# Mock database functions available in lib/database.ts for development
```

## Environment Variables Required
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL
- Payment provider credentials (Paystack)
- WASender API credentials