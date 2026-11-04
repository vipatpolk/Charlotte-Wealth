---
name: angular-development
description: Best practices, styling conventions, and reactive state management for Angular 21 (Web) and Angular 22 (Mobile).
---

# Angular Development Skill

## Scope
- `apps/web`: Angular 21 Standalone + Tailwind CSS v4
- `apps/mobile`: Ionic 9 + Angular 22 Standalone + Capacitor 8

---

## Architectural Rules

1. **Standalone Components Only**:
   - Never generate or introduce `NgModule`.
   - All components must declare their dependencies explicitly via `imports: [...]`.

2. **Signals-Based State Management**:
   - Use Angular Signals (`signal()`, `computed()`) for component state.
   - Avoid legacy RxJS Subject subscriptions in templates when Signals can be used.

3. **Styling & Design System**:
   - **Web**: Uses Tailwind CSS v4 imported via `@import "tailwindcss";` in `apps/web/src/styles.css`.
   - **Theme**: Luxury private wealth management dark mode (`bg-slate-900`, `bg-slate-950`, emerald positive PnL highlights, amber accents).
   - **Mobile**: Uses Ionic components (`ion-card`, `ion-item`, `ion-toolbar`, `ion-tabs`) with Ionic theme CSS variables.

---

## Verification Commands

```bash
# Build web app
npm run build:web

# Build mobile app
npm run build:mobile

# Mobile linting & Prettier check
npm run lint --workspace=mobile
```

