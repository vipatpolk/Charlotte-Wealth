import { config as androidConfig } from './appium/config/wdio.android.conf.js';
import { config as iosConfig } from './appium/config/wdio.ios.conf.js';

/**
 * Root WDIO configuration file for apps/e2e
 * Defaults to Android, or switches to iOS when PLATFORM=ios is passed.
 */
const platform = (process.env.PLATFORM || 'android').toLowerCase();

export const config: WebdriverIO.Config = platform === 'ios' ? iosConfig : androidConfig;

