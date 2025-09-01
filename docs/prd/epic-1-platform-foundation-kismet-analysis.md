# **Epic 1: Platform Foundation & Kismet Analysis**

**Epic Goal**: To establish the containerized, API-first platform foundation and deliver a fully functional Kismet log analysis tool with a web-based map UI. This epic achieves parity with the core features of "Chasing-Your-Tail-NG" but on our modern, scalable, and easy-to-deploy architecture, delivering immediate value and a solid base for future expansion.

---

## **Story 1.1: Platform Scaffolding & Containerization**

**As a** Security Analyst, **I want** a containerized project structure with a basic running web app and backend service, **so that** I can ensure a simple, one-command initial setup.

**Acceptance Criteria**

1. A monorepo structure is created with separate packages for the frontend web app and backend service.  
2. A docker-compose.yml file is created at the project root.  
3. Running docker-compose up successfully builds and starts both the frontend and backend services without errors.  
4. The frontend service displays a basic "Hello World" or placeholder page in a web browser.  
5. The backend service exposes a basic /health endpoint that returns a 200 OK status.

---

## **Story 1.2: Kismet Log Ingestion Service**

**As a** Platform Operator, **I want** to configure the system to ingest a Kismet SQLite log file, **so that** device and location data can be parsed and stored for analysis.

**Acceptance Criteria**

1. A backend service is created to handle the ingestion process.  
2. The service can be configured with a path to a Kismet SQLite file.  
3. Upon execution, the service correctly parses device, signal, and GPS data from the Kismet log.  
4. Parsed data is correctly stored in the platform's database, matching the defined data model.  
5. The ingestion process logs its progress and reports any parsing errors.

---

## **Story 1.3: Backend Persistence Analysis Engine**

**As a** Security Analyst, **I want** the system to automatically analyze ingested Kismet data for persistent devices, **so that** I can identify potential surveillance threats.

**Acceptance Criteria**

1. A backend analysis module is created that implements the persistence scoring algorithm.  
2. The analysis correctly correlates device appearances across multiple locations and time windows.  
3. Each tracked device is assigned a persistence score between 0.0 and 1.0.  
4. The analysis results are stored in the database and linked to the relevant devices.  
5. The engine can be triggered manually and processes a standard Kismet log within a predefined performance benchmark.

---

## **Story 1.4: API for Analysis Results**

**As a** Frontend Developer, **I want** a REST API endpoint to retrieve the results of the persistence analysis, **so that** I can display the data in the user interface.

**Acceptance Criteria**

1. A new GET endpoint (e.g., /api/analysis/results) is created on the backend service.  
2. The endpoint returns a collection of tracked devices and their analysis data (including persistence score, locations, and timestamps) in a structured JSON format.  
3. The API includes basic filtering capabilities (e.g., by persistence score threshold).  
4. The API endpoint is documented using OpenAPI (Swagger) standards.

---

## **Story 1.5: Geospatial Map UI**

**As a** Security Analyst, **I want** to see a web-based geospatial map, **so that** I have a canvas for visualizing device location data.

**Acceptance Criteria**

1. The frontend application integrates a mapping library (e.g., Leaflet, Mapbox).  
2. The UI displays a full-screen, interactive map that users can pan and zoom.  
3. Basic map controls (zoom in/out, reset view) are present and functional.  
4. The UI includes a basic placeholder for data filters and a timeline control.

---

## **Story 1.6: Display Kismet Analysis on Map**

**As a** Security Analyst, **I want** to see the analyzed Kismet data plotted on the map, **so that** I can visually identify and investigate potential threats.

**Acceptance Criteria**

1. The frontend map UI calls the /api/analysis/results endpoint to fetch data upon loading.  
2. Devices with location data are plotted as markers on the map.  
3. The color of each device marker corresponds to its persistence score (e.g., green for low, red for high).  
4. Clicking a device marker opens a panel displaying its detailed information (e.g., MAC address, score, first/last seen times).  
5. The UI includes a simple filter control that allows users to hide devices below a certain persistence score.

\<hr\>
