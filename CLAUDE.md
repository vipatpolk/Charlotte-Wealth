# CLAUDE.md - Instructions for Claude in Charlotte Wealth

Welcome to **Charlotte Wealth**, a private wealth management platform structured as an npm workspaces monorepo.

---

## 🏛️ Project Architecture

| Application | Path | Tech Stack | Default Port |
| :--- | :--- | :--- | :--- |
| **Web Dashboard** | `apps/web` | Angular 21, Tailwind CSS v4, Signals | `4200` |
| **Mobile Client** | `apps/mobile` | Ionic 9, Angular 22 (Standalone), Capacitor 8 | `8100` |
| **Backend REST API** | `apps/api` | NestJS 11, TypeScript REST API | `3000` |
| **Centralized Testing** | `apps/e2e` | Serenity/JS, Cucumber BDD, Playwright, Appium 3 (WDIO 10) | N/A |

---

## 💻 Essential Commands

Run all commands from the repository root:

### Development
- `npm start` or `npm run start:all`: Launch API (3000), Web (4200), and Mobile (8100) concurrently.
- `npm run start:api`: Start only the NestJS backend API.
- `npm run start:web`: Start only the Angular web app.
- `npm run start:mobile`: Start only the Ionic mobile app.

### Builds
- `npm run build:all`: Build API, Web, and Mobile bundles.
- `npm run build:api`: Build NestJS backend (`apps/api/dist`).
- `npm run build:web`: Build Angular web client (`apps/web/dist/web`).
- `npm run build:mobile`: Build Ionic client (`apps/mobile/www`).

### Testing (Centralized in `apps/e2e`)
- `npm test` or `npm run test:e2e`: Run all Cucumber BDD specs (Web, API, Mobile).
- `npm run test:web`: Run only Web dashboard BDD tests (`@web`).
- `npm run test:api`: Run only Backend API contract and health tests (`@api`).
- `npm run test:mobile`: Run only Mobile client BDD tests (`@mobile`).
- `npm run test:e2e:headed`: Run tests in headed browser mode.
- `npm run test:e2e:report`: Generate Serenity BDD HTML report.

### Appium Mobile Automation (`apps/e2e/appium`)
- `npm run appium:drivers`: Check installed drivers (`uiautomator2`, `xcuitest`).
- `npm run test:mobile:appium:android`: Run Appium tests with UiAutomator2 on Android.
- `npm run test:mobile:appium:ios`: Run Appium tests with XCUITest on iOS (macOS).
- `npm run appium`: Start local Appium server on `127.0.0.1:4723`.

### Quality & Type Checking
- `npm run typecheck`: Strict TypeScript compilation across test suites.
- `npm run scan:secrets`: Scan codebase for hardcoded secrets and leaked tokens.
- `npm run lint --workspace=mobile`: Lint and verify formatting for mobile.

---

## 🤹 Agent Skills (`.agents/skills`)

Consult and execute according to the centralized skills in `.agents/skills/` before making modifications:

- **[`monorepo-workflow`](file:///c:/dev/charlotte-wealth/.agents/skills/monorepo-workflow/SKILL.md)**: Ports, workspaces, concurrent startup, builds.
- **[`cucumber-bdd`](file:///c:/dev/charlotte-wealth/.agents/skills/cucumber-bdd/SKILL.md)**: Gherkin best practices, declarative scenarios, BRIEF, step reuse.
- **[`e2e-testing`](file:///c:/dev/charlotte-wealth/.agents/skills/e2e-testing/SKILL.md)**: Serenity/JS Screenplay, Cucumber tags (`@web`, `@api`, `@mobile`).
- **[`mobile-appium`](file:///c:/dev/charlotte-wealth/.agents/skills/mobile-appium/SKILL.md)**: Appium 3 / WDIO 10 mobile specs, WebView context switching.
- **[`angular-development`](file:///c:/dev/charlotte-wealth/.agents/skills/angular-development/SKILL.md)**: Standalone components, Signals, Tailwind CSS v4 styling.
- **[`nestjs-api`](file:///c:/dev/charlotte-wealth/.agents/skills/nestjs-api/SKILL.md)**: Controller-service architecture, CORS policies, portfolio models.
- **[`implementation-workflow`](file:///c:/dev/charlotte-wealth/.agents/skills/implementation-workflow/SKILL.md)**: Standard 6-phase feature delivery lifecycle from baseline discovery to documentation sync.

---

## 📐 Coding Conventions & Guidelines

1. **TypeScript & Strictness**:
   - Maintain strict typing (`noImplicitAny`, strict null checks).
   - Avoid `any` types; prefer strict interfaces/types.
2. **Angular (Web & Mobile)**:
   - Use Standalone Components (no legacy NgModules).
   - Use Angular Signals (`signal()`, `computed()`) for reactive state management.
   - Keep styles aligned with Tailwind CSS v4 in web and Ionic variables in mobile.
3. **Backend API (NestJS)**:
   - Structure business logic inside Services; keep Controllers thin.
   - Use explicit return types for endpoint responses.
4. **Testing (Serenity/JS & Appium)**:
   - Use the **Screenplay Pattern** (`actorCalled(...).attemptsTo(...)`).
   - Keep page objects modular in `apps/e2e/appium/pageobjects/`.
   - Never put E2E tests back into `apps/mobile` or `apps/web`—all acceptance and E2E automation lives strictly in `apps/e2e`.

