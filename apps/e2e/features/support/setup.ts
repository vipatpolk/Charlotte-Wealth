import { BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, Cast, ArtifactArchiver } from '@serenity-js/core';
import { ConsoleReporter } from '@serenity-js/console-reporter';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { Photographer, TakePhotosOfFailures } from '@serenity-js/web';
import { CallAnApi } from '@serenity-js/rest';
import { chromium, Browser } from 'playwright';
import { closeMobileSession } from '../../appium/driver/appium_session';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  for (const envFile of candidatePaths) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^['"](.*)['"]$/, '$1');
            if (key && !process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
      break;
    }
  }
}

loadEnv();

setDefaultTimeout(60 * 1000);

let browser: Browser;

export function getBrowser(): Browser {
  return browser;
}

BeforeAll(async () => {
  try {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    });
  } catch (err: any) {
    // Graceful fallback for headless or pure API test execution
    console.warn(`[setup] Chromium browser launch skipped: ${err?.message || err}`);
  }

  configure({
    actors: Cast.where((actor) => {
      const abilities: any[] = [
        CallAnApi.at(process.env.API_BASE_URL || 'http://localhost:3000'),
      ];
      if (browser) {
        abilities.push(BrowseTheWebWithPlaywright.using(browser));
      }
      return actor.whoCan(...abilities);
    }),
    crew: [
      ArtifactArchiver.storingArtifactsAt('./target/site/serenity'),
      Photographer.whoWill(TakePhotosOfFailures),
      ConsoleReporter.withDefaultColourSupport(),
      SerenityBDDReporter.fromJSON({ specDirectory: 'features' }),
    ],
  });
});

AfterAll(async () => {
  if (browser) {
    await browser.close();
  }
  await closeMobileSession();
});
