import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Interaction } from '@serenity-js/core';
import { getOrCreateMobileSession } from '../../appium/driver/appium_session';
import type { Browser } from 'webdriverio';

let mobileBrowser: Browser;
const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:8100';

// ================= Background & Navigation =================
Given('{string} launches the Charlotte Wealth mobile app via Appium', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor launches mobile app via Appium session`, async () => {
      mobileBrowser = await getOrCreateMobileSession({ baseUrl: MOBILE_URL });
      await mobileBrowser.url(MOBILE_URL);
      // Wait for app to be ready
      const appTitle = await mobileBrowser.$('.logo-text');
      await appTitle.waitForDisplayed({ timeout: 20000 });
    })
  );
});

Given('{string} navigates to the Charlotte Wealth mobile app', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor opens mobile app at ${MOBILE_URL}`, async () => {
      mobileBrowser = await getOrCreateMobileSession({ baseUrl: MOBILE_URL });
      await mobileBrowser.url(MOBILE_URL);
      const appTitle = await mobileBrowser.$('.logo-text');
      await appTitle.waitForDisplayed({ timeout: 20000 });
    })
  );
});

When('he switches to the {string} mobile view', async (viewName: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor switches to the "${viewName}" mobile view`, async () => {
      const btn = await mobileBrowser.$(`#view-toggle-${viewName}`);
      await btn.waitForClickable({ timeout: 10000 });
      await btn.click();
      await mobileBrowser.pause(400);
    })
  );
});

// ================= Dashboard =================
Then('he should see the mobile app title {string}', async (expectedTitle: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile app title contains "${expectedTitle}"`, async () => {
      const logo = await mobileBrowser.$('.logo-text');
      const text = await logo.getText();
      if (!text.includes(expectedTitle)) {
        throw new Error(`Expected mobile app title to include "${expectedTitle}", but got "${text}"`);
      }
    })
  );
});

Then('he should see the mobile net worth card', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile net worth card is displayed`, async () => {
      const card = await mobileBrowser.$('#dashboard-hero, .dashboard-hero-card');
      const isVisible = await card.isDisplayed();
      if (!isVisible) {
        throw new Error('Expected mobile net worth card to be displayed');
      }
    })
  );
});

When('he switches the mobile currency to {string}', async (currency: 'USD' | 'THB') => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor switches mobile currency to ${currency}`, async () => {
      const btn = currency === 'USD' ? await mobileBrowser.$('#currency-usd') : await mobileBrowser.$('#currency-thb');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
      await mobileBrowser.pause(200);
    })
  );
});

Then('the mobile currency symbol should be {string}', async (expectedSymbol: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify active mobile currency button is "${expectedSymbol}"`, async () => {
      await mobileBrowser.waitUntil(
        async () => {
          const activeBtn = await mobileBrowser.$('.currency-btn-active');
          const text = await activeBtn.getText();
          return text.includes(expectedSymbol);
        },
        {
          timeout: 5000,
          timeoutMsg: `Expected active currency button to include "${expectedSymbol}"`,
        }
      );
    })
  );
});

When('he toggles mobile Privacy Mode', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor toggles mobile privacy mode`, async () => {
      const btn = await mobileBrowser.$('#privacy-toggle-btn');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
    })
  );
});

Then('mobile sensitive values should be masked', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile html data-privacy is "true"`, async () => {
      const html = await mobileBrowser.$('html');
      const attr = await html.getAttribute('data-privacy');
      if (attr !== 'true') {
        throw new Error(`Expected data-privacy="true", but got "${attr}"`);
      }
    })
  );
});

When('he toggles the mobile visual theme', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor toggles mobile theme`, async () => {
      const btn = await mobileBrowser.$('#theme-toggle-btn');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
    })
  );
});

Then('the mobile theme should switch', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile theme attribute is toggled`, async () => {
      const html = await mobileBrowser.$('html');
      const attr = await html.getAttribute('data-theme');
      if (!['dark', 'light'].includes(attr || '')) {
        throw new Error(`Expected dark or light theme, but got "${attr}"`);
      }
    })
  );
});

// ================= Holdings =================
Then('he should see the mobile {string} section', async (sectionName: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile section "${sectionName}" is displayed`, async () => {
      const selectorMap: Record<string, string> = {
        holdings: '#portfolio-hero, .portfolio-hero-card',
        analytics: '.analytics-container',
        dividends: '.div-container',
        transactions: '#tx-history-container',
        tools: '#tools-page',
      };
      const selector = selectorMap[sectionName] || `#${sectionName}`;
      const elem = await mobileBrowser.$(selector);
      await elem.waitForDisplayed({ timeout: 10000 });
    })
  );
});

When('he opens the mobile asset category selector', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor opens mobile tab dropdown`, async () => {
      const btn = await mobileBrowser.$('#tab-dropdown-btn');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
    })
  );
});

Then('the mobile category dropdown should be open', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile category menu is open`, async () => {
      const menu = await mobileBrowser.$('.tab-dropdown-menu');
      await menu.waitForDisplayed({ timeout: 5000 });
    })
  );
});

When('he filters mobile holdings by category {string}', async (categoryLabel: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor selects mobile category "${categoryLabel}"`, async () => {
      const item = await mobileBrowser.$(`.dropdown-item*=${categoryLabel}`);
      await item.waitForClickable({ timeout: 5000 });
      await item.click();
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile category {string} should be selected', async (categoryLabel: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify active category contains "${categoryLabel}"`, async () => {
      const label = await mobileBrowser.$('#tab-dropdown-btn .symbol-selector-text');
      const text = await label.getText();
      if (!text.includes(categoryLabel)) {
        throw new Error(`Expected category label "${categoryLabel}", got "${text}"`);
      }
    })
  );
});

When('he searches mobile holdings for {string}', async (query: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor searches mobile holdings for "${query}"`, async () => {
      const input = await mobileBrowser.$('#search-input');
      await input.setValue(query);
      await mobileBrowser.pause(300);
    })
  );
});

Then('the matching mobile holding should be displayed', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify filtered mobile position card is displayed`, async () => {
      const card = await mobileBrowser.$('.symbol-card');
      await card.waitForDisplayed({ timeout: 5000 });
    })
  );
});

// ================= Analytics & Dividends =================
When('he selects the {string} mobile analytics tab', async (subTab: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor clicks mobile analytics tab "${subTab}"`, async () => {
      const tab = await mobileBrowser.$(`#analytics-tab-${subTab.toLowerCase()}`);
      await tab.waitForClickable({ timeout: 5000 });
      await tab.click();
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile {string} analytics pane should be active', async (subTab: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile analytics tab "${subTab}" is active`, async () => {
      const tab = await mobileBrowser.$(`#analytics-tab-${subTab.toLowerCase()}`);
      const className = (await tab.getAttribute('class')) || '';
      if (!className.includes('active')) {
        throw new Error(`Expected tab to have class "active", but got "${className}"`);
      }
    })
  );
});

When('he filters mobile dividends by category {string}', async (categoryLabel: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor filters mobile dividends by "${categoryLabel}"`, async () => {
      const pill = await mobileBrowser.$(`.global-pill-btn*=${categoryLabel}`);
      await pill.waitForClickable({ timeout: 5000 });
      await pill.click();
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile dividend category {string} should be active', async (categoryLabel: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile dividend category "${categoryLabel}" is active`, async () => {
      const pill = await mobileBrowser.$(`.global-pill-btn*=${categoryLabel}`);
      const className = (await pill.getAttribute('class')) || '';
      if (!className.includes('active')) {
        throw new Error(`Expected category pill to be active, got "${className}"`);
      }
    })
  );
});

// ================= Transactions & Tools =================
When('he opens the mobile transaction symbol filter', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor clicks transaction symbol selector`, async () => {
      const btn = await mobileBrowser.$('#symbol-selector-btn');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
    })
  );
});

Then('the mobile transaction filter menu should be open', async () => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile transaction dropdown is open`, async () => {
      const menu = await mobileBrowser.$('#symbol-dropdown-menu');
      await menu.waitForDisplayed({ timeout: 5000 });
    })
  );
});

When('he selects the {string} tool on mobile', async (toolId: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor selects mobile tool "${toolId}"`, async () => {
      const trigger = await mobileBrowser.$('#tools-mobile-dropdown-trigger');
      if (await trigger.isDisplayed()) {
        await trigger.click();
        const item = await mobileBrowser.$(`#tool-dropdown-${toolId}`);
        await item.waitForClickable({ timeout: 5000 });
        await item.click();
      } else {
        const tab = await mobileBrowser.$(`#tool-tab-${toolId}`);
        await tab.waitForClickable({ timeout: 5000 });
        await tab.click();
      }
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile tool {string} should be active', async (toolId: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile tool "${toolId}" container is displayed`, async () => {
      const selector = toolId === 'rebalance-planner' ? '#rebalance-calculator-view' : `#${toolId}`;
      const toolContainer = await mobileBrowser.$(selector);
      await toolContainer.waitForDisplayed({ timeout: 5000 });
    })
  );
});

When('he selects the {string} mobile TVM mode', async (mode: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor selects TVM mode "${mode}" on mobile`, async () => {
      const btn = await mobileBrowser.$(`#mode-solve-${mode.toLowerCase()}`);
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile TVM mode {string} should be active', async (mode: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile TVM mode "${mode}" is active`, async () => {
      const btn = await mobileBrowser.$(`#mode-solve-${mode.toLowerCase()}`);
      const className = (await btn.getAttribute('class')) || '';
      if (!className.includes('active')) {
        throw new Error(`Expected TVM mode to be active, got "${className}"`);
      }
    })
  );
});

When('he switches mobile rebalance mode to {string}', async (mode: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`#actor toggles mobile rebalance mode to "${mode}"`, async () => {
      const btn = mode.toLowerCase().includes('no-sell')
        ? await mobileBrowser.$('#btn-mode-nosell')
        : await mobileBrowser.$('#btn-mode-standard');
      await btn.waitForClickable({ timeout: 5000 });
      await btn.click();
      await mobileBrowser.pause(300);
    })
  );
});

Then('the mobile {string} rebalance mode should be active', async (mode: string) => {
  await actorCalled('Alex').attemptsTo(
    Interaction.where(`verify mobile rebalance mode "${mode}" is active`, async () => {
      const btn = mode.toLowerCase().includes('no-sell')
        ? await mobileBrowser.$('#btn-mode-nosell')
        : await mobileBrowser.$('#btn-mode-standard');
      const className = (await btn.getAttribute('class')) || '';
      if (!className.includes('active')) {
        throw new Error(`Expected rebalance mode button to be active, got "${className}"`);
      }
    })
  );
});
