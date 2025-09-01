# **Requirements**

## **Functional**

1. **FR1**: The system must provide a mechanism to ingest and parse Kismet SQLite database files.  
2. **FR2**: The system must provide a connector to ingest raw signal data from a common RTL-SDR dongle.  
3. **FR3**: The system shall process and correlate ingested data to identify and score persistent devices based on configurable time windows and location proximity.  
4. **FR4**: The system must present a web-based user interface displaying both Kismet and SDR data points simultaneously on a unified geospatial map.  
5. **FR5**: The system must expose a REST API endpoint to allow for the retrieval of processed analysis results in a structured JSON format.  
6. **FR6**: The entire platform (backend services and frontend UI) must be deployable using a single docker-compose up command.

## **Non Functional**

1. **NFR1**: The median time from initial deployment to the first visualization of data in the UI must be under 15 minutes.  
2. **NFR2**: The data ingestion components must be performant enough to run effectively on common, low-cost edge hardware, specifically a Raspberry Pi 5\.  
3. **NFR3**: The backend architecture must be composed of containerized microservices to ensure scalability and modularity.  
4. **NFR4**: The system's technology stack must prioritize open-source solutions that are compatible with the free tiers of major cloud providers.  
5. **NFR5**: The data processing pipeline and API responses must be optimized for near real-time performance, targeting sub-second latency for typical MVP workloads.  
6. **NFR6**: The platform must adhere to secure coding best practices, including protections against the OWASP Top 10 vulnerabilities. All data must be encrypted in transit and at rest.

\<hr\>
