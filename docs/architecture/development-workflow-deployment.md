# **Development Workflow & Deployment**

## **Development Workflow**

Local development will be managed via Nx. The primary command nx run-many \--target=serve will start all services. A root docker-compose.yml will manage the local Postgres database.

## **Deployment Architecture**

Deployment will target a single server running Docker. A CI/CD pipeline in GitHub Actions will build and push a production Docker image. Deployment involves pulling the new image and restarting the service via Docker Compose on the server.

\<hr\>
