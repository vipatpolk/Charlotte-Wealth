import { $ } from '@wdio/globals';
import Page from './page.js';

/**
 * Mobile Portfolio Page Object for Charlotte Wealth (apps/e2e)
 */
export class MobilePortfolioPage extends Page {
  // ================= App Header & Controls =================
  public get appTitle() {
    return $('h1.logo-text, ion-header ion-title');
  }

  public get currencyUsdButton() {
    return $('#currency-usd');
  }

  public get currencyThbButton() {
    return $('#currency-thb');
  }

  public get privacyToggleButton() {
    return $('#privacy-toggle-btn');
  }

  public get themeToggleButton() {
    return $('#theme-toggle-btn');
  }

  // ================= Consolidated Net Worth Hero =================
  public get netWorthCard() {
    return $('#dashboard-hero, .dashboard-hero-card, ion-card');
  }

  public get netWorthSubtitle() {
    return $('.hero-section-caption, ion-card-subtitle');
  }

  public get netWorthAmount() {
    return $('#dashboard-net-worth, .hero-net-worth, ion-card-title');
  }

  public get netWorthCardContent() {
    return $('.hero-kpi-grid, ion-card-content');
  }

  public get totalReturnBadge() {
    return $('#dashboard-total-return-badge');
  }

  // ================= Asset Allocation Section =================
  public get assetAllocationHeader() {
    return $('.section-title, .allocation-section, ion-list-header ion-label');
  }

  public get assetAllocationList() {
    return $('.allocation-breakdown, .alloc-list, ion-list');
  }

  // ================= Navigation Tabs (Mobile Bottom Dock) =================
  public get portfolioTabButton() {
    return $('#view-toggle-dashboard, ion-tab-button[tab="tab1"]');
  }

  public get holdingsTabButton() {
    return $('#view-toggle-holdings');
  }

  public get allocationsTabButton() {
    return $('#view-toggle-analytics, #view-toggle-allocation, ion-tab-button[tab="tab2"]');
  }

  public get dividendsTabButton() {
    return $('#view-toggle-dividends');
  }

  public get transactionsTabButton() {
    return $('#view-toggle-transactions');
  }

  public get advisoryTabButton() {
    return $('#view-toggle-tools, ion-tab-button[tab="tab3"]');
  }

  // ================= View Containers =================
  public get tab2Container() {
    return $('app-analytics, app-explore-container');
  }

  public get holdingsContainer() {
    return $('#portfolio-hero, .portfolio-hero-card');
  }

  public get tabDropdownButton() {
    return $('#tab-dropdown-btn');
  }

  public get searchInput() {
    return $('#search-input');
  }

  public get openPositionsSection() {
    return $('.open-pill');
  }

  public get analyticsContainer() {
    return $('.analytics-container');
  }

  public get analyticsOverviewTab() {
    return $('#analytics-tab-overview');
  }

  public get analyticsAllocationTab() {
    return $('#analytics-tab-allocation');
  }

  public get analyticsPerformanceTab() {
    return $('#analytics-tab-performance');
  }

  public get dividendContainer() {
    return $('.div-container');
  }

  public get dividendSummaryGrid() {
    return $('.div-summary-grid');
  }

  public get txContainer() {
    return $('#tx-history-container');
  }

  public get symbolSelectorButton() {
    return $('#symbol-selector-btn');
  }

  public get toolsPage() {
    return $('#tools-page');
  }

  public get toolsMobileDropdownTrigger() {
    return $('#tools-mobile-dropdown-trigger');
  }

  public get avgCostCalculator() {
    return $('#avg-cost-calculator');
  }

  public get tvmCalculator() {
    return $('#tvm-calculator');
  }

  public get rebalanceCalculator() {
    return $('#rebalance-calculator-view');
  }

  // ================= Action Helpers =================
  public override async open(path: string = '/'): Promise<void> {
    await super.open(path);
  }

  public async navigateToView(view: string): Promise<void> {
    const btn = $(`#view-toggle-${view}`);
    await btn.waitForClickable({ timeout: 10000 });
    await btn.click();
  }

  public async setCurrency(currency: 'USD' | 'THB'): Promise<void> {
    const btn = currency === 'USD' ? await this.currencyUsdButton : await this.currencyThbButton;
    await btn.waitForClickable({ timeout: 5000 });
    await btn.click();
  }

  public async togglePrivacy(): Promise<void> {
    const btn = await this.privacyToggleButton;
    await btn.waitForClickable({ timeout: 5000 });
    await btn.click();
  }

  public async toggleTheme(): Promise<void> {
    const btn = await this.themeToggleButton;
    await btn.waitForClickable({ timeout: 5000 });
    await btn.click();
  }

  public async selectMobileTool(toolId: string): Promise<void> {
    const trigger = await this.toolsMobileDropdownTrigger;
    if (await trigger.isDisplayed()) {
      await trigger.click();
      const item = $(`#tool-dropdown-${toolId}`);
      await item.waitForClickable({ timeout: 5000 });
      await item.click();
    } else {
      const tab = $(`#tool-tab-${toolId}`);
      await tab.waitForClickable({ timeout: 5000 });
      await tab.click();
    }
  }

  public async navigateToAllocations(): Promise<void> {
    const button = await this.allocationsTabButton;
    await button.waitForClickable({ timeout: 10000 });
    await button.click();
  }

  public async navigateToAdvisory(): Promise<void> {
    const button = await this.advisoryTabButton;
    await button.waitForClickable({ timeout: 10000 });
    await button.click();
  }

  public async navigateToPortfolio(): Promise<void> {
    const button = await this.portfolioTabButton;
    await button.waitForClickable({ timeout: 10000 });
    await button.click();
  }
}

export default new MobilePortfolioPage();
