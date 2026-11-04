# Centralized Agent Skills (`.agents`)

This directory houses the **centralized skill catalog** for all AI coding agents working in the Charlotte Wealth repository (**Claude**, **Codex**, **Gemini**, and **Cursor**).

---

## 🎯 Purpose of Agent Skills

Agent Skills provide modular, actionable domain instructions that prevent repetition across agent configuration files. Any agent can inspect this directory, load the relevant skill for its current task, and execute with full context and consistency.

---

## 📚 Skills Catalog

| Skill Name | Path | Domain & Purpose |
| :--- | :--- | :--- |
| **`monorepo-workflow`** | [`.agents/skills/monorepo-workflow/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/monorepo-workflow/SKILL.md) | Managing npm workspaces, starting parallel dev servers, building artifacts, and port assignments. |
| **`e2e-testing`** | [`.agents/skills/e2e-testing/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/e2e-testing/SKILL.md) | Authoring and running Serenity/JS Screenplay & Cucumber BDD tests in `apps/e2e`. |
| **`mobile-appium`** | [`.agents/skills/mobile-appium/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/mobile-appium/SKILL.md) | Native and hybrid mobile test automation with Appium 3, WebdriverIO 10, UiAutomator2, and XCUITest. |
| **`angular-development`** | [`.agents/skills/angular-development/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/angular-development/SKILL.md) | Angular Standalone Components, Signals state management, and Tailwind CSS v4 styling. |
| **`nestjs-api`** | [`.agents/skills/nestjs-api/SKILL.md`](file:///c:/dev/charlotte-wealth/.agents/skills/nestjs-api/SKILL.md) | NestJS 11 backend patterns, controllers, services, CORS policies, and data contracts. |

---

## 🤖 How Agents Should Utilize Skills

When an AI agent receives a task:
1. **Identify Relevant Domain**: Check the table above for skills matching the user request.
2. **Read the Skill Instruction**: Read `SKILL.md` in the corresponding skill directory.
3. **Execute per Skill Standards**: Follow the conventions, commands, and guardrails specified in the skill.

