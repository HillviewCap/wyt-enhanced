# **High Level Architecture**

## **Technical Summary**

The system will be a cloud-native ISR platform built within an **Nx monorepo** to manage frontend and backend codebases. The architecture features a **React-based single-page application** for the frontend and a backend composed of a **single containerized Node.js/TypeScript application** (a modular monolith for the MVP). The entire system will be deployed on a **single virtual private server** using Docker Compose. Data from Kismet and SDRs will be ingested into a central **PostgreSQL** database, processed, and exposed to the frontend via a secure **REST API**. This design prioritizes simplicity, low cost, and rapid, easy deployment.

## **Platform and Infrastructure Choice**

* **Platform:** A single **virtual private server** from a provider like DigitalOcean, Vultr, or AWS Lightsail ($5-10/month), or a modern PaaS like Fly.io or Railway.  
* **Application:** For the MVP, the backend services will be combined into a single Node.js "Monolith" application, running in a Docker container.  
* **Database:** PostgreSQL will run as another container alongside the application via Docker Compose.  
* **Deployment:** The process is simplified to a git pull and docker-compose up \--build on the server.

## **High Level Architecture Diagram**

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

## **Architectural Patterns**

* **Monorepo Pattern**: Manages the full-stack codebase within a single repository for simplified dependency management and code sharing.  
* **Modular Monolith**: The backend is a single deployable unit, but its internal code is structured into modular components (ingestion, analysis, API) that can be split into microservices in the future.  
* **Component-Based UI**: The frontend will be built as a collection of reusable React components.  
* **Repository Pattern**: Used within the backend to abstract database interactions, making the code cleaner and easier to test.

\<hr\>
