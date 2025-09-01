# **ISR Platform Product Requirements Document (PRD)**

## **Goals and Background Context**

### **Goals**

* **Drastically Simplify Deployment**: Reduce the median setup and deployment time for a functioning monitoring node to under 15 minutes.  
* **Enable Multi-Protocol Fusion**: Provide users the ability to ingest and visualize data from both Kismet (Wi-Fi/Bluetooth) and a basic SDR source on a single, correlated interface.  
* **Foster Community Adoption**: Launch a compelling open-source platform that achieves significant community traction, targeting 1,000 GitHub stars within the first year.  
* **Build an Extensible Foundation**: Create a modern, API-first architecture that can serve as the foundation for future enterprise features and broader community contributions.

### **Background Context**

Current open-source wireless intelligence tools are powerful but niche, hampered by severe limitations that prevent wider adoption. They are often restricted to a single protocol (like Wi-Fi), architected as monolithic desktop applications that cannot scale, and are notoriously difficult to install and configure, requiring hours of expert-level effort.

This project addresses this critical gap by creating a scalable, accessible, and integration-ready ISR platform. By leveraging a modern, containerized, cloud-native architecture, we will provide a solution that is easy to deploy, supports multi-protocol data fusion, and is built from the ground up with an API for extensibility.

### **Change Log**

| Date | Version | Description | Author |
| :---- | :---- | :---- | :---- |
| 2025-08-29 | 1.0 | Initial PRD draft created from Project Brief. | John, PM |
| 2025-08-29 | 1.1 | Added NFR6 for security based on checklist validation. | John, PM |

\<hr\>

## **Requirements**

### **Functional**

1. **FR1**: The system must provide an automated mechanism to continuously monitor, ingest, and parse multiple Kismet SQLite database files from the ~/kismet_logs directory, combining data from multiple sources into a unified database.  
2. **FR2**: The system must provide a connector to ingest raw signal data from a common RTL-SDR dongle.  
3. **FR3**: The system shall process and correlate ingested data to identify and score persistent devices based on configurable time windows and location proximity.  
4. **FR4**: The system must present a web-based user interface displaying both Kismet and SDR data points simultaneously on a unified geospatial map.  
5. **FR5**: The system must expose a REST API endpoint to allow for the retrieval of processed analysis results in a structured JSON format.  
6. **FR6**: The entire platform (backend services and frontend UI) must be deployable using a single docker-compose up command.

### **Non Functional**

1. **NFR1**: The median time from initial deployment to the first visualization of data in the UI must be under 15 minutes.  
2. **NFR2**: The data ingestion components must be performant enough to run effectively on common, low-cost edge hardware, specifically a Raspberry Pi 5\.  
3. **NFR3**: The backend architecture must be composed of containerized microservices to ensure scalability and modularity.  
4. **NFR4**: The system's technology stack must prioritize open-source solutions that are compatible with the free tiers of major cloud providers.  
5. **NFR5**: The data processing pipeline and API responses must be optimized for near real-time performance, targeting sub-second latency for typical MVP workloads.  
6. **NFR6**: The platform must adhere to secure coding best practices, including protections against the OWASP Top 10 vulnerabilities. All data must be encrypted in transit and at rest.

\<hr\>

## **User Interface Design Goals**

### **Overall UX Vision**

The user experience will be that of a professional, data-centric analytical tool. The design should prioritize function, clarity, and information density over aesthetic flair, enabling security analysts to quickly understand complex RF environments. The primary goal is to make fused, multi-protocol data intelligible and actionable at a glance.

### **Key Interaction Paradigms**

The core of the user experience will be a dynamic, interactive geospatial map. Key interactions will include:

* Panning and zooming the map to explore geographic areas.  
* Filtering the displayed data by protocol, time, signal strength, and persistence score.  
* Clicking on data points (representing devices or signals) to open a detailed information panel.  
* Utilizing a timeline control to play back, pause, and scrub through captured data chronologically.

### **Core Screens and Views**

Conceptually, the UI will be centered around these views:

* **Dashboard / Map View**: The main interface displaying the real-time or historical RF fusion map.  
* **Device Details View**: A side panel or modal providing all known metadata and historical activity for a selected device.  
* **Source Management View**: A simple settings page for configuring data sources (e.g., Kismet log paths, SDR settings) and managing API keys.

### **Accessibility: WCAG AA**

The application should be designed to meet WCAG 2.1 AA standards to ensure it is usable by professionals with disabilities.

### **Branding**

Branding is to be determined. However, a "dark mode" theme with a high-contrast, professional color palette is recommended to reduce eye strain during long analysis sessions, which is common in SOC environments.

### **Target Device and Platforms: Web Responsive**

The primary interface will be a responsive web application, ensuring functionality on both large desktop monitors for in-depth analysis and on tablets for potential field use.

\<hr\>

## **Technical Assumptions**

### **Repository Structure: Monorepo**

The project will be developed within a single monorepo.

*Rationale: A monorepo will simplify dependency management and allow for seamlessly sharing code and types between the frontend web application, backend microservices, and various data ingestion modules.*

### **Service Architecture: Microservices**

The backend will be built using a microservices architecture.

*Rationale: This approach is essential for achieving our goals of scalability, resilience, and modularity. It will allow different components, like the Kismet and SDR ingestors, to be developed, deployed, and scaled independently.*

### **Testing Requirements: Full Testing Pyramid**

The project will require a comprehensive testing strategy that includes unit, integration, and end-to-end (E2E) tests.

*Rationale: For a mission-critical security and analysis tool, a robust testing culture is non-negotiable. Unit tests will ensure individual components are correct, integration tests will verify that services work together, and E2E tests will validate complete user workflows, ensuring reliability.*

### **Additional Technical Assumptions and Requests**

All subsequent, more detailed technical choices (e.g., specific libraries, databases, cloud services) will be made and documented by the Architect in the formal Architecture Document. The assumptions above serve as the primary architectural pillars.

\<hr\>

## **Epic List**

1. **Epic 1: Platform Foundation & Kismet Analysis**: Establish the containerized, API-first platform and deliver a complete Kismet log analysis tool with a web-based map UI, achieving parity with the core features of "Chasing-Your-Tail-NG" but on a modern, scalable, and easy-to-deploy architecture.  
2. **Epic 2: Advanced Kismet Data Processing & Multi-Log Integration**: Establish a robust, automated data processing service that continuously monitors ~/kismet_logs/, processes multiple Kismet SQLite files, combines data from multiple sources, and maintains a unified, real-time accessible database for all analysis functions.

\<hr\>

## **Epic 1: Platform Foundation & Kismet Analysis**

**Epic Goal**: To establish the containerized, API-first platform foundation and deliver a fully functional Kismet log analysis tool with a web-based map UI. This epic achieves parity with the core features of "Chasing-Your-Tail-NG" but on our modern, scalable, and easy-to-deploy architecture, delivering immediate value and a solid base for future expansion.

---

### **Story 1.1: Platform Scaffolding & Containerization**

**As a** Security Analyst, **I want** a containerized project structure with a basic running web app and backend service, **so that** I can ensure a simple, one-command initial setup.

**Acceptance Criteria**

1. A monorepo structure is created with separate packages for the frontend web app and backend service.  
2. A docker-compose.yml file is created at the project root.  
3. Running docker-compose up successfully builds and starts both the frontend and backend services without errors.  
4. The frontend service displays a basic "Hello World" or placeholder page in a web browser.  
5. The backend service exposes a basic /health endpoint that returns a 200 OK status.

---

### **Story 1.2: Kismet Log Ingestion Service**

**As a** Platform Operator, **I want** to configure the system to ingest a Kismet SQLite log file, **so that** device and location data can be parsed and stored for analysis.

**Acceptance Criteria**

1. A backend service is created to handle the ingestion process.  
2. The service can be configured with a path to a Kismet SQLite file.  
3. Upon execution, the service correctly parses device, signal, and GPS data from the Kismet log.  
4. Parsed data is correctly stored in the platform's database, matching the defined data model.  
5. The ingestion process logs its progress and reports any parsing errors.

---

### **Story 1.3: Backend Persistence Analysis Engine**

**As a** Security Analyst, **I want** the system to automatically analyze ingested Kismet data for persistent devices, **so that** I can identify potential surveillance threats.

**Acceptance Criteria**

1. A backend analysis module is created that implements the persistence scoring algorithm.  
2. The analysis correctly correlates device appearances across multiple locations and time windows.  
3. Each tracked device is assigned a persistence score between 0.0 and 1.0.  
4. The analysis results are stored in the database and linked to the relevant devices.  
5. The engine can be triggered manually and processes a standard Kismet log within a predefined performance benchmark.

---

### **Story 1.4: API for Analysis Results**

**As a** Frontend Developer, **I want** a REST API endpoint to retrieve the results of the persistence analysis, **so that** I can display the data in the user interface.

**Acceptance Criteria**

1. A new GET endpoint (e.g., /api/analysis/results) is created on the backend service.  
2. The endpoint returns a collection of tracked devices and their analysis data (including persistence score, locations, and timestamps) in a structured JSON format.  
3. The API includes basic filtering capabilities (e.g., by persistence score threshold).  
4. The API endpoint is documented using OpenAPI (Swagger) standards.

---

### **Story 1.5: Geospatial Map UI**

**As a** Security Analyst, **I want** to see a web-based geospatial map, **so that** I have a canvas for visualizing device location data.

**Acceptance Criteria**

1. The frontend application integrates a mapping library (e.g., Leaflet, Mapbox).  
2. The UI displays a full-screen, interactive map that users can pan and zoom.  
3. Basic map controls (zoom in/out, reset view) are present and functional.  
4. The UI includes a basic placeholder for data filters and a timeline control.

---

### **Story 1.6: Display Kismet Analysis on Map**

**As a** Security Analyst, **I want** to see the analyzed Kismet data plotted on the map, **so that** I can visually identify and investigate potential threats.

**Acceptance Criteria**

1. The frontend map UI calls the /api/analysis/results endpoint to fetch data upon loading.  
2. Devices with location data are plotted as markers on the map.  
3. The color of each device marker corresponds to its persistence score (e.g., green for low, red for high).  
4. Clicking a device marker opens a panel displaying its detailed information (e.g., MAC address, score, first/last seen times).  
5. The UI includes a simple filter control that allows users to hide devices below a certain persistence score.

\<hr\>

## **Epic 2: Advanced Kismet Data Processing & Multi-Log Integration**

**Epic Goal**: Establish a robust, automated data processing service that continuously monitors ~/kismet_logs/, processes multiple Kismet SQLite files, combines data from multiple sources, and maintains a unified, real-time accessible database for all analysis functions. This creates the essential data processing foundation required for all future analytics and fusion capabilities.

---

### **Story 2.1: Multi-Log Kismet Discovery Service**

**As a** Platform Operator, **I want** the system to automatically discover and track Kismet SQLite files in ~/kismet_logs/, **so that** all available data sources are identified for processing.

**Acceptance Criteria**

1. A background service monitors ~/kismet_logs/ directory for new .kismet files.
2. The service maintains a registry of discovered files with metadata (path, size, last modified).
3. The service detects when new files are added or existing files are updated.
4. File discovery status is logged and accessible via API for monitoring.
5. The service handles file system permissions and missing directory gracefully.

---

### **Story 2.2: Enhanced Multi-Database Ingestion Engine**

**As a** Platform Operator, **I want** to process multiple Kismet SQLite files simultaneously, **so that** data from all sources can be combined efficiently.

**Acceptance Criteria**

1. The ingestion engine processes multiple .kismet files in parallel or sequentially based on system resources.
2. Each Kismet SQLite file's tables (devices, packets, GPS, etc.) are analyzed and mapped to the unified database schema.
3. Duplicate device records across files are intelligently merged based on MAC address and temporal correlation.
4. Data conflicts between files are resolved using configurable precedence rules (e.g., most recent, strongest signal).
5. Processing progress and statistics are tracked per file and overall.

---

### **Story 2.3: Real-Time Log Processing Pipeline**

**As a** Security Analyst, **I want** newly captured Kismet data to be automatically processed and available for analysis, **so that** I can monitor ongoing activities without manual intervention.

**Acceptance Criteria**

1. The system detects when Kismet files are updated or new files are created.
2. Incremental processing extracts only new records since last processing.
3. New data is processed and available in the database within 30 seconds of file changes.
4. Processing pipeline maintains data consistency during concurrent file updates.
5. System provides real-time processing status and error notifications.

---

### **Story 2.4: Advanced Database Schema for Multi-Source Data**

**As a** System Architect, **I want** the database schema to efficiently handle data from multiple Kismet sources, **so that** queries and analysis can operate on the unified dataset.

**Acceptance Criteria**

1. Database schema includes source tracking for each record (original file, import timestamp).
2. Enhanced Device table supports metadata from multiple Kismet captures.
3. Sighting table includes source correlation and confidence scoring.
4. Database indexes are optimized for multi-source queries and temporal analysis.
5. Schema migration scripts handle existing Epic 1 data without loss.

---

### **Story 2.5: Multi-Source Analysis & Correlation Engine**

**As a** Security Analyst, **I want** the analysis engine to correlate device activities across multiple Kismet captures, **so that** I can identify cross-session persistence patterns.

**Acceptance Criteria**

1. Analysis engine processes data from all ingested Kismet sources simultaneously.
2. Persistence scoring considers device appearances across multiple capture sessions/files.
3. Temporal correlation identifies devices active across different time periods and locations.
4. Cross-source device fingerprinting improves accuracy of device tracking.
5. Analysis results include source attribution and confidence metrics.

---

### **Story 2.6: Enhanced API for Multi-Source Data Access**

**As a** Frontend Developer, **I want** API endpoints that provide access to the multi-source processed data, **so that** the UI can display comprehensive analysis results.

**Acceptance Criteria**

1. Enhanced GET /api/analysis/results includes multi-source data in response.
2. API supports filtering by data source, time ranges, and processing status.
3. New GET /api/sources endpoint lists all processed Kismet files with metadata.
4. API includes source attribution in all device and sighting responses.
5. OpenAPI documentation updated to reflect multi-source capabilities.

\<hr\>

## **Checklist Results Report**

* **Overall PRD Completeness**: 95%  
* **MVP Scope Appropriateness**: Just Right  
* **Readiness for Architecture Phase**: Ready  
* **Summary**: The PRD is comprehensive and well-structured. It provides a clear, actionable plan for the MVP. A minor gap regarding an explicit security NFR was identified and corrected. The document is now ready for the architecture and design phases.

\<hr\>

## **Next Steps**

### **UX Expert Prompt**

The PRD for the ISR Platform is complete. Please review the 'User Interface Design Goals' section (and the full document for context) and create a detailed UI/UX Specification using the front-end-spec-tmpl.

### **Architect Prompt**

The PRD for the ISR Platform is now validated. Please review it thoroughly, paying close attention to the 'Requirements' and 'Technical Assumptions' sections. Your next task is to create the formal Architecture Document using the architecture-tmpl.

---

