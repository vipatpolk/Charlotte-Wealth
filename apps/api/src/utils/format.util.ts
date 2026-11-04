export function normalizeAssetType(rawType?: string | null): string | null {
  if (!rawType) return null;
  const normalized = rawType.trim().toLowerCase();
  if (
    normalized === 'provident-fund' ||
    normalized.includes('pvd') ||
    normalized.includes('provident')
  ) {
    return 'provident-fund';
  }
  if (
    normalized === 'thai-stock' ||
    normalized.includes('thai') ||
    normalized === 'th'
  ) {
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
  if (
    normalized === 'mutual-fund' ||
    normalized.includes('fund') ||
    normalized.includes('mutual')
  ) {
    return 'mutual-fund';
  }
  if (normalized === 'bond' || normalized.includes('bond')) {
    return 'bond';
  }
  return null;
}

export function getAssetType(assetType?: string | null, symbol?: string | null): string {
  const nonAssetTypes = new Set(['closed-position', 'all', 'unknown']);
  if (assetType && !nonAssetTypes.has(assetType)) {
    const normalized = normalizeAssetType(assetType);
    if (normalized) return normalized;
    return assetType;
  }

  if (symbol) {
    const sym = symbol.toUpperCase();
    if (sym.startsWith('PVD') || sym.endsWith('.PVD')) {
      return 'provident-fund';
    }
    if (sym.endsWith('.FUND') || sym.endsWith('.BKFUND')) {
      return 'mutual-fund';
    }
    if (sym.endsWith('.BK')) {
      return 'thai-stock';
    }
    if (sym.endsWith('.CRYPTO')) {
      return 'crypto';
    }
  }
  return 'us-stock';
}

export function toYahooSymbol(symbol: string): string {
  if (!symbol) return '';
  const trimmed = symbol.trim();
  if (trimmed.toUpperCase().endsWith('.FUND')) {
    return trimmed.slice(0, -5);
  }
  if (trimmed.toUpperCase().endsWith('.BKFUND')) {
    return trimmed.slice(0, -7);
  }
  if (trimmed.toUpperCase().endsWith('.BK')) {
    return trimmed;
  }
  if (trimmed.toUpperCase().endsWith('.CRYPTO')) {
    return trimmed.slice(0, -7);
  }
  return trimmed.replace(/\./g, '-').replace(/\//g, '-');
}

export function resolveQuoteCurrency(quote: string): string {
  if (!quote) return '';
  const q = quote.toUpperCase();
  if (q === 'THB') return 'THB';
  if (q.includes('USD') || q === 'DAI') return 'USD';
  return q;
}

export function displaySymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.trim().replace(/\.(FUND|BKFUND|BK|CRYPTO)$/i, '');
}

export function convertCurrency(
  amount: number | null | undefined,
  fromCurr: string,
  toCurr: string,
  exchangeRate: number,
): number {
  if (amount == null) return 0;
  const normFrom = fromCurr.toUpperCase() === 'USDT' ? 'USD' : fromCurr.toUpperCase();
  const normTo = toCurr.toUpperCase() === 'USDT' ? 'USD' : toCurr.toUpperCase();

  if (normFrom === normTo) return amount;
  if (exchangeRate <= 0) return amount;

  if (normFrom === 'USD' && normTo === 'THB') {
    return amount * exchangeRate;
  }
  if (normFrom === 'THB' && normTo === 'USD') {
    return amount / exchangeRate;
  }

  return amount;
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  'us-stock': 'U.S. Stock',
  'thai-stock': 'Thai Stock',
  crypto: 'Cryptocurrency',
  'mutual-fund': 'Mutual Fund',
  bond: 'Bond',
  'provident-fund': 'Provident Fund',
};

export function getAssetTypeLabel(assetType?: string | null, symbol?: string | null): string {
  const t = getAssetType(assetType, symbol);
  return (
    ASSET_TYPE_LABELS[t] ||
    t
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

