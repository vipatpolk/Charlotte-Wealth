import { KNOWN_ASSET_TYPES } from '../config/asset.constants';

export function getQuantityFormat(symbol: string, assetType?: string): string {
  return symbol.toUpperCase().endsWith('.CRYPTO') || assetType === 'crypto' ? '1.0-10' : '1.0-7';
}

export function displaySymbol(symbol: string): string {
  return symbol.replace(/\.(FUND|BKFUND|BK|CRYPTO)$/i, '');
}

export function toYahooSymbol(symbol: string): string {
  if (!symbol) return '';
  const trimmed = symbol.trim();
  if (trimmed.toUpperCase().endsWith('.FUND')) {
    return trimmed.replace(/\.FUND$/i, '');
  }
  if (trimmed.toUpperCase().endsWith('.BKFUND')) {
    return trimmed.replace(/\.BKFUND$/i, '');
  }
  if (trimmed.toUpperCase().endsWith('.BK')) {
    return trimmed;
  }
  if (trimmed.toUpperCase().endsWith('.CRYPTO')) {
    return trimmed.replace(/\.CRYPTO$/i, '');
  }
  return trimmed.replace(/[./]/g, '-');
}

export function getPriceFormat(symbol: string, assetType?: string): string {
  return symbol.toUpperCase().endsWith('.CRYPTO') || assetType === 'crypto' ? '1.2-2' : '1.2-4';
}

/**
 * Helper to convert HSL components to standard 6-digit hex string (#rrggbb).
 */
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Dynamically computes a consistent, vibrant brand color for any symbol.
 * Uses a deterministic string hash mapped to the HSL color space without any hardcoded dictionary.
 */
export function getSymbolColor(symbol: string): string {
  const clean = displaySymbol(symbol || '').toUpperCase().trim();
  if (!clean) return '#6366f1';

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const hue = Math.abs(hash) % 360;
  const sat = 0.65 + (Math.abs(hash >> 3) % 20) / 100;
  const light = 0.45 + (Math.abs(hash >> 7) % 10) / 100;

  return hslToHex(hue, sat, light);
}

function toProperCase(text: string): string {
  return text
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => {
      const firstLetterIdx = word.search(/[a-zA-Z]/);
      if (firstLetterIdx === -1) return word;
      return (
        word.slice(0, firstLetterIdx) +
        word.charAt(firstLetterIdx).toUpperCase() +
        word.slice(firstLetterIdx + 1).toLowerCase()
      );
    })
    .join(' ');
}

export function getSymbolName(symbol: string, rawName: string = ''): string {
  if (!rawName) return '';

  let name = rawName.trim();
  if (!name) return '';

  const symUpper = symbol.toUpperCase().trim();

  // Strip Thai stock prefix (e.g. "PTT_PETROLEUM..." -> "PETROLEUM...")
  if (symUpper.endsWith('.BK')) {
    const prefix = symbol.replace(/\.BK$/i, '').toUpperCase() + '_';
    if (name.toUpperCase().startsWith(prefix)) {
      name = name.substring(prefix.length);
    }
  }

  // Strip trailing quote currency / pair suffixes (e.g. "Bitcoin USD" -> "Bitcoin", "PAX Gold USD" -> "PAX Gold")
  if (symUpper.endsWith('.CRYPTO') || /\s+(USD|USDT|THB|USDC)$/i.test(name)) {
    name = name.replace(/\s+(USD|USDT|THB|USDC)$/i, '').trim();
  }

  // Strip copyright / trademark symbols
  name = name.replace(/\([R|TM|r|tm]\)/g, '').trim();

  // Convert ALL-CAPS names to Proper Case dynamically
  if (name === name.toUpperCase() && name !== name.toLowerCase()) {
    return toProperCase(name);
  }

  return name;
}

/**
 * Dynamically resolves the formatted symbol name from a price data map,
 * checking standard suffix variants (.CRYPTO, .BKFUND, .BK).
 */
export function resolveSymbolName(
  symbol: string,
  pricesMap?: Map<string, { name?: string }>
): string {
  if (!symbol || !pricesMap) return '';
  const rawName =
    pricesMap.get(symbol)?.name ||
    pricesMap.get(symbol + '.CRYPTO')?.name ||
    pricesMap.get(symbol.replace(/\.CRYPTO$/i, ''))?.name ||
    pricesMap.get(symbol + '.FUND')?.name ||
    pricesMap.get(symbol.replace(/\.FUND$/i, ''))?.name ||
    pricesMap.get(symbol + '.BKFUND')?.name ||
    pricesMap.get(symbol.replace(/\.BKFUND$/i, ''))?.name ||
    pricesMap.get(symbol + '.BK')?.name ||
    pricesMap.get(symbol.replace(/\.BK$/i, ''))?.name ||
    '';
  return getSymbolName(symbol, rawName);
}

/**
 * Converts a monetary amount between currencies (USD <-> THB) using a provided exchange rate.
 * Normalizes USDT to USD.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  const normFrom = fromCurrency === 'USDT' ? 'USD' : fromCurrency;
  const normTo = toCurrency === 'USDT' ? 'USD' : toCurrency;

  if (normFrom === normTo) return amount;
  if (exchangeRate <= 0) return amount;

  if (normFrom === 'USD' && normTo === 'THB') return amount * exchangeRate;
  if (normFrom === 'THB' && normTo === 'USD') return amount / exchangeRate;

  return amount;
}

export function normalizeAssetType(rawType?: string): string | null {
  if (!rawType) return null;
  const normalized = rawType.trim().toLowerCase();
  if (normalized === 'provident-fund' || normalized.includes('provident') || normalized === 'pvd') {
    return 'provident-fund';
  }
  if (normalized === 'thai-stock' || normalized.includes('thai') || normalized === 'th') {
    return 'thai-stock';
  }
  if (
    normalized === 'us-stock' ||
    normalized.includes('u.s') ||
    normalized.includes('us stock') ||
    normalized.includes('united states')
  ) {
    return 'us-stock';
  }
  if (normalized === 'crypto' || normalized.includes('crypto')) {
    return 'crypto';
  }
  if (normalized === 'mutual-fund' || normalized.includes('fund') || normalized.includes('mutual')) {
    return 'mutual-fund';
  }
  if (normalized === 'bond' || normalized.includes('bond')) {
    return 'bond';
  }
  return null;
}

const NON_ASSET_TYPES = new Set(['closed-position', 'all', 'unknown']);

export function getAssetType(assetType?: string, symbol?: string): string {
  if (assetType && !NON_ASSET_TYPES.has(assetType)) {
    const normalized = normalizeAssetType(assetType);
    if (normalized) return normalized;
    return assetType;
  }
  if (symbol) {
    const sym = symbol.toUpperCase();
    if (sym.startsWith('PVD') || sym.endsWith('.PVD')) return 'provident-fund';
    if (sym.endsWith('.FUND') || sym.endsWith('.BKFUND')) return 'mutual-fund';
    if (sym.endsWith('.BK')) return 'thai-stock';
    if (sym.endsWith('.CRYPTO')) return 'crypto';
  }
  return 'us-stock';
}

const ASSET_TYPE_CONFIG: Record<string, { label: string; cssClass: string; color: string }> = {
  'us-stock': { label: 'U.S. Stock', cssClass: 'asset-type-tag asset-type-us-stock', color: '#3b82f6' },
  'thai-stock': { label: 'Thai Stock', cssClass: 'asset-type-tag asset-type-thai-stock', color: '#10b981' },
  'crypto': { label: 'Cryptocurrency', cssClass: 'asset-type-tag asset-type-crypto', color: '#f59e0b' },
  'mutual-fund': { label: 'Mutual Fund', cssClass: 'asset-type-tag asset-type-mutual-fund', color: '#8b5cf6' },
  'bond': { label: 'Bond', cssClass: 'asset-type-tag asset-type-bond', color: '#06b6d4' },
  'provident-fund': { label: 'Provident Fund', cssClass: 'asset-type-tag asset-type-provident-fund', color: '#6366f1' },
};

export function getAssetTypeLabel(assetType?: string, symbol?: string): string {
  const type = getAssetType(assetType, symbol);
  if (ASSET_TYPE_CONFIG[type]) {
    return ASSET_TYPE_CONFIG[type].label;
  }
  return toProperCase(type.replace(/[-_]/g, ' '));
}

export function getAssetTypeClass(assetType?: string, symbol?: string): string {
  const type = getAssetType(assetType, symbol);
  if (ASSET_TYPE_CONFIG[type]) {
    return ASSET_TYPE_CONFIG[type].cssClass;
  }
  return `asset-type-tag asset-type-${type.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}`;
}

export function getAssetColor(assetType?: string, symbol?: string): string {
  const type = getAssetType(assetType, symbol);
  if (ASSET_TYPE_CONFIG[type]) {
    return ASSET_TYPE_CONFIG[type].color;
  }
  return '#9ca3af';
}

export interface AssetTypeOption {
  id: string;
  label: string;
  count: number;
}

export function generateAssetTypeOptions(list: { assetType?: string; symbol: string }[]): AssetTypeOption[] {
  const countByType: Record<string, number> = {
    all: list.length,
  };
  for (const type of KNOWN_ASSET_TYPES) {
    countByType[type] = 0;
  }

  for (const item of list) {
    const type = getAssetType(item.assetType, item.symbol);
    if (countByType[type] !== undefined) {
      countByType[type]++;
    } else {
      countByType[type] = 1;
    }
  }

  return [
    { id: 'all', label: 'All Types', count: countByType['all'] },
    ...KNOWN_ASSET_TYPES.map((type) => ({
      id: type,
      label: getAssetTypeLabel(type),
      count: countByType[type] || 0,
    })),
  ].filter((opt) => opt.id === 'all' || opt.count > 0);
}

export function getUnitLabel(symbol?: string, assetType?: string): string {
  const type = getAssetType(assetType, symbol);
  if (type === 'crypto') return 'coins';
  if (type === 'mutual-fund' || type === 'provident-fund') return 'units';
  return 'shares';
}

export function getUnitLabelSingular(symbol?: string, assetType?: string): string {
  const type = getAssetType(assetType, symbol);
  if (type === 'crypto') return 'coin';
  if (type === 'mutual-fund' || type === 'provident-fund') return 'unit';
  return 'share';
}

