# Charlotte Wealth Mobile Application

Cross-platform mobile application for the Charlotte Wealth Private Wealth Management platform, built with **Ionic 9 + Angular 22 (Standalone) + Capacitor 8**.

---

## 📱 Mobile Testing

All end-to-end and mobile test automation suites (including **Appium** and **Cucumber BDD**) have been **centralized into [`apps/e2e`](file:///c:/dev/charlotte-wealth/apps/e2e)**.

The mobile workspace delegates its test scripts to `apps/e2e`:

```bash
# Unit tests
npm run test:unit

# Mobile BDD end-to-end tests (via apps/e2e)
npm run test:e2e

# Mobile Appium Android tests (via apps/e2e)
npm run test:appium:android

# Mobile Appium iOS tests (via apps/e2e)
npm run test:appium:ios
```

For full mobile test specifications, Appium drivers, and emulator configurations, see the centralized suite in **[`apps/e2e/README.md`](file:///c:/dev/charlotte-wealth/apps/e2e/README.md)**.
