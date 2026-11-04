import { displaySymbol, getAssetType, getSymbolColor } from './format.utils';

// Global session caches to prevent layout thrashing and redundant network requests
const failedUrlCache = new Set<string>();
const loadedUrlCache = new Set<string>();

export interface SymbolLogoConfig {
  primaryUrl: string | null;
  secondaryUrl: string | null;
  isMutualFund: boolean;
  monogram: string;
  brandColor: string;
}

/**
 * Normalizes symbol to a clean ticker string suitable for CDN lookup.
 */
export function cleanTickerForUrl(symbol: string): string {
  const clean = displaySymbol(symbol || '').trim();
  // Replace dot or slash for multi-share class stocks (e.g., BRK.B -> BRK-B)
  return clean.replace(/[./]/g, '-');
}

/**
 * Resolves logo URLs and fallback configuration for a given symbol and asset type.
 */
export function getSymbolLogoConfig(symbol: string, assetType?: string): SymbolLogoConfig {
  if (!symbol) {
    return {
      primaryUrl: null,
      secondaryUrl: null,
      isMutualFund: false,
      monogram: '?',
      brandColor: '#6366f1',
    };
  }

  const type = getAssetType(assetType, symbol);
  const cleanTicker = cleanTickerForUrl(symbol);
  const brandColor = getSymbolColor(symbol);
  const monogram = getSymbolMonogram(symbol);

  // Thai mutual funds and Provident funds: skip external logo lookup and use dedicated placeholder
  if (type === 'mutual-fund' || type === 'provident-fund') {
    return {
      primaryUrl: null,
      secondaryUrl: null,
      isMutualFund: true,
      monogram,
      brandColor,
    };
  }

  // Cryptocurrency
  if (type === 'crypto') {
    const symLower = cleanTicker.toLowerCase();
    return {
      primaryUrl: `https://assets.coincap.io/assets/icons/${symLower}@2x.png`,
      secondaryUrl: `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${symLower}.svg`,
      isMutualFund: false,
      monogram,
      brandColor,
    };
  }

  // Thai Equities (SET / MAI)
  if (type === 'thai-stock') {
    return {
      primaryUrl: `https://www.set.or.th/dat/vender/quote/company_logo/${cleanTicker.toUpperCase()}.png`,
      secondaryUrl: `https://assets.parqet.com/logos/symbol/${cleanTicker.toUpperCase()}.BK?format=png`,
      isMutualFund: false,
      monogram,
      brandColor,
    };
  }

  // U.S. Equities & Global ETFs (default)
  return {
    primaryUrl: `https://assets.parqet.com/logos/symbol/${cleanTicker.toUpperCase()}?format=png`,
    secondaryUrl: `https://financialmodelingprep.com/image-stock/${cleanTicker.toUpperCase()}.png`,
    isMutualFund: false,
    monogram,
    brandColor,
  };
}

/**
 * Computes a 1-3 letter monogram representation for fallback avatar.
 */
export function getSymbolMonogram(symbol: string): string {
  const clean = displaySymbol(symbol || '').trim().toUpperCase();
  if (!clean) return '?';

  // If clean ticker is short (1-3 chars), use it directly (e.g. BTC, PTT, SPY, V, T)
  if (clean.length <= 3) {
    return clean;
  }

  // For longer symbols (e.g. AAPL, NVDA, GOOGL, ES-GTECHSSF), take the first 2 letters
  const lettersOnly = clean.replace(/[^A-Z0-9]/g, '');
  return lettersOnly.slice(0, 2) || clean.slice(0, 2);
}

export function isLogoUrlFailed(url: string): boolean {
  return failedUrlCache.has(url);
}

export function markLogoUrlFailed(url: string): void {
  if (url) failedUrlCache.add(url);
}

export function isLogoUrlLoaded(url: string): boolean {
  return loadedUrlCache.has(url);
}

export function markLogoUrlLoaded(url: string): void {
  if (url) loadedUrlCache.add(url);
}

export function clearLogoCache(): void {
  failedUrlCache.clear();
  loadedUrlCache.clear();
}
