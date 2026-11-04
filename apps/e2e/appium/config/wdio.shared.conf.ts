import type { Options } from '@wdio/types';

/**
 * Shared Appium WebdriverIO configuration for centralized E2E mobile testing
 */
export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['../specs/**/*.spec.ts'],
  exclude: [],
  maxInstances: 1,
  logLevel: (process.env.WDIO_LOG_LEVEL as Options.WebDriverLogTypes) || 'info',
  bail: 0,
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Appium server host & port
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  path: process.env.APPIUM_PATH || '/',

  // Automatically start Appium server via @wdio/appium-service unless STANDALONE_APPIUM=true
  services:
    process.env.STANDALONE_APPIUM === 'true'
      ? []
      : [
          [
            'appium',
            {
              args: {
                relaxedSecurity: true,
                address: process.env.APPIUM_HOST || '127.0.0.1',
                port: parseInt(process.env.APPIUM_PORT || '4723', 10),
              },
              logPath: './appium/logs/',
            },
          ],
        ],

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  afterTest: async function (_test, _context, { error }) {
    if (error && browser) {
      try {
        await browser.takeScreenshot();
      } catch (e) {
        // Suppress screenshot errors if driver disconnected
      }
    }
  },
};

