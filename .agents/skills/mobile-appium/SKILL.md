---
name: mobile-appium
description: Executing, authoring, and maintaining Appium 3 and WebdriverIO 10 mobile test automation for Android (UiAutomator2) and iOS (XCUITest).
---

# Mobile Automation with Appium Skill

## Overview
Appium mobile automation is centralized in `apps/e2e/appium`. It automates mobile testing against real devices, emulators, and simulators for both Android and iOS.

---

## Directory Structure in `apps/e2e/appium`

```text
apps/e2e/appium/
├── config/
│   ├── wdio.shared.conf.ts         # Base WebdriverIO runner & @wdio/appium-service config
│   ├── wdio.android.conf.ts        # Android UiAutomator2 capabilities
│   └── wdio.ios.conf.ts            # iOS XCUITest capabilities
├── pageobjects/
│   ├── page.ts                     # Base Page Object with WebView/Native context switching
│   └── mobile_portfolio.page.ts    # Mobile portfolio selectors and interactions
└── specs/
    ├── mobile.portfolio.spec.ts    # Verifies net worth balance ($2,845,430.00), allocations
    └── mobile.navigation.spec.ts   # Verifies bottom tab navigation (Portfolio, Allocations, Advisory)
```

---

## Key Commands

From monorepo root:

```bash
# Check installed Appium drivers
npm run appium:drivers

# Run Android Appium tests (UiAutomator2)
npm run test:mobile:appium:android

# Run iOS Appium tests (XCUITest - macOS)
npm run test:mobile:appium:ios

# Start standalone Appium server (port 4723)
npm run appium
```

---

## Technical Guidelines for Appium

### 1. Hybrid App Context Switching
Ionic and Capacitor applications render within a mobile `WEBVIEW`. When authoring Appium tests:
- Extend `apps/e2e/appium/pageobjects/page.ts`.
- Call `await page.switchToWebView()` to interact with Ionic web components.
- Call `await page.switchToNativeApp()` when inspecting native device dialogs or system permissions.

### 2. Environment Variables & Overrides
- `ANDROID_DEVICE_NAME`: Defaults to `'Android Emulator'`.
- `ANDROID_PLATFORM_VERSION`: Defaults to `'14.0'`.
- `IOS_DEVICE_NAME`: Defaults to `'iPhone 15 Pro'`.
- `IOS_PLATFORM_VERSION`: Defaults to `'17.5'`.
- `APP_PATH`: Specify path to `.apk` or `.app` for testing prebuilt binaries. If omitted, Chrome (Android) or Safari (iOS) will be automated against `MOBILE_BASE_URL`.
- `MOBILE_BASE_URL`: Defaults to `http://10.0.2.2:8100` for Android emulator (mapping to host) and `http://127.0.0.1:8100` for iOS simulator.

