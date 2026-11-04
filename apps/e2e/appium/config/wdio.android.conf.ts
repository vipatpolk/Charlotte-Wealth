import { config as sharedConfig } from './wdio.shared.conf.js';

/**
 * Android Appium configuration with UiAutomator2 driver
 */
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  baseUrl: process.env.MOBILE_BASE_URL || 'http://10.0.2.2:8100',

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
      'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14.0',
      'appium:orientation': 'PORTRAIT',
      'appium:newCommandTimeout': 240,
      ...(process.env.APP_PATH
        ? {
            'appium:app': process.env.APP_PATH,
            'appium:appPackage': process.env.ANDROID_APP_PACKAGE || 'io.ionic.starter',
            'appium:appActivity': process.env.ANDROID_APP_ACTIVITY || 'io.ionic.starter.MainActivity',
            'appium:autoGrantPermissions': true,
          }
        : {
            'appium:browserName': 'Chrome',
          }),
    },
  ],
};

