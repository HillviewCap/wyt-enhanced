# **Technical Assumptions**

## **Repository Structure: Monorepo**

The project will be developed within a single monorepo.

*Rationale: A monorepo will simplify dependency management and allow for seamlessly sharing code and types between the frontend web application, backend microservices, and various data ingestion modules.*

## **Service Architecture: Microservices**

The backend will be built using a microservices architecture.

*Rationale: This approach is essential for achieving our goals of scalability, resilience, and modularity. It will allow different components, like the Kismet and SDR ingestors, to be developed, deployed, and scaled independently.*

## **Testing Requirements: Full Testing Pyramid**

The project will require a comprehensive testing strategy that includes unit, integration, and end-to-end (E2E) tests.

*Rationale: For a mission-critical security and analysis tool, a robust testing culture is non-negotiable. Unit tests will ensure individual components are correct, integration tests will verify that services work together, and E2E tests will validate complete user workflows, ensuring reliability.*

## **Additional Technical Assumptions and Requests**

All subsequent, more detailed technical choices (e.g., specific libraries, databases, cloud services) will be made and documented by the Architect in the formal Architecture Document. The assumptions above serve as the primary architectural pillars.

\<hr\>
