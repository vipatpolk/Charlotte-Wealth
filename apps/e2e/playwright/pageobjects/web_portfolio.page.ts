import { Page, Locator, expect } from '@playwright/test';

/**
 * Playwright Web Page Object for Charlotte Wealth Web Client (apps/web)
 */
export class WebPortfolioPage {
  constructor(public readonly page: Page) {}

  // ================= Header & Branding =================
  get logoText(): Locator {
    return this.page.locator('.logo-text');
  }

  get logoSubtitle(): Locator {
    return this.page.locator('.logo-subtitle');
  }

  get currencyUsdButton(): Locator {
    return this.page.locator('#currency-usd');
  }

  get currencyThbButton(): Locator {
    return this.page.locator('#currency-thb');
  }

  get privacyToggleButton(): Locator {
    return this.page.locator('#privacy-toggle-btn');
  }

  get themeToggleButton(): Locator {
    return this.page.locator('#theme-toggle-btn');
  }

  get exchangeRateBadge(): Locator {
    return this.page.locator('.header-rate-badge, .hero-fx-pill');
  }

  // ================= Navigation Tabs =================
  getViewToggleButton(view: string): Locator {
    return this.page.locator(`#view-toggle-${view}`);
  }

  // ================= Executive Dashboard =================
  get dashboardContainer(): Locator {
    return this.page.locator('#dashboard-view, #dashboard-hero');
  }

  get netWorthAmount(): Locator {
    return this.page.locator('#dashboard-net-worth');
  }

  get totalReturnBadge(): Locator {
    return this.page.locator('#dashboard-total-return-badge');
  }

  get kpiInvested(): Locator {
    return this.page.locator('#kpi-invested');
  }

  get kpiUnrealized(): Locator {
    return this.page.locator('#kpi-unrealized');
  }

  get kpiRealized(): Locator {
    return this.page.locator('#kpi-realized');
  }

  get kpiDividends(): Locator {
    return this.page.locator('#kpi-dividends');
  }

  // ================= Holdings & Asset Tabs =================
  get portfolioHero(): Locator {
    return this.page.locator('#portfolio-hero');
  }

  get tabDropdownButton(): Locator {
    return this.page.locator('#tab-dropdown-btn');
  }

  get searchInput(): Locator {
    return this.page.locator('#search-input');
  }

  get searchClearButton(): Locator {
    return this.page.locator('#search-clear-btn');
  }

  get openPositionsSection(): Locator {
    return this.page.locator('.open-pill');
  }

  get closedPositionsSection(): Locator {
    return this.page.locator('.closed-pill');
  }

  // ================= Analytics =================
  get analyticsOverviewTab(): Locator {
    return this.page.locator('#analytics-tab-overview');
  }

  get analyticsAllocationTab(): Locator {
    return this.page.locator('#analytics-tab-allocation');
  }

  get analyticsPerformanceTab(): Locator {
    return this.page.locator('#analytics-tab-performance');
  }

  get analyticsContainer(): Locator {
    return this.page.locator('.analytics-container');
  }

  // ================= Dividends =================
  get dividendContainer(): Locator {
    return this.page.locator('.div-container');
  }

  get dividendSummaryGrid(): Locator {
    return this.page.locator('.div-summary-grid');
  }

  // ================= Transactions =================
  get transactionContainer(): Locator {
    return this.page.locator('#tx-history-container');
  }

  get symbolSelectorButton(): Locator {
    return this.page.locator('#symbol-selector-btn');
  }

  get allSymbolsFeedButton(): Locator {
    return this.page.locator('#btn-all-symbols-feed');
  }

  get symbolSearchInput(): Locator {
    return this.page.locator('#symbol-search-input');
  }

  // ================= Financial Tools =================
  get toolsPage(): Locator {
    return this.page.locator('#tools-page');
  }

  get avgCostCalculator(): Locator {
    return this.page.locator('#avg-cost-calculator');
  }

  get tvmCalculator(): Locator {
    return this.page.locator('#tvm-calculator');
  }

  get rebalanceCalculator(): Locator {
    return this.page.locator('#rebalance-calculator-view');
  }

  get customSimulationButton(): Locator {
    return this.page.locator('.custom-option, .custom-badge');
  }

  get rebalanceStandardModeButton(): Locator {
    return this.page.locator('#btn-mode-standard');
  }

  get rebalanceNoSellModeButton(): Locator {
    return this.page.locator('#btn-mode-nosell');
  }

  // ================= Actions & Helpers =================
  async open(url: string = 'http://localhost:4200'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    // Wait for screen loader to disappear
    const loader = this.page.locator('#loading-state');
    if (await loader.isVisible()) {
      await loader.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  async selectView(view: string): Promise<void> {
    const btn = this.getViewToggleButton(view);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await this.page.waitForTimeout(300);
  }

  async setCurrency(currency: 'USD' | 'THB'): Promise<void> {
    const btn = currency === 'USD' ? this.currencyUsdButton : this.currencyThbButton;
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  async togglePrivacy(): Promise<void> {
    await this.privacyToggleButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.privacyToggleButton.click();
  }

  async toggleTheme(): Promise<void> {
    await this.themeToggleButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.themeToggleButton.click();
  }

  async selectTool(toolId: string): Promise<void> {
    const desktopTab = this.page.locator(`#tool-tab-${toolId}`);
    if (await desktopTab.isVisible()) {
      await desktopTab.click();
    } else {
      const mobileTrigger = this.page.locator('#tools-mobile-dropdown-trigger');
      await mobileTrigger.click();
      await this.page.locator(`#tool-dropdown-${toolId}`).click();
    }
    await this.page.waitForTimeout(300);
  }
}

