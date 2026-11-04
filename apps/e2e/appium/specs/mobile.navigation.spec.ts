import { expect } from 'expect-webdriverio';
import MobilePortfolioPage from '../pageobjects/mobile_portfolio.page.js';

describe('Charlotte Wealth - Centralized Mobile Appium Navigation Tests', () => {
  before(async () => {
    await MobilePortfolioPage.open();
    await MobilePortfolioPage.switchToWebView();
  });

  it('should switch between tabs using the native mobile tab bar', async () => {
    // Navigate to Allocations (Tab 2)
    await MobilePortfolioPage.navigateToAllocations();
    const tab2 = await MobilePortfolioPage.tab2Container;
    await expect(tab2).toBeDisplayed();

    // Navigate to Advisory (Tab 3)
    await MobilePortfolioPage.navigateToAdvisory();

    // Navigate back to Portfolio (Tab 1)
    await MobilePortfolioPage.navigateToPortfolio();
    const netWorth = await MobilePortfolioPage.netWorthAmount;
    await expect(netWorth).toBeDisplayed();
    await expect(netWorth).toHaveText('$2,845,430.00');
  });
});

