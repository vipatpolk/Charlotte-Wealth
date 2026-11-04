import { expect } from 'expect-webdriverio';
import MobilePortfolioPage from '../pageobjects/mobile_portfolio.page.js';

describe('Charlotte Wealth - Centralized Mobile Appium Holdings & Transactions Tests', () => {
  before(async () => {
    await MobilePortfolioPage.open();
    await MobilePortfolioPage.switchToWebView();
  });

  it('should navigate to holdings view and display asset category selector', async () => {
    await MobilePortfolioPage.navigateToView('holdings');
    const container = await MobilePortfolioPage.holdingsContainer;
    await expect(container).toBeDisplayed();

    const dropdown = await MobilePortfolioPage.tabDropdownButton;
    await expect(dropdown).toBeDisplayed();
  });

  it('should display search input on mobile holdings view', async () => {
    const search = await MobilePortfolioPage.searchInput;
    await expect(search).toBeDisplayed();
  });

  it('should navigate to transactions view and display symbol selector', async () => {
    await MobilePortfolioPage.navigateToView('transactions');
    const container = await MobilePortfolioPage.txContainer;
    await expect(container).toBeDisplayed();

    const selector = await MobilePortfolioPage.symbolSelectorButton;
    await expect(selector).toBeDisplayed();
  });
});

