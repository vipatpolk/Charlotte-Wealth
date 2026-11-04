import { Injectable } from '@nestjs/common';
import { PriceData } from '../models/transaction.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';
import { resolveQuoteCurrency, toYahooSymbol } from '../utils/format.util.js';
import { NavService } from './nav.service.js';

export const COMMON_CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDT: 'Tether USDt',
  BNB: 'BNB',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  AVAX: 'Avalanche',
};

@Injectable()
export class PriceService {
  constructor(public readonly navService: NavService) {}

  async fetchPricesAndRate(
    summaries: { symbol: string; assetType?: string }[],
  ): Promise<{ prices: Record<string, PriceData>; rate: number }> {
    const [prices, rate] = await Promise.all([
      this.fetchPrices(summaries),
      this.fetchExchangeRate(),
    ]);
    return { prices, rate };
  }

  async fetchExchangeRate(
    fromCurrency: string = 'USD',
    toCurrency: string = 'THB',
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    const cacheKey = `rate_${fromCurrency}_${toCurrency}`;
    const cached = ttlCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(`fetch_rate_${fromCurrency}_${toCurrency}`, async () => {
      const c = ttlCache.get<number>(cacheKey);
      if (c !== null) return c;

      const pair = `${fromCurrency}${toCurrency}=X`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1d&includePrePost=false`;

      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return 0.0;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta || {};
        const rate = this.extractYahooPrice(meta);
        if (rate > 0) {
          ttlCache.set(cacheKey, rate, 300.0);
        }
        return rate;
      } catch {
        return 0.0;
      }
    });
  }

  private isCrypto(s: { symbol: string; assetType?: string }): boolean {
    return s.assetType === 'crypto' || s.symbol.toUpperCase().endsWith('.CRYPTO');
  }

  private isFund(s: { symbol: string; assetType?: string }): boolean {
    const sym = s.symbol.toUpperCase();
    return (
      s.assetType === 'mutual-fund' ||
      sym.endsWith('.FUND') ||
      sym.endsWith('.BKFUND')
    );
  }

  private isPvd(s: { symbol: string; assetType?: string }): boolean {
    return (
      s.assetType === 'provident-fund' || s.symbol.toUpperCase().startsWith('PVD')
    );
  }

  private extractYahooPrice(meta: Record<string, any>): number {
    return (
      meta.regularMarketPrice ||
      meta.chartPreviousClose ||
      meta.previousClose ||
      0.0
    );
  }

  async fetchPrices(
    summaries: { symbol: string; assetType?: string }[],
  ): Promise<Record<string, PriceData>> {
    if (!summaries || !summaries.length) return {};

    const stockSymbols = Array.from(
      new Set(
        summaries
          .filter(
            (s) =>
              !this.isFund(s) &&
              !this.isCrypto(s) &&
              !this.isPvd(s) &&
              s.symbol,
          )
          .map((s) => s.symbol),
      ),
    );

    const cryptoSymbols = Array.from(
      new Set(
        summaries
          .filter((s) => this.isCrypto(s) && s.symbol)
          .map((s) => s.symbol),
      ),
    );

    const fundSymbols = Array.from(
      new Set(
        summaries.filter((s) => this.isFund(s) && s.symbol).map((s) => s.symbol),
      ),
    );

    const tasks: Promise<Record<string, PriceData>>[] = [];
    if (stockSymbols.length) {
      tasks.push(this.fetchStockPrices(stockSymbols));
    }
    if (cryptoSymbols.length) {
      tasks.push(this.fetchCryptoPrices(cryptoSymbols));
    }
    if (fundSymbols.length) {
      tasks.push(this.navService.fetchFundNavs(fundSymbols));
    }

    if (!tasks.length) return {};

    const results = await Promise.all(tasks);
    const merged: Record<string, PriceData> = {};
    for (const resMap of results) {
      Object.assign(merged, resMap);
    }
    return merged;
  }

  async fetchSingleStock(symbol: string): Promise<[string, PriceData]> {
    const cacheKey = `stock_price_${symbol}`;
    const cached = ttlCache.get<PriceData>(cacheKey);
    if (cached !== null) return [symbol, cached];

    return singleflight.execute(`stock_price_${symbol}`, async () => {
      const c = ttlCache.get<PriceData>(cacheKey);
      if (c !== null) return [symbol, c];

      const yahooSymbol = toYahooSymbol(symbol);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d&includePrePost=false`;

      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) {
          return [symbol, { symbol, name: '', price: 0.0, currency: '' }];
        }
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta || {};
        const price = this.extractYahooPrice(meta);
        const data: PriceData = {
          symbol,
          name: meta.longName || meta.shortName || '',
          price,
          currency: meta.currency || '',
        };
        if (price > 0 || data.name) {
          ttlCache.set(cacheKey, data, 60.0);
        }
        return [symbol, data];
      } catch {
        return [symbol, { symbol, name: '', price: 0.0, currency: '' }];
      }
    });
  }

  async fetchStockPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    const results = await Promise.all(symbols.map((sym) => this.fetchSingleStock(sym)));
    const priceMap: Record<string, PriceData> = {};
    for (const [sym, data] of results) {
      if (data.price > 0 || data.name) {
        priceMap[sym] = data;
      }
    }
    return priceMap;
  }

  async fetchBinanceTickers(): Promise<any[]> {
    const cacheKey = 'binance_tickers';
    const cached = ttlCache.get<any[]>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute('fetch_binance_tickers', async () => {
      const c = ttlCache.get<any[]>(cacheKey);
      if (c !== null) return c;

      try {
        const res = await fetch('https://api.binance.th/api/v1/ticker/price');
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) {
          ttlCache.set(cacheKey, data, 30.0);
          return data;
        }
        return [];
      } catch {
        return [];
      }
    });
  }

  async fetchYahooCryptoName(symbol: string): Promise<[string, string]> {
    const base = symbol.replace(/\.CRYPTO$/i, '').trim().toUpperCase();
    if (COMMON_CRYPTO_NAMES[base]) {
      return [symbol, COMMON_CRYPTO_NAMES[base]];
    }

    const cacheKey = `crypto_name_${symbol}`;
    const cached = ttlCache.get<string>(cacheKey);
    if (cached !== null) return [symbol, cached];

    const yahooSymbol = `${base}-USD`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d&includePrePost=false`;

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return [symbol, ''];
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta || {};
      const name = meta.longName || meta.shortName || '';
      if (name) {
        ttlCache.set(cacheKey, name, 86400.0);
      }
      return [symbol, name];
    } catch {
      return [symbol, ''];
    }
  }

  resolveCryptoPrice(
    rawSymbol: string,
    tickers: { symbol?: string; price?: string | number }[],
  ): [number, string] {
    const base = rawSymbol.replace(/\.CRYPTO$/i, '').trim().toUpperCase();
    if (!base || !tickers.length) return [0.0, ''];

    const matches: { quote: string; resolvedQuote: string; price: number }[] = [];
    for (const t of tickers) {
      const sym = (t.symbol || '').toUpperCase();
      const price = parseFloat(String(t.price || 0));
      if (price <= 0) continue;

      if (sym === base) {
        const quote = sym.endsWith('THB') ? 'THB' : sym.includes('USD') ? 'USD' : '';
        matches.push({
          quote,
          resolvedQuote: quote ? resolveQuoteCurrency(quote) : '',
          price,
        });
      } else if (sym.startsWith(base)) {
        const quote = sym.slice(base.length);
        matches.push({
          quote,
          resolvedQuote: resolveQuoteCurrency(quote),
          price,
        });
      }
    }

    if (!matches.length) return [0.0, ''];

    const bestMatch =
      matches.find((m) => m.resolvedQuote === 'THB') ||
      matches.find((m) => m.resolvedQuote === 'USD') ||
      matches[0];

    return [bestMatch.price, bestMatch.resolvedQuote || 'USD'];
  }

  async fetchCryptoPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    const [tickers, names] = await Promise.all([
      this.fetchBinanceTickers(),
      Promise.all(symbols.map((sym) => this.fetchYahooCryptoName(sym))),
    ]);

    const nameMap = Object.fromEntries(names);
    const priceMap: Record<string, PriceData> = {};

    for (const symbol of symbols) {
      const [price, currency] = this.resolveCryptoPrice(symbol, tickers);
      const dynamicName = nameMap[symbol] || '';
      priceMap[symbol] = {
        symbol,
        name: dynamicName,
        price,
        currency,
      };
    }
    return priceMap;
  }

  async fetchSingleStockDividends(
    symbol: string,
  ): Promise<[string, { trailing_12m_dps: number; dividends: any[] }]> {
    const cacheKey = `stock_div_${symbol}`;
    const cached = ttlCache.get<{ trailing_12m_dps: number; dividends: any[] }>(cacheKey);
    if (cached !== null) return [symbol, cached];

    return singleflight.execute(`stock_div_${symbol}`, async () => {
      const c = ttlCache.get<{ trailing_12m_dps: number; dividends: any[] }>(cacheKey);
      if (c !== null) return [symbol, c];

      const yahooSymbol = toYahooSymbol(symbol);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5y&interval=1mo&events=div`;

      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) {
          return [symbol, { trailing_12m_dps: 0.0, dividends: [] }];
        }
        const json = await res.json();
        const result = json?.chart?.result?.[0] || {};
        const events = result.events || {};
        const divMap = events.dividends || {};
        const divList: { amount: number; date: number }[] = [];

        const nowTs = Date.now() / 1000;
        const oneYearAgoTs = nowTs - 365 * 24 * 3600;
        let trailing12m = 0.0;

        if (typeof divMap === 'object' && divMap !== null) {
          for (const [tsStr, d] of Object.entries(divMap) as [string, any][]) {
            const amt = parseFloat(d.amount || 0.0);
            const dt = d.date !== undefined ? d.date : parseInt(tsStr, 10) || 0;
            divList.push({ amount: amt, date: dt });
            if (dt >= oneYearAgoTs) {
              trailing12m += amt;
            }
          }
        }

        divList.sort((a, b) => b.date - a.date);
        const resData = { trailing_12m_dps: trailing12m, dividends: divList };
        ttlCache.set(cacheKey, resData, 3600.0);
        return [symbol, resData];
      } catch {
        return [symbol, { trailing_12m_dps: 0.0, dividends: [] }];
      }
    });
  }

  async fetchStockDividends(
    symbols: string[],
  ): Promise<Record<string, { trailing_12m_dps: number; dividends: any[] }>> {
    const unique = Array.from(
      new Set(
        symbols.filter(
          (s) =>
            !this.isCrypto({ symbol: s }) && !this.isFund({ symbol: s }) && s,
        ),
      ),
    );

    if (!unique.length) return {};
    const results = await Promise.all(
      unique.map((sym) => this.fetchSingleStockDividends(sym)),
    );
    return Object.fromEntries(results);
  }
}

