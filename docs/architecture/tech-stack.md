# **Tech Stack**

## **Technology Stack Table**

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
