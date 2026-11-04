import { expect } from 'expect-webdriverio';
import MobilePortfolioPage from '../pageobjects/mobile_portfolio.page.js';

describe('Charlotte Wealth - Centralized Mobile Appium Analytics & Tools Tests', () => {
  before(async () => {
    await MobilePortfolioPage.open();
    await MobilePortfolioPage.switchToWebView();
  });

  it('should navigate to analytics view and display sub-tab switcher', async () => {
    await MobilePortfolioPage.navigateToView('analytics');
    const container = await MobilePortfolioPage.analyticsContainer;
    await expect(container).toBeDisplayed();

    const overviewTab = await MobilePortfolioPage.analyticsOverviewTab;
    await expect(overviewTab).toBeDisplayed();
  });

  it('should navigate to dividends view and display summary grid', async () => {
    await MobilePortfolioPage.navigateToView('dividends');
    const container = await MobilePortfolioPage.dividendContainer;
    await expect(container).toBeDisplayed();

    const grid = await MobilePortfolioPage.dividendSummaryGrid;
    await expect(grid).toBeDisplayed();
  });

  it('should navigate to tools hub and display tools selector', async () => {
    await MobilePortfolioPage.navigateToView('tools');
    const page = await MobilePortfolioPage.toolsPage;
    await expect(page).toBeDisplayed();

    const avgCost = await MobilePortfolioPage.avgCostCalculator;
    await expect(avgCost).toBeDisplayed();
  });
});

