import { browser } from '@wdio/globals';

/**
 * Base Page Object containing shared methods and context helpers
 * for mobile automation in apps/e2e.
 */
export default class Page {
  /**
   * Opens a URL route
   * @param path route or URL path
   */
  public async open(path: string = ''): Promise<void> {
    await browser.url(path);
  }

  /**
   * Helper to switch to WEBVIEW context in hybrid Capacitor / Ionic mobile apps
   */
  public async switchToWebView(): Promise<void> {
    if (browser.isMobile) {
      const contexts = (await browser.getContexts()) as string[];
      const webview = contexts.find((ctx) => ctx.toUpperCase().includes('WEBVIEW'));
      if (webview) {
        await browser.switchContext(webview);
      }
    }
  }

  /**
   * Helper to switch back to NATIVE_APP context
   */
  public async switchToNativeApp(): Promise<void> {
    if (browser.isMobile) {
      await browser.switchContext('NATIVE_APP');
    }
  }
}

