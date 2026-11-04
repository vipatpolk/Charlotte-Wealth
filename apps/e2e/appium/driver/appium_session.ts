import { remote } from 'webdriverio';
import type { Browser } from 'webdriverio';
import * as net from 'net';

let mobileSession: Browser | null = null;

export interface MobileSessionOptions {
  hostname?: string;
  port?: number;
  baseUrl?: string;
}

/**
 * Checks whether an Appium daemon is actively listening on the target port
 */
function isPortReachable(host: string, port: number, timeoutMs = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Manages the Appium / WebdriverIO session lifecycle for mobile BDD testing.
 * Connects to Appium 3 server if running; otherwise gracefully uses WebdriverIO mobile viewport emulation.
 */
export async function getOrCreateMobileSession(options: MobileSessionOptions = {}): Promise<Browser> {
  if (mobileSession) {
    return mobileSession;
  }

  const hostname = options.hostname || process.env.APPIUM_HOST || '127.0.0.1';
  const port = options.port || parseInt(process.env.APPIUM_PORT || '4723', 10);
  const baseUrl = options.baseUrl || process.env.MOBILE_BASE_URL || 'http://localhost:8100';

  const appiumAlive = await isPortReachable(hostname, port);

  if (appiumAlive) {
    try {
      mobileSession = await remote({
        hostname,
        port,
        path: process.env.APPIUM_PATH || '/',
        capabilities: {
          platformName: 'Android',
          'appium:automationName': 'UiAutomator2',
          'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
          'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '14.0',
          'appium:browserName': 'Chrome',
          'appium:newCommandTimeout': 240,
        },
        baseUrl,
        logLevel: 'error',
      });
      return mobileSession;
    } catch {
      // Fall through to fallback
    }
  }

  // Graceful fallback to local Chrome browser with mobile viewport emulation
  mobileSession = await remote({
    capabilities: {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--headless=new', '--disable-gpu', '--window-size=412,915'],
      },
    },
    baseUrl,
    logLevel: 'error',
  });

  return mobileSession;
}

export async function closeMobileSession(): Promise<void> {
  if (mobileSession) {
    try {
      await mobileSession.deleteSession();
    } catch {
      // Ignore cleanup error
    } finally {
      mobileSession = null;
    }
  }
}


