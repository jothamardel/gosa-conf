# Project Structure

## Root Configuration
- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration (ESLint disabled for builds, unoptimized images)
- `tailwind.config.ts` - Tailwind CSS configuration with custom theme
- `tsconfig.json` - TypeScript configuration
- `components.json` - shadcn/ui configuration with path aliases

## Application Structure (Next.js App Router)

### `/app` - Application routes and layouts
- `layout.tsx` - Root layout with providers and global styles
- `page.tsx` - Homepage
- `globals.css` - Global styles and Tailwind imports

#### Route Pages
- `/register` - Registration form
- `/signin` - Authentication
- `/profile` - User profile management
- `/checkin` - QR code scanner for check-ins
- `/accommodation` - Accommodation booking
- `/dinner` - Dinner ticket booking
- `/donate` - Donation form
- `/goodwill` - Goodwill message submission
- `/brochure` - Convention brochure
- `/agenda` - Event agenda

#### API Routes (`/app/api`)
- `/api/v1/register` - Registration endpoint
- `/api/v1/check-in` - Check-in processing
- `/api/webhook/paystack` - Payment webhooks
- `/api/webhook/whatsapp` - WhatsApp webhooks

## Components Architecture

### `/components` - Reusable components
- `/ui` - shadcn/ui components (buttons, forms, dialogs, etc.)
- `/forms` - Feature-specific form components
- `/sections` - Homepage sections (hero, about, features, gallery)
- `/layout` - Layout components
- `/checkin` - Check-in scanner components
- `/agenda` - Event agenda components
- `providers.tsx` - Context providers wrapper

## Library Structure

### `/lib` - Business logic and utilities
- `database.ts` - Mock database functions (development)
- `mongodb.ts` - MongoDB connection management
- `types.ts` - TypeScript type definitions
- `utils.ts` - General utility functions

#### Subdirectories
- `/schema` - Zod validation schemas
- `/utils` - Feature-specific utilities
- `/paystack-api` - Payment processing integration
- `/wasender-api` - WhatsApp messaging integration

## Data Layer Patterns

### Type Definitions
- Interface-based type system in `lib/types.ts`
- Separate interfaces for database models, form data, and API responses
- Generic `ApiResponse<T>` and `PaymentRecord` interfaces

### Database Abstraction
- Mock database layer for development (`lib/database.ts`)
- Production MongoDB integration (`lib/mongodb.ts`)
- Consistent async/await patterns
- Centralized error handling

## Path Aliases (configured in components.json)
- `@/components` → `./components`
- `@/lib` → `./lib`
- `@/hooks` → `./hooks`
- `@/ui` → `./components/ui`

## Styling Conventions
- Tailwind utility classes
- Custom CSS variables for theming
- Component-specific styles in same file
- Responsive design patterns
- Custom color palette (primary green #16A34A, secondary amber #F59E0B)

## File Naming
- `kebab-case` for files and directories
- `PascalCase` for React components
- `camelCase` for functions and variables
- `.tsx` for React components, `.ts` for utilities