---
name: cucumber-bdd
description: Industry-standard Cucumber BDD and Gherkin best practices, declarative scenario authoring, test suite hygiene, step reusability, and living documentation standards.
---

# Cucumber BDD & Gherkin Best Practices

Comprehensive guidelines and standards for Behavior-Driven Development (BDD), Gherkin scenario authoring, and test architecture based on official Cucumber documentation and industry best practices.

---

## 🧭 The Core Philosophy of BDD

Behavior-Driven Development (BDD) is an agile collaboration methodology that bridges the communication gap between business stakeholders, developers, and QA (often termed the **Three Amigos**).

BDD follows a continuous three-phase cycle:

```text
┌────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Discovery   │  ──▶  │ 2. Formulation  │  ──▶  │ 3. Automation   │
│ (Three Amigos) │       │ (Better Gherkin)│       │ (Executable)    │
└────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Discovery (Shift-Left)**:
   - Formulate concrete examples during user story refinement *before* coding begins.
   - Explore boundaries, ambiguities, and edge cases collaboratively using Example Mapping.
2. **Formulation**:
   - Formalize examples into human-readable, structured Gherkin (`Given-When-Then`) specifications.
   - Establish **living documentation** that serves as the single source of truth for requirements.
3. **Automation**:
   - Connect Gherkin steps to step definitions and test execution frameworks (e.g., Serenity/JS, Playwright, Appium).
   - Use automated scenarios as regression guards that continuously verify system behavior.

---

## 🎯 The Golden Rule of Gherkin

> **The Golden Question**: *"Will this wording need to change if the implementation or UI design changes?"*
>
> If the answer is **"Yes"**, the scenario is coupled to implementation details. Rewrite it to describe the **business behavior (the "What")** rather than the **technical mechanism (the "How")**.

---

## ⚖️ Declarative vs. Imperative Style

Scenarios must be written in a **declarative style** (business intent and outcomes) rather than an **imperative style** (mechanical keystrokes, clicks, and page navigation).

### ❌ Imperative / Procedural Anti-Pattern
```gherkin
Scenario: User logs into private banking
  Given I navigate to "http://localhost:4200/login"
  When I click the input with id "#username"
  And I type "Charlotte" into "#username"
  And I click the input with id "#password"
  And I type "Secret123!" into "#password"
  And I click on the button with text "Submit"
  Then the current URL should be "http://localhost:4200/dashboard"
  And I should see element ".welcome-banner" containing "Welcome back, Charlotte"
```
*Problems:*
- Brittle: Breaks if an ID, URL, or button text changes.
- Cluttered: Obscures business intent behind low-level UI choreography.
- Not readable for non-technical product owners.

### ✅ Declarative Best Practice
```gherkin
Scenario: Charlotte accesses her wealth portfolio dashboard
  Given "Charlotte" has an active private wealth account
  When she signs in with valid credentials
  Then she should see her consolidated portfolio dashboard
  And she should be greeted with "Welcome back, Charlotte"
```
*Benefits:*
- Resilient against UI restyling, redesigns, and refactorings.
- Expresses actual business value and acceptance criteria.
- Step definitions encapsulate mechanics (clicks, waits, locators) via the Screenplay pattern or Page Objects.

---

## 📐 The BRIEF Principles for Scenarios

Every scenario should adhere to the **BRIEF** acronym:

| Principle | Description |
| :--- | :--- |
| **B - Business Language** | Use domain-driven terms familiar to stakeholders; avoid technical jargon (HTTP verbs, CSS selectors, SQL). |
| **R - Real Data** | Use concrete, illustrative domain data (e.g., `$2,845,430.00`, `Lady Charlotte`) rather than placeholders (`test_user`, `foo`). |
| **I - Intention Revealing** | Express *why* the user is performing the action and the expected business outcome. |
| **E - Essential** | Include only details pertinent to the specific rule being verified. Omit irrelevant fields. |
| **F - Focused** | Test exactly one rule or behavior per scenario. |

---

## 🛠️ Step Keyword Hygiene: Given, When, Then

Use Gherkin keywords strictly according to their semantic purpose:

- **`Given` (Context/Preconditions)**:
  - Establishes the initial state of the world before the action occurs.
  - *Example*: `Given "Charlotte" has 1,000 shares of "AAPL"`
- **`When` (Action/Trigger)**:
  - Represents the single event or action executed by the actor or system.
  - **Rule**: Avoid multiple actions in one step. Keep exactly one primary action per scenario.
  - *Example*: `When she executes a sell order for 200 shares of "AAPL"`
- **`Then` (Observable Outcome/Assertion)**:
  - Verifies the observable consequence or state change produced by the action.
  - *Example*: `Then her remaining "AAPL" position should be 800 shares`
- **`And` / `But` (Continuations)**:
  - Extends previous clauses cleanly.

### 🚫 The "And" Conjunction Trap
Never combine multiple distinct actions using "and" inside a single step string:
- ❌ `When she enters her password and clicks the submit button`
- ✅ Split into separate steps or raise abstraction:
  - Modular: `When she submits her credentials`

---

## 🧩 Advanced Gherkin Structures

### 1. `Background`
- **Purpose**: Group common setup steps shared across **all** scenarios in a single feature file.
- **Best Practices**:
  - Keep it short (1–3 steps max).
  - Use only for context (`Given`), never for actions (`When`) or assertions (`Then`).
  - Do **not** hide crucial scenario-specific context in the Background; if a scenario needs unique data, keep it visible in the scenario.

```gherkin
Background:
  Given the portfolio valuation service is online
  And "Charlotte" is authenticated to private banking
```

### 2. `Scenario Outline` with `Examples:`
- **Purpose**: Parameterize repetitive scenarios that test the same business logic against multiple inputs and outputs.
- **Best Practices**:
  - Use descriptive column headers.
  - Keep example tables focused on key boundary values, happy paths, and error conditions.

```gherkin
Scenario Outline: Portfolio risk category assignment based on equity exposure
  Given an investor has an equity allocation of <equity_percent>%
  When the risk assessment is calculated
  Then the portfolio classification should be "<risk_profile>"

  Examples:
    | equity_percent | risk_profile  |
    | 20             | Conservative  |
    | 55             | Balanced      |
    | 85             | Aggressive    |
```

### 3. Data Tables
- **Purpose**: Pass structured data, records, or lists into a single step without cluttering step definitions.

```gherkin
Given "Charlotte" holds the following asset allocations:
  | Asset Class        | Value       | Target Percent |
  | Equities           | 1700000.00  | 60%            |
  | Fixed Income       | 850000.00   | 30%            |
  | Cash & Equivalents | 295430.00   | 10%            |
```

### 4. `Rule` Keyword
- **Purpose**: Group related scenarios under specific business rules within complex features (Cucumber 6+).

```gherkin
Feature: Dividend Reinvestment Plan (DRIP)

  Rule: Cash dividends below threshold are deposited to sweep account
    Scenario: Dividend payout below $50 threshold
      ...

  Rule: Cash dividends meeting threshold automatically purchase fractional shares
    Scenario: Dividend payout exceeding $50 threshold
      ...
```

---

## 🗂️ Test Suite Organization & File Sizing

1. **5 to 10 Scenarios Per Feature File**:
   - Limit feature files to 5–10 scenarios to prevent bloated, unmaintainable specifications.
   - If a feature file grows larger, break it into smaller sub-features by sub-domain or user journey.
2. **One Feature File per Domain Component / Journey**:
   - Keep features focused on a single capability (e.g., `portfolio_overview.feature`, `tvm_calculator.feature`, `asset_allocation.feature`).
3. **Directory Mirroring**:
   - Organize feature files and step definitions into modular, domain-aligned folders:
     ```text
     apps/e2e/features/
     ├── web/               # Web client acceptance features
     ├── api/               # API contract and calculation features
     ├── mobile/            # Mobile client acceptance features
     └── step_definitions/  # Modular step definitions
     ```
4. **Independent & Order-Agnostic Scenarios**:
   - Scenarios must be completely isolated and executable in any order or in parallel.
   - Never rely on the state left behind by a previous scenario.

---

## 🏷️ Strategic Tagging

Use semantic tags to organize suites and control CI/CD execution:

| Tag Pattern | Purpose | Example |
| :--- | :--- | :--- |
| **Platform / Target** | Identifies application boundary | `@web`, `@api`, `@mobile` |
| **Domain / Module** | Groups by business domain | `@portfolio`, `@auth`, `@tvm` |
| **Test Severity** | Controls execution pipeline stage | `@smoke`, `@sanity`, `@regression` |
| **Workflow State** | Marks development status | `@wip` (work in progress), `@skip` |

### Tag Expressions in CI/CD
```bash
# Run fast smoke tests on PR commits
npx cucumber-js --tags "@smoke and not @wip"

# Run all portfolio domain tests across web and API
npx cucumber-js --tags "@portfolio and (@web or @api)"
```

---

## 🔄 Step Definition Reusability & DRY Principles

1. **Uniform Phrasing & Case Consistency**:
   - Cucumber steps are case-sensitive. Standardize phrasing across all features (e.g., always use `Then the response status should be {int}`).
2. **Cucumber Expressions over Complex Regex**:
   - Prefer standard Cucumber expressions:
     ```typescript
     // Prefer:
     When('{string} requests the API {string} endpoint', async (actor: string, path: string) => { ... });
     
     // Over complex regex:
     When(/^"([^"]*)" requests the API "([^"]*)" endpoint$/, ...);
     ```
3. **Decouple Steps from Mechanics**:
   - Keep step definitions thin. Delegate browser automation, API requests, and assertions to reusable Screenplay tasks or Page Objects.

---

## 🚫 Common Cucumber Anti-Patterns Summary

| Anti-Pattern | Why It Fails | Recommended Solution |
| :--- | :--- | :--- |
| **UI Scripting / Incognito** | Detailed click/fill sequences make tests brittle and unreadable. | Write declaratively; move locators and clicks into page objects or tasks. |
| **The "And" Trap** | Steps like `When I enter email and password and click login` break modularity. | Break into separate atomic steps or use a declarative summary step. |
| **Monolithic Feature Files** | Features with 20+ scenarios become difficult to navigate and maintain. | Enforce 5–10 scenarios per file; split by business rules or sub-modules. |
| **Background Overload** | 8+ step backgrounds hide essential prerequisites and slow down every test. | Keep background under 3 steps; use domain builders or fixtures for setup. |
| **Interdependent Tests** | Scenario B fails if Scenario A fails or runs in a different order. | Reset state in hooks/fixtures; ensure every scenario creates its own state. |
| **Missing Traceability** | Scenarios disconnected from user requirements. | Include standard user story headers (`As a... / I want... / So that...`) with story IDs. |

