---
name: monorepo-workflow
description: Managing npm workspaces, starting parallel dev servers, building all artifacts, and port assignments in Charlotte Wealth.
---

# Monorepo Workflow Skill

## Overview
Charlotte Wealth is organized as an npm workspaces monorepo:
- `apps/web`: Angular 21 Standalone web client (Port `4200`)
- `apps/mobile`: Ionic 9 + Angular 22 Standalone + Capacitor 8 client (Port `8100`)
- `apps/api`: NestJS 11 TypeScript REST API (Port `3000`)
- `apps/e2e`: Centralized test automation workspace

---

## Port Allocation Matrix

| Application | Port | URL | Configuration Location |
| :--- | :--- | :--- | :--- |
| **Backend API** | `3000` | `http://localhost:3000` | `apps/api/src/main.ts` |
| **Web Dashboard** | `4200` | `http://localhost:4200` | `apps/web/angular.json` |
| **Mobile Client** | `8100` | `http://localhost:8100` | `apps/mobile/package.json` (`--port 8100`) |

> **Critical**: `apps/mobile` must always run on port `8100` to prevent collisions with `apps/web` on `4200`.

---

## Standard Commands

### 1. Starting Services
```bash
# Start all 3 applications concurrently with color-coded logging
npm start
# or
npm run start:all

# Start individually:
npm run start:api
npm run start:web
npm run start:mobile
```

### 2. Compiling & Building
```bash
# Build all workspaces
npm run build:all

# Individual builds:
npm run build:api      # Outputs to apps/api/dist/
npm run build:web      # Outputs to apps/web/dist/web/
npm run build:mobile   # Outputs to apps/mobile/www/
```

### 3. Dependency Management
- Always run dependency installs from the monorepo root:
  - For a specific workspace: `npm install <package> --workspace=<workspace-name>`
  - As a dev dependency: `npm install --save-dev <package> --workspace=<workspace-name>`
- Never add application source code directly at the repository root.

