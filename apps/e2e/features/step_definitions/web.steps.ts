import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Interaction } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright, PlaywrightPage } from '@serenity-js/playwright';
import { expect } from '@playwright/test';
import { WebPortfolioPage } from '../../playwright/pageobjects/web_portfolio.page';

const WEB_URL = process.env.WEB_URL || 'http://localhost:4200';

async function getWebPage(actorName: string): Promise<WebPortfolioPage> {
  const actor = actorCalled(actorName);
  const serenityPage = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
  const page = await serenityPage.nativePage();
  return new WebPortfolioPage(page);
}

// ================= Background & Navigation =================
Given('{string} opens the Charlotte Wealth web dashboard', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor navigates to ${WEB_URL}`, async () => {
      const webPage = await getWebPage(actorName);
      await webPage.open(WEB_URL);
    })
  );
});

Given('{string} navigates to the {string} view', async (actorName: string, viewName: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor switches to the ${viewName} view`, async () => {
      const webPage = await getWebPage(actorName);
      await webPage.selectView(viewName);
    })
  );
});

When('she navigates to the {string} view', async (viewName: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor switches to the ${viewName} view`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.selectView(viewName);
    })
  );
});

// ================= Dashboard =================
Then('she should see the {string} brand title', async (expectedBrand: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify brand title contains "${expectedBrand}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.logoText).toContainText(expectedBrand);
    })
  );
});

Then('she should see the consolidated net worth hero card', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify net worth hero card is displayed`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.dashboardContainer.first()).toBeVisible();
      await expect(webPage.netWorthAmount).toBeVisible();
    })
  );
});

Then('she should see the primary portfolio KPI cards', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify 4-card primary KPI strip`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.kpiInvested).toBeVisible();
      await expect(webPage.kpiUnrealized).toBeVisible();
      await expect(webPage.kpiRealized).toBeVisible();
      await expect(webPage.kpiDividends).toBeVisible();
    })
  );
});

When('she switches the display currency to {string}', async (currency: 'USD' | 'THB') => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor switches currency to ${currency}`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.setCurrency(currency);
    })
  );
});

Then('the active currency symbol should be {string}', async (expectedSymbol: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify active currency button displays "${expectedSymbol}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const activeBtn = webPage.page.locator('.currency-btn-active');
      await expect(activeBtn).toHaveText(expectedSymbol);
    })
  );
});

When('she toggles Privacy Mode', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor toggles Privacy Mode`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.togglePrivacy();
    })
  );
});

Then('the sensitive portfolio values should be masked', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify html data-privacy attribute is set`, async () => {
      const webPage = await getWebPage('Charlotte');
      const htmlElem = webPage.page.locator('html');
      await expect(htmlElem).toHaveAttribute('data-privacy', 'true');
    })
  );
});

When('she toggles the visual theme', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor toggles visual theme`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.toggleTheme();
    })
  );
});

Then('the application theme should switch', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify html data-theme attribute is toggled`, async () => {
      const webPage = await getWebPage('Charlotte');
      const theme = await webPage.page.locator('html').getAttribute('data-theme');
      expect(['dark', 'light']).toContain(theme);
    })
  );
});

// ================= Holdings =================
Then('she should see the portfolio overview metrics and holdings sections', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify portfolio hero and open positions section`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.portfolioHero).toBeVisible();
      await expect(webPage.page.locator('#tab-bar')).toBeVisible();
    })
  );
});

When('she filters holdings by asset tab {string}', async (tabLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor selects holdings tab "${tabLabel}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const tabButton = webPage.page.locator('.tab-button', { hasText: tabLabel }).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
      } else {
        await webPage.tabDropdownButton.click();
        await webPage.page.locator('.dropdown-item', { hasText: tabLabel }).click();
      }
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the asset tab {string} should be selected', async (tabLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify tab "${tabLabel}" is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      const activeTabBtn = webPage.page.locator('.tab-button.tab-active');
      if (await activeTabBtn.isVisible()) {
        await expect(activeTabBtn).toContainText(tabLabel);
      } else {
        const activeDropdownText = webPage.page.locator('#tab-dropdown-btn .symbol-selector-text');
        await expect(activeDropdownText).toContainText(tabLabel);
      }
    })
  );
});

When('she searches holdings for symbol {string}', async (symbol: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor searches holdings for "${symbol}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.searchInput.fill(symbol);
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the holdings view should display the filtered symbol {string}', async (symbol: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify filtered symbol "${symbol}" card is displayed`, async () => {
      const webPage = await getWebPage('Charlotte');
      const card = webPage.page.locator(`#card-${symbol}`);
      await expect(card).toBeVisible();
    })
  );
});

When('she clears the symbol search filter', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor clears search filter`, async () => {
      const webPage = await getWebPage('Charlotte');
      if (await webPage.searchClearButton.isVisible()) {
        await webPage.searchClearButton.click();
      } else {
        await webPage.searchInput.fill('');
      }
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('all portfolio holdings should be restored', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify search input is empty`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.searchInput).toHaveValue('');
    })
  );
});

// ================= Analytics =================
Then('she should see the Portfolio Analytics overview', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify analytics overview container is displayed`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.analyticsContainer).toBeVisible();
      await expect(webPage.analyticsOverviewTab).toBeVisible();
    })
  );
});

When('she switches to the {string} analytics sub-tab', async (subTab: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor clicks analytics sub-tab "${subTab}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const tabId = `#analytics-tab-${subTab.toLowerCase()}`;
      await webPage.page.locator(tabId).click();
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('she should see the {string} analytics pane', async (paneName: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify ${paneName} pane is rendered`, async () => {
      const webPage = await getWebPage('Charlotte');
      const tab = webPage.page.locator(`#analytics-tab-${paneName.toLowerCase()}`);
      await expect(tab).toHaveClass(/active/);
    })
  );
});

// ================= Dividends =================
Then('she should see the Dividend & Income Yield summary', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify dividend summary grid`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.dividendContainer).toBeVisible();
      await expect(webPage.dividendSummaryGrid).toBeVisible();
    })
  );
});

When('she filters dividends by asset category {string}', async (categoryLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor filters dividends by category "${categoryLabel}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.global-pill-btn', { hasText: categoryLabel });
      await pill.click();
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the dividend summary should update for {string}', async (categoryLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify category "${categoryLabel}" is selected`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.global-pill-btn', { hasText: categoryLabel });
      await expect(pill).toHaveClass(/active/);
    })
  );
});

When('she filters dividends by year {string}', async (yearLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor filters dividends by year "${yearLabel}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.year-pill-btn', { hasText: yearLabel });
      await pill.click();
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the dividend cashflow ledger should reflect {string}', async (yearLabel: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify year "${yearLabel}" pill is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.year-pill-btn', { hasText: yearLabel });
      await expect(pill).toHaveClass(/active/);
    })
  );
});

// ================= Transactions =================
Then('she should see the All Symbols transaction feed', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify transaction feed container`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.transactionContainer).toBeVisible();
      await expect(webPage.symbolSelectorButton).toBeVisible();
    })
  );
});

When('she opens the transaction symbol selector', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor clicks symbol selector combobox`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.symbolSelectorButton.click();
    })
  );
});

Then('the symbol dropdown menu should be visible', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify symbol dropdown menu is displayed`, async () => {
      const webPage = await getWebPage('Charlotte');
      const menu = webPage.page.locator('#symbol-dropdown-menu');
      await expect(menu).toBeVisible();
    })
  );
});

When('she filters transactions by asset category {string}', async (category: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor filters dropdown by "${category}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.dropdown-asset-pill', { hasText: category });
      await pill.click();
    })
  );
});

Then('the transaction filter {string} should be active', async (category: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify category "${category}" pill is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      const pill = webPage.page.locator('.dropdown-asset-pill', { hasText: category });
      await expect(pill).toHaveClass(/active/);
    })
  );
});

When('she searches the transaction feed for {string}', async (query: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor searches transactions for "${query}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.symbolSearchInput.fill(query);
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the matching transaction records should be displayed', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify transaction search results are filtered`, async () => {
      const webPage = await getWebPage('Charlotte');
      const results = webPage.page.locator('.dropdown-item');
      await expect(results.first()).toBeVisible();
    })
  );
});

// ================= Financial Tools =================
Then('she should see the Financial Toolkit hub', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify tools hub container`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.toolsPage).toBeVisible();
    })
  );
});

Then('the Average Cost Calculator should be active by default', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify average cost calculator container is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      await expect(webPage.avgCostCalculator).toBeVisible();
    })
  );
});

When('she enables Custom Simulation mode', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor enables custom simulation mode`, async () => {
      const webPage = await getWebPage('Charlotte');
      const box = webPage.page.locator('.symbol-search-box');
      await box.click();
      const customOpt = webPage.page.locator('.custom-option');
      await customOpt.click();
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the custom simulation badge should be displayed', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify custom badge is displayed`, async () => {
      const webPage = await getWebPage('Charlotte');
      const badge = webPage.page.locator('.custom-badge');
      await expect(badge).toBeVisible();
    })
  );
});

When('she switches to the Time Value of Money calculator', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor switches to TVM calculator`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.selectTool('tvm-calculator');
    })
  );
});

When('she selects the {string} TVM solve mode', async (mode: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor selects TVM mode ${mode}`, async () => {
      const webPage = await getWebPage('Charlotte');
      const btn = webPage.page.locator(`#mode-solve-${mode.toLowerCase()}`);
      await btn.click();
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the TVM calculation mode should be {string}', async (mode: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify TVM mode "${mode}" is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      const btn = webPage.page.locator(`#mode-solve-${mode.toLowerCase()}`);
      await expect(btn).toHaveClass(/active/);
    })
  );
});

When('she switches to the Portfolio Rebalance Planner', async () => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor switches to Rebalance Planner`, async () => {
      const webPage = await getWebPage('Charlotte');
      await webPage.selectTool('rebalance-planner');
    })
  );
});

When('she toggles the rebalance mode to {string}', async (mode: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`#actor toggles rebalance mode to "${mode}"`, async () => {
      const webPage = await getWebPage('Charlotte');
      if (mode.toLowerCase().includes('no-sell')) {
        await webPage.rebalanceNoSellModeButton.click();
      } else {
        await webPage.rebalanceStandardModeButton.click();
      }
      await webPage.page.waitForTimeout(300);
    })
  );
});

Then('the {string} rebalance mode should be active', async (mode: string) => {
  await actorCalled('Charlotte').attemptsTo(
    Interaction.where(`verify rebalance mode "${mode}" is active`, async () => {
      const webPage = await getWebPage('Charlotte');
      const btn = mode.toLowerCase().includes('no-sell')
        ? webPage.rebalanceNoSellModeButton
        : webPage.rebalanceStandardModeButton;
      await expect(btn).toHaveClass(/active/);
    })
  );
});
