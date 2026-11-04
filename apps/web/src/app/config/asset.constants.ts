export interface AssetTab {
  id: string;
  label: string;
  icon: string;
  currency: string;
}

export type AssetType =
  'us-stock' | 'thai-stock' | 'crypto' | 'mutual-fund' | 'bond' | 'provident-fund';

export type AppView =
  | 'dashboard'
  | 'holdings'
  | 'transactions'
  | 'analytics'
  | 'allocation'
  | 'performance'
  | 'dividends'
  | 'tools';

export type AnalyticsSubTab = 'overview' | 'allocation' | 'performance';

export const KNOWN_ASSET_TYPES: readonly AssetType[] = [
  'us-stock',
  'thai-stock',
  'crypto',
  'mutual-fund',
  'bond',
  'provident-fund',
] as const;

export const DIVIDEND_ASSET_TYPES: readonly AssetType[] = [
  'us-stock',
  'thai-stock',
  'mutual-fund',
  'bond',
] as const;

export const ASSET_TABS: AssetTab[] = [
  {
    id: 'all',
    label: 'All',
    icon: 'globe',
    currency: '',
  },
  {
    id: 'us-stock',
    label: 'U.S. Stock',
    icon: 'flag-us',
    currency: 'USD',
  },
  {
    id: 'thai-stock',
    label: 'Thai Stock',
    icon: 'flag-th',
    currency: 'THB',
  },
  {
    id: 'crypto',
    label: 'Cryptocurrency',
    icon: 'bitcoin',
    currency: 'THB',
  },
  {
    id: 'mutual-fund',
    label: 'Mutual Fund',
    icon: 'pie-chart',
    currency: 'THB',
  },
  {
    id: 'bond',
    label: 'Bond',
    icon: 'landmark',
    currency: 'USD',
  },
  {
    id: 'provident-fund',
    label: 'Provident Fund',
    icon: 'briefcase',
    currency: 'THB',
  },
  {
    id: 'closed-position',
    label: 'Closed Position',
    icon: 'check-circle',
    currency: '',
  },
];
