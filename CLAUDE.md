# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the ISR Platform (Intelligence, Surveillance, and Reconnaissance) - a cloud-native platform for multi-protocol wireless signal analysis. The project consists of a monorepo architecture using Nx workspace management.

## Core Architecture

- **Monorepo Structure**: Uses Nx for workspace management
- **Microservices Architecture**: Containerized services deployed via Docker Compose
- **Frontend**: React application with Vite, React Router, Leaflet for maps, and Zustand for state management
- **Backend**: Express/Node.js API with Prisma ORM
- **Database**: PostgreSQL with PostGIS for geospatial data
- **API Gateway**: Caddy server for reverse proxy and SSL termination

## Common Development Commands

### Project Management
```bash
# Install dependencies
npm install

# Serve all applications concurrently
npm run serve
# OR
npx nx run-many --target=serve --all

# Build all applications
npm run build
# OR
npx nx run-many --target=build --all

# Run all tests
npm run test
# OR
npx nx run-many --target=test --all
```

### Individual Application Commands
```bash
# Frontend (isr-app)
npx nx serve isr-app     # Start dev server
npx nx build isr-app     # Build for production
npx nx test isr-app      # Run tests

# Backend API
npx nx serve api         # Start API server
npx nx build api         # Build API
```

### Docker Deployment
```bash
# Start all services (PostgreSQL, API, Frontend, Caddy)
docker-compose up

# Start with rebuild
docker-compose up --build

# Stop all services
docker-compose down
```

## Key Directories

- `/isr-platform/` - Main Nx workspace
  - `/apps/api/` - Backend API service
  - `/apps/isr-app/` - React frontend application
  - `/libs/` - Shared libraries
- `/docs/` - Project documentation including PRD and architecture specs

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet, React Router, Zustand
- **Backend**: Express, TypeScript, Prisma ORM, PostgreSQL
- **Testing**: Jest, React Testing Library
- **Build Tools**: Nx, Docker, Caddy
- **Database**: PostgreSQL 16 with PostGIS extension

## Key Features Being Developed

1. **Kismet Log Ingestion**: Processing WiFi/Bluetooth data from Kismet SQLite logs
2. **SDR Integration**: Support for RTL-SDR and other software-defined radio sources
3. **RF Fusion Display**: Unified geospatial visualization of multi-protocol data
4. **Persistence Analysis**: Detecting and scoring persistent devices across locations
5. **REST API**: Comprehensive API for data export and integration

## Testing Approach

- Unit tests exist for components and services
- Test files follow `.spec.ts` or `.spec.tsx` naming convention
- Run tests with `npm run test` or target specific apps with `npx nx test <app-name>`

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database credentials (PostgreSQL)
- API port configuration
- Node environment settings

## Important Notes

- The platform targets deployment on Linux systems including edge devices (Raspberry Pi)
- Designed for containerized deployment with sub-15 minute setup time
- API-first architecture for SIEM integration
- Focus on real-time stream processing with sub-second latency goals