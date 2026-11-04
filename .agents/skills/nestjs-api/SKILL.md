---
name: nestjs-api
description: Standards for NestJS 11 backend development, controller/service isolation, CORS handling, and portfolio data contracts in apps/api.
---

# NestJS Backend API Skill

## Scope
- `apps/api`: NestJS 11 TypeScript REST API running on port `3000`.

---

## Architectural Rules

1. **Separation of Concerns**:
   - `src/app.controller.ts`: Handles HTTP routing, input validation, and HTTP status codes.
   - `src/app.service.ts`: Implements business calculations, data models, and portfolio analytics.

2. **CORS Invariant**:
   - `src/main.ts` must allow CORS origins for both the web app (`http://localhost:4200`) and the mobile app (`http://localhost:8100`):
     ```typescript
     app.enableCors({
       origin: ['http://localhost:4200', 'http://localhost:8100'],
       credentials: true,
     });
     ```

3. **Core API Endpoints**:
   - `GET /`: Returns welcome message `'Charlotte Wealth API - Hello World!'`.
   - `GET /health`: Returns `{ status: 'healthy', service: 'Charlotte Wealth Core API', uptimeSeconds: ... }`.
   - `GET /api/portfolio`: Returns `PortfolioSummary` (net worth, asset allocations, recent transactions).

---

## Verification Commands

```bash
# Compile NestJS API
npm run build:api

# Run centralized API contract tests
npm run test:api
```

