# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The **wyt-enhanced** project is an Intelligence, Surveillance, and Reconnaissance (ISR) Platform - a cloud-native system for multi-protocol wireless signal analysis with geospatial intelligence capabilities. It features a hybrid monorepo architecture with containerized microservices.

## Architecture Structure

### Root Level (`/`)
- Nx workspace management and orchestration
- Global test configurations and utilities
- Documentation (`/docs/` - architecture specs, PRDs, intelligence queries)
- Implementation summaries and deployment guides

### ISR Platform Core (`/isr-platform/`)
- **Apps:**
  - `/apps/api/` - Express backend with Prisma ORM
  - `/apps/isr-app/` - React frontend with Leaflet mapping
- **Libraries:** `/libs/` - Shared code and utilities
- **Database:** PostgreSQL 16 with PostGIS extensions
- **Gateway:** Caddy for reverse proxy and SSL

## Development Commands

### Initial Setup
```bash
# Install root dependencies first
npm install

# Navigate to ISR platform and install core dependencies
cd isr-platform
npm install

# Setup database
npx prisma migrate dev
npx prisma generate
```

### Development Workflow
```bash
# From /isr-platform directory:

# Start all services concurrently
npm run serve
# OR specific service
npx nx serve isr-app     # Frontend on port 4200
npx nx serve api         # Backend on port 3000

# Build applications
npm run build            # Build all
npx nx build isr-app     # Build specific app

# Run tests
npm run test             # Test all
npx nx test isr-app      # Test specific app
npx nx test api --watch  # Watch mode for API tests

# Linting
npx nx lint isr-app
npx nx lint api
```

### Database Management
```bash
# From /isr-platform directory:
npx prisma studio        # Open Prisma Studio GUI
npx prisma migrate dev   # Run migrations
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma client
```

### Docker Deployment
```bash
# From /isr-platform directory:
docker-compose up        # Start all services
docker-compose up --build # Rebuild and start
docker-compose down      # Stop services
docker-compose down -v   # Stop and remove volumes
```

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Zustand, React Router
- **Backend:** Express.js, TypeScript, Prisma ORM, PostgreSQL/PostGIS
- **Testing:** Jest, React Testing Library, ts-jest
- **Build:** Nx 21.4.1, Docker, Docker Compose
- **Gateway:** Caddy Server

## Key Features

1. **WiFi Networks Intelligence**: Detection and mapping of WiFi access points with temporal analysis
2. **GPS Drive Detection**: Automated identification of GPS-based movement patterns
3. **Wigle.net Integration**: API integration for expanded wireless data
4. **Geospatial Visualization**: Interactive Leaflet maps with PostGIS backend
5. **Multi-Protocol Support**: Kismet logs, SDR sources, custom importers
6. **REST API**: Comprehensive endpoints for SIEM integration

## Environment Configuration

```bash
# Copy example configs
cp .env.example .env
cp .env.production.example .env.production

# Required variables:
DATABASE_URL="postgresql://user:password@localhost:5432/isr_platform"
NODE_ENV="development"
API_PORT=3000
```

## Testing Approach

- Test files use `.spec.ts` or `.spec.tsx` convention
- Unit tests for components and services
- Integration tests for API endpoints
- Run with `npm test` or `npx nx test <app-name>`

## Important Context

- **Target Deployment:** Linux systems including edge devices (Raspberry Pi)
- **Performance Goals:** Sub-second latency for real-time processing
- **Setup Time:** Sub-15 minute containerized deployment
- **API Design:** RESTful architecture for SIEM/external integration
- **Data Sources:** Kismet SQLite logs, RTL-SDR, GPS tracks, Wigle.net API

## Project Documentation

- `/docs/architecture.md` - System architecture and design decisions
- `/docs/intel-queries.sql` - 40+ intelligence SQL queries
- `/IMPLEMENTATION_SUMMARY.md` - Completed features documentation
- `/PRODUCTION_DEPLOYMENT.md` - Production deployment guide