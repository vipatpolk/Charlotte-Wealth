# Charlotte Wealth - Centralized E2E Test Suite

Centralized End-to-End, Integration, and Acceptance Testing suite for the Charlotte Wealth platform covering **Web**, **Backend API**, and **Mobile (BDD & Appium)**.

---

## 🏛️ Centralized Test Architecture

```text
apps/e2e/
├── features/                            # Cucumber Gherkin Living Specifications
│   ├── api/                             # REST API & Calculation Contracts (42 Scenarios)
│   │   ├── health_and_security.feature  # Health check, DB probe, API key enforcement (@api)
│   │   ├── portfolio_holdings.feature   # Consolidated positions, FIFO share lots (@api)
│   │   ├── portfolio_analytics.feature  # Asset allocation math, rebalance metrics (@api)
│   │   ├── portfolio_dividends.feature  # Dividend projections, currency parameterization (@api)
│   │   ├── market_data.feature          # Quotes, exchange rates, currency conversion (@api)
│   │   └── financial_tools.feature      # Trade simulator, target cost solver, TVM engine (@api)
│   │
│   ├── web/                             # Web Application E2E Specifications (41 Scenarios)
│   │   ├── dashboard.feature            # Net worth card, currency switcher, privacy mode (@web)
│   │   ├── holdings.feature             # Category tabs, symbol query, FIFO lots view (@web)
│   │   ├── analytics.feature            # Allocation charts, performance, risk metrics (@web)
│   │   ├── dividends.feature            # Dividend calendar, cashflow projections (@web)
│   │   ├── transactions.feature         # Transaction feed, category filter, ticker search (@web)
│   │   └── tools.feature                # Average cost, TVM, and rebalance simulators (@web)
│   │
│   ├── mobile/                          # Mobile Client BDD Specifications (25 Scenarios)
│   │   ├── mobile_dashboard.feature     # Mobile net worth card, theme switcher, privacy (@mobile)
│   │   ├── mobile_holdings.feature      # Mobile category dropdown, symbol search (@mobile)
│   │   ├── mobile_analytics_and_dividends.feature # Mobile analytics tabs, dividend filters (@mobile)
│   │   └── mobile_transactions_and_tools.feature  # Mobile trade feed, TVM solver, rebalance (@mobile)
│   │
│   ├── step_definitions/                # Screenplay Pattern Step Definitions
│   │   ├── web.steps.ts                 # Web automation via Playwright Page
│   │   ├── api.steps.ts                 # REST API requests via Playwright APIRequestContext
│   │   └── mobile.steps.ts              # Mobile automation via WebdriverIO / Appium
│   │
│   └── support/
│       └── setup.ts                     # Serenity cast, Playwright lifecycle, reporters
│
├── playwright/                          # Playwright Automation Architecture
│   └── pageobjects/
│       └── web_portfolio.page.ts        # Typed Page Object for Angular Web app
│
├── appium/                              # Native & Hybrid Appium Mobile Test Automation
│   ├── driver/
│   │   └── appium_session.ts            # Appium 3 session manager with fallback
│   ├── config/
│   │   ├── wdio.shared.conf.ts          # Shared WebdriverIO & Appium configuration
│   │   ├── wdio.android.conf.ts         # Android UiAutomator2 capabilities
│   │   └── wdio.ios.conf.ts             # iOS XCUITest capabilities
│   ├── pageobjects/
│   │   ├── page.ts                      # Base Page Object with WebView/Native switching
│   │   └── mobile_portfolio.page.ts     # Mobile portfolio screen Page Object
│   └── specs/
│       ├── mobile.portfolio.spec.ts     # Mobile portfolio net worth specs
│       ├── mobile.navigation.spec.ts    # Mobile tab navigation specs
│       ├── mobile.holdings_and_transactions.spec.ts # Holdings & transactions specs
│       └── mobile.analytics_and_tools.spec.ts       # Analytics & tools specs
│
├── cucumber.js                          # Profiles (default, api, web, mobile, smoke, regression)
├── playwright.config.ts                 # Standalone Playwright runner configuration
├── wdio.conf.ts                         # WebdriverIO runner configuration
├── tsconfig.json                        # TypeScript configuration for Serenity & Cucumber
└── tsconfig.appium.json                 # TypeScript configuration for Appium / WDIO
```

---

## 🚀 Execution Commands

From the monorepo root or within `apps/e2e`:

### 1. Run All Tests
```bash
# Unified single-pass execution of all 108 BDD scenarios
npm test

# Or run sequentially across each domain
npm run test:all
```

### 2. Run Domain-Specific Test Suites

```bash
# Backend API Contracts & Calculation Tests (@api) - 42 Scenarios
npm run test:api

# Web Dashboard & Portfolios Tests (@web) - 41 Scenarios
npm run test:web

# Mobile BDD Tests (@mobile) - 25 Scenarios
npm run test:mobile
```

### 3. Run Native / Hybrid Appium Tests

```bash
# List installed Appium drivers (UiAutomator2, XCUITest)
npm run appium:drivers

# Run Android Appium tests (UiAutomator2)
npm run test:mobile:appium:android

# Run iOS Appium tests (XCUITest)
npm run test:mobile:appium:ios
```

### 4. Interactive & Headed Mode

```bash
# Run Cucumber tests in headed browser mode
npm run test:e2e:headed
```

### 5. Type Checking & Reports

```bash
# Strictly typecheck all Cucumber and Appium tests
npm run typecheck --workspace=e2e

# Generate Serenity BDD living documentation report
npm run test:e2e:report
```
