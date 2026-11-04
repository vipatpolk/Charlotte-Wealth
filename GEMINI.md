# GEMINI.md - Instructions for Google Gemini & Antigravity

Repository guidelines, architecture map, and operational rules for **Charlotte Wealth**.

---

## 🏛️ Monorepo Topology

```text
charlotte-wealth/
├── .agents/
│   └── skills/                  # Centralized skills catalog
│       ├── monorepo-workflow/   # Workspace & port management
│       ├── cucumber-bdd/        # Gherkin authoring & BDD best practices
│       ├── e2e-testing/         # Serenity/JS & Cucumber BDD
│       ├── mobile-appium/       # Appium 3 & WDIO 10 mobile specs
│       ├── angular-development/ # Standalone components & Signals
│       └── nestjs-api/          # NestJS backend API architecture
├── apps/
│   ├── web/                     # Angular 21 Standalone + Tailwind CSS v4 (Port: 4200)
│   ├── mobile/                  # Ionic 9 + Angular 22 + Capacitor 8 (Port: 8100)
│   ├── api/                     # NestJS 11 REST API (Port: 3000)
│   └── e2e/                     # Centralized Test Suite (Web, API, Mobile BDD & Appium)
├── package.json                 # Monorepo workspaces definition
├── CLAUDE.md                    # Claude guidelines
├── GEMINI.md                    # Gemini guidelines
└── AGENTS.md                    # Universal Agent guidelines (OpenAI Codex standard)
```

---

## ⚙️ Core Workflows

### Starting Services
- **Run All**: `npm start` (starts NestJS API, Angular Web, and Ionic Mobile concurrently)
- **API Only**: `npm run start:api` (accessible at `http://localhost:3000`)
- **Web Only**: `npm run start:web` (accessible at `http://localhost:4200`)
- **Mobile Only**: `npm run start:mobile` (accessible at `http://localhost:8100`)

### Building
- **Full Build**: `npm run build:all`
- **Selective**: `npm run build:api`, `npm run build:web`, `npm run build:mobile`

### Testing
- **All E2E Specs**: `npm test` or `npm run test:e2e`
- **Web Feature Specs**: `npm run test:web`
- **API Feature Specs**: `npm run test:api`
- **Mobile Feature Specs**: `npm run test:mobile`
- **Android Appium**: `npm run test:mobile:appium:android`
- **iOS Appium**: `npm run test:mobile:appium:ios`
- **Driver Verification**: `npm run appium:drivers`
- **Type Checking**: `npm run typecheck`
- **Secret Scanning**: `npm run scan:secrets`

---

## 🤹 Centralized Agent Skills (`.agents/skills`)

Gemini and Antigravity agents should dynamically reference the domain skills before executing changes:

- **Monorepo Operations**: [`.agents/skills/monorepo-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/monorepo-workflow/SKILL.md)
- **Cucumber BDD & Gherkin Best Practices**: [`.agents/skills/cucumber-bdd/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/cucumber-bdd/SKILL.md)
- **E2E & BDD Acceptance Testing**: [`.agents/skills/e2e-testing/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/e2e-testing/SKILL.md)
- **Appium Mobile Testing**: [`.agents/skills/mobile-appium/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/mobile-appium/SKILL.md)
- **Angular & Tailwind CSS v4**: [`.agents/skills/angular-development/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/angular-development/SKILL.md)
- **NestJS REST API Architecture**: [`.agents/skills/nestjs-api/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/nestjs-api/SKILL.md)
- **Implementation Workflow**: [`.agents/skills/implementation-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/implementation-workflow/SKILL.md)

---

## 🛡️ Engineering Standards for Gemini

1. **Strict Monorepo Scope**:
   - `apps/e2e` is the single source of truth for all acceptance and E2E testing.
   - Do not install duplicate testing harnesses into `apps/web` or `apps/mobile`.
2. **Frontend Standards**:
   - Angular Standalone Components only (`imports: [...]`, no `NgModule`).
   - Signals for component state (`signal`, `computed`).
   - Tailwind CSS v4 directives in `apps/web/src/styles.css`.
3. **Backend Standards**:
   - NestJS modules, controllers, and services with strict return types.
   - CORS enabled for both `http://localhost:4200` and `http://localhost:8100`.
4. **Appium & Mobile Automation**:
   - WebdriverIO 10 runner with Mocha and `expect-webdriverio`.
   - Uses Page Objects with `switchToWebView()` / `switchToNativeApp()` context switching.

