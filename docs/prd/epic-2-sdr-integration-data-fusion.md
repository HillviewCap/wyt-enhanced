# **Epic 2: Advanced Kismet Data Processing & Multi-Log Integration**

**Epic Goal**: Establish a robust, automated data processing service that continuously monitors ~/kismet_logs/, processes multiple Kismet SQLite files, combines data from multiple sources, and maintains a unified, real-time accessible database for all analysis functions. This creates the essential data processing foundation required for all future analytics and fusion capabilities.

---

## **Story 2.1: Multi-Log Kismet Discovery Service**

**As a** Platform Operator, **I want** the system to automatically discover and track Kismet SQLite files in ~/kismet_logs/, **so that** all available data sources are identified for processing.

**Acceptance Criteria**

1. A background service monitors ~/kismet_logs/ directory for new .kismet files.
2. The service maintains a registry of discovered files with metadata (path, size, last modified).
3. The service detects when new files are added or existing files are updated.
4. File discovery status is logged and accessible via API for monitoring.
5. The service handles file system permissions and missing directory gracefully.

---

## **Story 2.2: Enhanced Multi-Database Ingestion Engine**

**As a** Platform Operator, **I want** to process multiple Kismet SQLite files simultaneously, **so that** data from all sources can be combined efficiently.

**Acceptance Criteria**

1. The ingestion engine processes multiple .kismet files in parallel or sequentially based on system resources.
2. Each Kismet SQLite file's tables (devices, packets, GPS, etc.) are analyzed and mapped to the unified database schema.
3. Duplicate device records across files are intelligently merged based on MAC address and temporal correlation.
4. Data conflicts between files are resolved using configurable precedence rules (e.g., most recent, strongest signal).
5. Processing progress and statistics are tracked per file and overall.

---

## **Story 2.3: Real-Time Log Processing Pipeline**

**As a** Security Analyst, **I want** newly captured Kismet data to be automatically processed and available for analysis, **so that** I can monitor ongoing activities without manual intervention.

**Acceptance Criteria**

1. The system detects when Kismet files are updated or new files are created.
2. Incremental processing extracts only new records since last processing.
3. New data is processed and available in the database within 30 seconds of file changes.
4. Processing pipeline maintains data consistency during concurrent file updates.
5. System provides real-time processing status and error notifications.

---

## **Story 2.4: Advanced Database Schema for Multi-Source Data**

**As a** System Architect, **I want** the database schema to efficiently handle data from multiple Kismet sources, **so that** queries and analysis can operate on the unified dataset.

**Acceptance Criteria**

1. Database schema includes source tracking for each record (original file, import timestamp).
2. Enhanced Device table supports metadata from multiple Kismet captures.
3. Sighting table includes source correlation and confidence scoring.
4. Database indexes are optimized for multi-source queries and temporal analysis.
5. Schema migration scripts handle existing Epic 1 data without loss.

---

## **Story 2.5: Multi-Source Analysis & Correlation Engine**

**As a** Security Analyst, **I want** the analysis engine to correlate device activities across multiple Kismet captures, **so that** I can identify cross-session persistence patterns.

**Acceptance Criteria**

1. Analysis engine processes data from all ingested Kismet sources simultaneously.
2. Persistence scoring considers device appearances across multiple capture sessions/files.
3. Temporal correlation identifies devices active across different time periods and locations.
4. Cross-source device fingerprinting improves accuracy of device tracking.
5. Analysis results include source attribution and confidence metrics.

---

## **Story 2.6: Enhanced API for Multi-Source Data Access**

**As a** Frontend Developer, **I want** API endpoints that provide access to the multi-source processed data, **so that** the UI can display comprehensive analysis results.

**Acceptance Criteria**

1. Enhanced GET /api/analysis/results includes multi-source data in response.
2. API supports filtering by data source, time ranges, and processing status.
3. New GET /api/sources endpoint lists all processed Kismet files with metadata.
4. API includes source attribution in all device and sighting responses.
5. OpenAPI documentation updated to reflect multi-source capabilities.

\\<hr\\>