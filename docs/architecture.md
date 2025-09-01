---

# **ISR Platform Fullstack Architecture Document**

## **Introduction**

This document outlines the complete fullstack architecture for the ISR Platform, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### **Starter Template or Existing Project**

The project will be built using a **Monorepo Tool (like Nx)**. This approach provides an excellent balance of control and pre-configured best practices, offering a flexible skeleton for our monorepo where we can set up the frontend and backend applications ourselves.

### **Change Log**

| Date | Version | Description | Author |
| :---- | :---- | :---- | :---- |
| 2025-08-29 | 1.0 | Initial architecture draft. | Winston, Architect |

\<hr\>

## **High Level Architecture**

### **Technical Summary**

The system will be a cloud-native ISR platform built within an **Nx monorepo** to manage frontend and backend codebases. The architecture features a **React-based single-page application** for the frontend and a backend composed of a **single containerized Node.js/TypeScript application** (a modular monolith for the MVP). The entire system will be deployed on a **single virtual private server** using Docker Compose. Data from Kismet and SDRs will be ingested into a central **PostgreSQL** database, processed, and exposed to the frontend via a secure **REST API**. This design prioritizes simplicity, low cost, and rapid, easy deployment.

### **Platform and Infrastructure Choice**

* **Platform:** A single **virtual private server** from a provider like DigitalOcean, Vultr, or AWS Lightsail ($5-10/month), or a modern PaaS like Fly.io or Railway.  
* **Application:** For the MVP, the backend services will be combined into a single Node.js "Monolith" application, running in a Docker container.  
* **Database:** PostgreSQL will run as another container alongside the application via Docker Compose.  
* **Deployment:** The process is simplified to a git pull and docker-compose up \--build on the server.

### **High Level Architecture Diagram**

Code snippet

graph TD  
    subgraph User  
        U\[Analyst's Browser\]  
    end

    subgraph "Single Server (e.g., DigitalOcean Droplet)"  
        U \-- HTTPS \--\> Caddy\[Caddy Web Server\];

        subgraph "Docker Compose"  
            Caddy \-- Reverse Proxy \--\> FE\[Frontend Container\];  
            Caddy \-- Reverse Proxy /api \--\> BE\[Backend Monolith Container\];

            BE \--\> DB\[(Postgres Container)\];  
        end  
    end

    subgraph "Data Sources"  
         S3\_LOGS\[S3/Local Upload\] \--\> BE;  
         SDR\_HW\[User's SDR Hardware\] \--\> BE;  
    end

    style U fill:\#D5F5E3

### **Architectural Patterns**

* **Monorepo Pattern**: Manages the full-stack codebase within a single repository for simplified dependency management and code sharing.  
* **Modular Monolith**: The backend is a single deployable unit, but its internal code is structured into modular components (ingestion, analysis, API) that can be split into microservices in the future.  
* **Component-Based UI**: The frontend will be built as a collection of reusable React components.  
* **Repository Pattern**: Used within the backend to abstract database interactions, making the code cleaner and easier to test.

\<hr\>

## **Tech Stack**

### **Technology Stack Table**

| Category | Technology | Version | Purpose | Rationale |
| :---- | :---- | :---- | :---- | :---- |
| **Frontend Language** | TypeScript | \~5.4 | Primary language for the frontend. | Provides strong type safety, improving code quality and maintainability. |
| **Frontend Framework** | React | \~18.2 | UI library for building the web interface. | The industry standard with a massive ecosystem and excellent performance. |
| **UI Components** | Shadcn/ui | \~0.8 | A set of accessible and unstyled UI components. | Modern, accessible, and highly composable, allowing for rapid UI development. |
| **State Management** | Zustand | \~4.5 | Simple state management for React. | Lightweight, minimal boilerplate, and easy to use for the MVP's state needs. |
| **Styling** | Tailwind CSS | \~3.4 | Utility-first CSS framework. | Enables rapid styling directly in the markup, ensuring consistency. |
| **Backend Language** | Node.js | \~20.11 | JavaScript runtime for the backend. | Allows for a shared language (TypeScript) across the full stack. |
| **Backend Framework** | Express.js | \~4.19 | Web application framework for Node.js. | Minimal and unopinionated, providing a solid foundation for our API monolith. |
| **Database** | PostgreSQL | \~16 | Relational database. | Powerful, reliable, and has excellent support for geospatial data via PostGIS. |
| **Database ORM** | Prisma | \~5.12 | Next-generation Node.js & TypeScript ORM. | Provides incredible type safety between the database and application code. |
| **Build Tool** | Vite | \~5.2 | Frontend build tool. | Extremely fast development server and optimized production builds. |
| **Web Server / Proxy** | Caddy | \~2.7 | Web server with automatic HTTPS. | Simplifies deployment by handling HTTPS and reverse proxying with minimal config. |
| **Deployment** | Docker Compose | \~2.24 | Tool for defining multi-container apps. | The core of our simple, single-server deployment strategy. |
| **CI/CD** | GitHub Actions | latest | Automation platform for build, test, deploy. | Integrates directly with our code repository for seamless automation. |

\<hr\>

## **Data Models**

### **Device**

* **Purpose**: Represents a unique wireless device tracked by the system, identified by its MAC address.  
* Relationships: A Device has many Sightings.  
  TypeScript Interface

TypeScript

export interface Device {  
  id: string;  
  macAddress: string;  
  firstSeen: Date;  
  lastSeen: Date;  
}

---

### **Sighting**

* **Purpose**: Records a single Kismet-based observation of a specific Device at a point in time and space.  
* Relationships: A Sighting belongs to one Device.  
  TypeScript Interface

TypeScript

export interface Sighting {  
  id: string;  
  deviceId: string;  
  timestamp: Date;  
  latitude: number;  
  longitude: number;  
  signalStrength: number;  
  sourceFileId: string;  
  importedAt: Date;  
  confidence: number;  
}

---

### **KismetLogFile**

* **Purpose**: Tracks processed Kismet SQLite files and their processing status for multi-source data management.  
* Relationships: A KismetLogFile has many Sightings (through source attribution).  
  TypeScript Interface

TypeScript

export interface KismetLogFile {  
  id: string;  
  filePath: string;  
  fileName: string;  
  fileSize: number;  
  lastModified: Date;  
  lastProcessed: Date;  
  processingStatus: 'discovered' | 'processing' | 'completed' | 'error';  
  recordsProcessed: number;  
  errorMessage?: string;  
}

\<hr\>

## **API Specification**

YAML

openapi: 3.0.0  
info:  
  title: ISR Platform API  
  version: 1.0.0  
  description: API for the ISR Platform to manage data sources and retrieve analysis results.  
servers:  
  \- url: /api  
    description: Local development server

paths:  
  /health:  
    get:  
      summary: Health Check  
      responses:  
        '200':  
          description: Service is healthy.

  /datasources:  
    get:  
      summary: List all configured data sources  
      responses:  
        '200':  
          description: A list of data sources.  
    post:  
      summary: Create a new data source  
      responses:  
        '201':  
          description: Data source created.

  /datasources/{id}/ingest:  
    post:  
      summary: Start the ingestion process for a data source  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema:  
            type: string  
      responses:  
        '202':  
          description: Ingestion process started.

  /analysis/results:  
    get:  
      summary: Get analysis results  
      parameters:  
        \- name: min\_persistence\_score  
          in: query  
          schema:  
            type: number  
            format: float  
      responses:  
        '200':  
          description: A list of devices with their sightings and analysis.

  /sources:  
    get:  
      summary: List all processed Kismet log files  
      responses:  
        '200':  
          description: A list of Kismet log files with processing status.

  /sources/{id}/reprocess:  
    post:  
      summary: Reprocess a specific Kismet log file  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema:  
            type: string  
      responses:  
        '202':  
          description: Reprocessing started.

\<hr\>

## **Unified Project Structure**

Plaintext

isr-platform/  
├── apps/  
│   ├── api/                      \# Backend Express.js Application  
│   │   ├── src/  
│   │   │   ├── app/  
│   │   │   │   ├── routes/       \# API endpoint controllers  
│   │   │   │   ├── services/     \# Business logic (ingestion, analysis)  
│   │   │   │   └── data-access/  \# Data access layer (using Prisma)  
│   │   │   └── main.ts           \# Main application entry point  
│   │   └── project.json          \# Nx project configuration  
│   │  
│   └── isr-app/                  \# Frontend React Application  
│       ├── src/  
│       │   ├── app/  
│       │   │   ├── components/   \# UI components  
│       │   │   ├── routes/       \# Page components and route definitions  
│       │   │   └── services/     \# API client services  
│       │   └── main.tsx          \# Main application entry point  
│       └── project.json          \# Nx project configuration  
│  
├── libs/  
│   └── data-models/              \# Shared TypeScript interfaces  
│       ├── src/  
│       └── project.json  
│  
├── tools/                        \# Workspace-specific scripts and tooling  
├── nx.json                       \# Nx workspace configuration  
├── package.json                  \# Root package.json for all dependencies  
└── tsconfig.base.json            \# Shared TypeScript configuration

\<hr\>

## **Development Workflow & Deployment**

### **Development Workflow**

Local development will be managed via Nx. The primary command nx run-many \--target=serve will start all services. A root docker-compose.yml will manage the local Postgres database.

### **Deployment Architecture**

Deployment will target a single server running Docker. A CI/CD pipeline in GitHub Actions will build and push a production Docker image. Deployment involves pulling the new image and restarting the service via Docker Compose on the server.

\<hr\>

## **Final Sections**

### **Security, Performance, Testing, and Standards**

* **Security**: Caddy will provide automatic HTTPS. API input validation is mandatory.  
* **Performance**: Vite will handle frontend build optimizations. Backend performance will focus on efficient Prisma queries.  
* **Testing**: The project will follow a Full Testing Pyramid model (Unit, Integration, E2E).  
* **Standards**: Code will be formatted with Prettier. Shared code must reside in libs.

---

Once you have saved this document, the entire planning phase is complete. The project is ready for development.

Shall I \*exit to return you to the BMad Orchestrator? He can guide you on how to start the development cycle with the first story.