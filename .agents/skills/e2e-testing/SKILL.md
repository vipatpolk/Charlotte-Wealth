---
name: e2e-testing
description: Authoring and executing centralized acceptance, integration, and BDD specifications using Serenity/JS, Cucumber, and Playwright in apps/e2e.
---

# E2E & BDD Testing Skill

## Architecture Invariant
**All acceptance, end-to-end, and API integration testing must live in `apps/e2e`.** Never recreate local E2E test suites inside `apps/web` or `apps/mobile`.

---

## Directory Structure in `apps/e2e`

```text
apps/e2e/
├── features/
│   ├── web/                     # Web dashboard BDD features (@web)
│   ├── api/                     # REST API BDD features (@api)
│   ├── mobile/                  # Mobile client BDD features (@mobile)
│   ├── step_definitions/        # Serenity/JS step definitions
│   │   ├── web.steps.ts
│   │   ├── api.steps.ts
│   │   └── mobile.steps.ts
│   └── support/
│       └── setup.ts             # Cast abilities (Playwright, REST API) & Serenity reporters
├── cucumber.js                  # Profile configuration (default, web, api, mobile)
├── playwright.config.ts         # Browser & device configurations
└── tsconfig.json                # Strict TypeScript configuration
```

---

## Execution Commands

From the monorepo root:

```bash
# Run ALL Cucumber BDD features (Web, API, Mobile)
npm test

# Run Web dashboard tests only
npm run test:web

# Run Backend API tests only
npm run test:api

# Run Mobile BDD tests only
npm run test:mobile

# Run in headed browser mode
npm run test:e2e:headed

# Generate Serenity BDD living documentation report
npm run test:e2e:report

# Strictly verify TypeScript types
npm run typecheck --workspace=e2e
```

---

## Authoring Guidelines

### 1. Cucumber Features
- Consult [`.agents/skills/cucumber-bdd/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/cucumber-bdd/SKILL.md) for Gherkin best practices, BRIEF guidelines, declarative writing, and anti-pattern prevention.
- Follow the 6-phase engineering lifecycle in [`.agents/skills/implementation-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/implementation-workflow/SKILL.md).
- Place feature files in the corresponding subdirectory (`features/web/`, `features/api/`, `features/mobile/`).
- Tag scenarios appropriately (`@web`, `@api`, `@mobile`).
- Maintain 5 to 10 focused scenarios per feature file.

### 2. Screenplay Pattern (Serenity/JS)
- Use `actorCalled('ActorName')` to initiate actor interactions.
- Web actions use `Navigate.to(...)`, `Page.current()`.
- API calls use `Send.a(GetRequest.to(...))`.
- When asserting API responses that may return JSON objects, convert the body to string safely:
  ```typescript
  Ensure.that(
    LastResponse.body().as((b) => (typeof b === 'object' && b !== null ? JSON.stringify(b) : String(b))),
    includes('expected')
  )
  ```

