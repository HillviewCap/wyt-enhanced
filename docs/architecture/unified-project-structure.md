# **Unified Project Structure**

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
