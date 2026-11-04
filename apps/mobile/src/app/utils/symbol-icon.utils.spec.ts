import { describe, it, expect, beforeEach } from 'vitest';
import {
  cleanTickerForUrl,
  getSymbolLogoConfig,
  getSymbolMonogram,
  isLogoUrlFailed,
  markLogoUrlFailed,
  isLogoUrlLoaded,
  markLogoUrlLoaded,
  clearLogoCache,
} from './symbol-icon.utils';

describe('symbol-icon.utils', () => {
  beforeEach(() => {
    clearLogoCache();
  });

  describe('cleanTickerForUrl', () => {
    it('strips .CRYPTO suffix', () => {
      expect(cleanTickerForUrl('BTC.CRYPTO')).toBe('BTC');
    });

    it('strips .BK suffix', () => {
      expect(cleanTickerForUrl('PTT.BK')).toBe('PTT');
    });

    it('strips .FUND suffix', () => {
      expect(cleanTickerForUrl('SCBBLN.FUND')).toBe('SCBBLN');
    });

    it('replaces dot in multi-class stock with dash', () => {
      expect(cleanTickerForUrl('BRK.B')).toBe('BRK-B');
    });
  });

  describe('getSymbolLogoConfig', () => {
    it('resolves crypto logo URLs', () => {
      const config = getSymbolLogoConfig('BTC.CRYPTO');
      expect(config.isMutualFund).toBe(false);
      expect(config.primaryUrl).toBe('https://assets.coincap.io/assets/icons/btc@2x.png');
      expect(config.secondaryUrl).toContain('spothq/cryptocurrency-icons');
      expect(config.monogram).toBe('BTC');
    });

    it('resolves Thai stock logo URLs', () => {
      const config = getSymbolLogoConfig('PTT.BK');
      expect(config.isMutualFund).toBe(false);
      expect(config.primaryUrl).toBe('https://www.set.or.th/dat/vender/quote/company_logo/PTT.png');
      expect(config.secondaryUrl).toBe('https://assets.parqet.com/logos/symbol/PTT.BK?format=png');
      expect(config.monogram).toBe('PTT');
    });

    it('resolves US stock logo URLs', () => {
      const config = getSymbolLogoConfig('AAPL');
      expect(config.isMutualFund).toBe(false);
      expect(config.primaryUrl).toBe('https://assets.parqet.com/logos/symbol/AAPL?format=png');
      expect(config.secondaryUrl).toBe('https://financialmodelingprep.com/image-stock/AAPL.png');
      expect(config.monogram).toBe('AA');
    });

    it('returns isMutualFund: true and no CDN URLs for Thai mutual funds', () => {
      const config = getSymbolLogoConfig('SCBBLN.FUND');
      expect(config.isMutualFund).toBe(true);
      expect(config.primaryUrl).toBeNull();
      expect(config.secondaryUrl).toBeNull();
      expect(config.monogram).toBe('SC');
    });

    it('returns isMutualFund: true and no CDN URLs for Provident Funds', () => {
      const config = getSymbolLogoConfig('PVDSP500', 'provident-fund');
      expect(config.isMutualFund).toBe(true);
      expect(config.primaryUrl).toBeNull();
      expect(config.secondaryUrl).toBeNull();
      expect(config.monogram).toBe('PV');
    });

    it('handles empty symbol safely', () => {
      const config = getSymbolLogoConfig('');
      expect(config.primaryUrl).toBeNull();
      expect(config.monogram).toBe('?');
    });
  });

  describe('getSymbolMonogram', () => {
    it('returns short tickers directly', () => {
      expect(getSymbolMonogram('BTC')).toBe('BTC');
      expect(getSymbolMonogram('PTT.BK')).toBe('PTT');
      expect(getSymbolMonogram('V')).toBe('V');
    });

    it('returns first 2 letters for longer tickers', () => {
      expect(getSymbolMonogram('AAPL')).toBe('AA');
      expect(getSymbolMonogram('MSFT')).toBe('MS');
      expect(getSymbolMonogram('ES-GTECHSSF.FUND')).toBe('ES');
    });
  });

  describe('URL Caches', () => {
    it('marks and checks failed URLs', () => {
      const testUrl = 'https://example.com/broken.png';
      expect(isLogoUrlFailed(testUrl)).toBe(false);
      markLogoUrlFailed(testUrl);
      expect(isLogoUrlFailed(testUrl)).toBe(true);
    });

    it('marks and checks loaded URLs', () => {
      const testUrl = 'https://example.com/success.png';
      expect(isLogoUrlLoaded(testUrl)).toBe(false);
      markLogoUrlLoaded(testUrl);
      expect(isLogoUrlLoaded(testUrl)).toBe(true);
    });

    it('clears caches cleanly', () => {
      const testUrl = 'https://example.com/test.png';
      markLogoUrlFailed(testUrl);
      markLogoUrlLoaded(testUrl);
      clearLogoCache();
      expect(isLogoUrlFailed(testUrl)).toBe(false);
      expect(isLogoUrlLoaded(testUrl)).toBe(false);
    });
  });
});
