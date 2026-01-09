# Link Finder Utility Tool

## Overview

A developer-focused utility tool for finding and extracting links from movie content sources. The application scrapes movie listings from external sources, extracts download links matching specific patterns (mdrive.today), and provides WordPress integration for content publishing. Built with a modern React frontend and Express backend, following developer tool design principles inspired by Linear, GitHub Dark, and VS Code.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Build Tool**: Vite with HMR support and Replit-specific plugins

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js native http server wrapping Express
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Development**: tsx for TypeScript execution, Vite middleware for frontend serving

### Build System
- **Frontend Build**: Vite outputs to `dist/public`
- **Backend Build**: esbuild bundles server code to `dist/index.cjs`
- **Optimization**: Selective dependency bundling via allowlist to reduce cold start times

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Migrations**: Drizzle Kit with migrations output to `./migrations`
- **Runtime Storage**: MemStorage class for in-memory user data (can be extended to database)

### Project Structure
```
client/           # React frontend application
  src/
    components/ui/  # shadcn/ui components
    pages/          # Route components
    hooks/          # Custom React hooks
    lib/            # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Data storage abstraction
  static.ts       # Static file serving
  vite.ts         # Vite dev server integration
shared/           # Shared types and schemas
  schema.ts       # Zod schemas and TypeScript interfaces
```

### Design System
- **Typography**: Inter (primary), JetBrains Mono (code/URLs)
- **Layout**: Single-column, max-width 900px, centered
- **Spacing**: Tailwind utility scale (2, 4, 6, 8, 12, 16)
- **Theme**: Developer-focused with high contrast, clear visual states

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database access and schema management
- **connect-pg-simple**: PostgreSQL session store (available for session management)

### Third-Party Services
- **WordPress REST API**: Content publishing integration for creating posts with authentication via application passwords
- **External Content Sources**: Web scraping from moviesdrive.forum for movie listings and link extraction

### Key NPM Dependencies
- **UI**: Radix UI primitives, Lucide icons, class-variance-authority
- **Forms**: react-hook-form with Zod resolver
- **Data**: @tanstack/react-query for async state management
- **Validation**: Zod for runtime type validation
- **Utilities**: date-fns, clsx, tailwind-merge