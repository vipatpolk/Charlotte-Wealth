import { expect } from 'expect-webdriverio';
import MobilePortfolioPage from '../pageobjects/mobile_portfolio.page.js';

describe('Charlotte Wealth - Centralized Mobile Appium Portfolio Tests', () => {
  before(async () => {
    await MobilePortfolioPage.open();
    await MobilePortfolioPage.switchToWebView();
  });

  it('should display the Charlotte Wealth mobile header title', async () => {
    const title = await MobilePortfolioPage.appTitle;
    await expect(title).toBeDisplayed();
    await expect(title).toHaveText('Charlotte Wealth');
  });

  it('should display the consolidated net worth card with accurate balance', async () => {
    const subtitle = await MobilePortfolioPage.netWorthSubtitle;
    await expect(subtitle).toBeDisplayed();
    await expect(subtitle).toHaveText('Consolidated Net Worth');

    const amount = await MobilePortfolioPage.netWorthAmount;
    await expect(amount).toBeDisplayed();
    await expect(amount).toHaveText('$2,845,430.00');
  });

  it('should display daily and YTD performance metrics', async () => {
    const content = await MobilePortfolioPage.netWorthCardContent;
    await expect(content).toBeDisplayed();
    await expect(content).toHaveText(expect.stringContaining('+$34,120.50 (+1.21%) Today'));
    await expect(content).toHaveText(expect.stringContaining('+18.4%'));
  });

  it('should render strategic asset allocation breakdown', async () => {
    const header = await MobilePortfolioPage.assetAllocationHeader;
    await expect(header).toBeDisplayed();
    await expect(header).toHaveText('Strategic Asset Allocation');

    const list = await MobilePortfolioPage.assetAllocationList;
    await expect(list).toBeDisplayed();
    await expect(list).toHaveText(expect.stringContaining('US Equities & Tech'));
    await expect(list).toHaveText(expect.stringContaining('Global Fixed Income'));
    await expect(list).toHaveText(expect.stringContaining('Private Equity & Real Estate'));
    await expect(list).toHaveText(expect.stringContaining('Cash & Liquidity Reserve'));
  });
});

