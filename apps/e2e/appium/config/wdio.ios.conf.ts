import { config as sharedConfig } from './wdio.shared.conf.js';

/**
 * iOS Appium configuration with XCUITest driver
 */
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  baseUrl: process.env.MOBILE_BASE_URL || 'http://127.0.0.1:8100',

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15 Pro',
      'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '17.5',
      'appium:orientation': 'PORTRAIT',
      'appium:newCommandTimeout': 240,
      ...(process.env.APP_PATH
        ? {
            'appium:app': process.env.APP_PATH,
            'appium:bundleId': process.env.IOS_BUNDLE_ID || 'io.ionic.starter',
            'appium:autoAcceptAlerts': true,
          }
        : {
            'appium:browserName': 'Safari',
          }),
    },
  ],
};

