# AGENTS.md - Universal Coding Agent Standard

This repository supports AI coding agents across **Claude**, **Codex**, **Gemini**, and **Cursor**.

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
│   ├── mobile/                  # Ionic 9 + Angular 22 Standalone + Capacitor 8 (Port: 8100)
│   ├── api/                     # NestJS 11 REST API (Port: 3000)
│   └── e2e/                     # Centralized Test Suite (Web, API, Mobile BDD & Appium)
├── CLAUDE.md                    # Anthropic Claude agent instructions
├── GEMINI.md                    # Google Gemini agent instructions
├── .cursorrules                 # Cursor IDE system prompt
├── .cursor/rules/               # Cursor IDE scoped MDC rules
└── AGENTS.md                    # Universal Agent specification (OpenAI Codex standard)
```

---

## 🚀 Canonical Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start All** | `npm start` | Runs API (3000), Web (4200), and Mobile (8100) concurrently |
| **Start API** | `npm run start:api` | Starts NestJS API |
| **Start Web** | `npm run start:web` | Starts Angular Web dev server |
| **Start Mobile** | `npm run start:mobile` | Starts Ionic dev server on port 8100 |
| **Build All** | `npm run build:all` | Compiles API, Web, and Mobile bundles |
| **Test All** | `npm test` | Runs all centralized Cucumber BDD tests |
| **Test Web** | `npm run test:web` | Web BDD tests (`@web`) |
| **Test API** | `npm run test:api` | API health and contract BDD tests (`@api`) |
| **Test Mobile** | `npm run test:mobile` | Mobile BDD tests (`@mobile`) |
| **Appium Android** | `npm run test:mobile:appium:android` | UiAutomator2 mobile automation |
| **Appium iOS** | `npm run test:mobile:appium:ios` | XCUITest mobile automation |
| **Appium Drivers** | `npm run appium:drivers` | Lists installed Appium drivers |
| **Type Check** | `npm run typecheck` | Strict TypeScript verification for test suites |
| **Secret Leak Scanner** | `npm run scan:secrets` | Scans codebase for unmasked credentials |

---

## 🤹 Agent Skills (`.agents/skills`)

All agents (including OpenAI Codex) must reference the skills in `.agents/skills/` before executing tasks:

| Skill | Path | Description |
| :--- | :--- | :--- |
| **Monorepo Workflow** | [`.agents/skills/monorepo-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/monorepo-workflow/SKILL.md) | Workspaces, parallel dev server, port matrix (3000, 4200, 8100). |
| **Cucumber BDD** | [`.agents/skills/cucumber-bdd/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/cucumber-bdd/SKILL.md) | Gherkin best practices, declarative scenarios, BRIEF, step reuse. |
| **E2E & BDD Testing** | [`.agents/skills/e2e-testing/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/e2e-testing/SKILL.md) | Serenity/JS Screenplay, Cucumber tags, living HTML reports. |
| **Mobile Appium** | [`.agents/skills/mobile-appium/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/mobile-appium/SKILL.md) | Appium 3 / WDIO 10 automation, WebView / Native context switching. |
| **Angular Development** | [`.agents/skills/angular-development/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/angular-development/SKILL.md) | Standalone Components, Signals, Tailwind CSS v4 styling. |
| **NestJS API** | [`.agents/skills/nestjs-api/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/nestjs-api/SKILL.md) | REST controllers, services, CORS policies, portfolio data models. |
| **Implementation Workflow** | [`.agents/skills/implementation-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/implementation-workflow/SKILL.md) | Standard 6-phase engineering lifecycle: Baseline -> BDD -> Code -> Multi-Device -> Test Review -> Doc Sync. |

---

## 🔒 Invariants & Guardrails

1. **Centralized Testing**: All end-to-end, integration, API contract, and mobile Appium tests must remain centralized in `apps/e2e`. Never recreate local E2E test directories inside `apps/web` or `apps/mobile`.
2. **Ports**: API is `3000`, Web is `4200`, Mobile is `8100`.
3. **No NgModules**: Frontend code must always use Angular Standalone Components and Signals.
4. **Code Quality**: Follow Prettier formatting and TypeScript strictness at all times.

