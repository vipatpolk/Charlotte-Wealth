import { getSettings } from './settings.config.js';

export interface AssetTabConfig {
  id: string;
  label: string;
  sheetGid: string;
  currency: string;
}

export const SHEET_CONFIG = {
  baseUrl: 'https://docs.google.com/spreadsheets/d',
  gids: {
    'us-stock': '1032243687',
    'thai-stock': '102823823',
    crypto: '1822302220',
    'mutual-fund': '359978839',
    bond: '1657887056',
    'provident-fund': '0',
    'closed-position': '273600915',
  },
};

export const ASSET_TABS: AssetTabConfig[] = [
  { id: 'all', label: 'All', sheetGid: '', currency: '' },
  {
    id: 'us-stock',
    label: 'U.S. Stock',
    sheetGid: SHEET_CONFIG.gids['us-stock'],
    currency: 'USD',
  },
  {
    id: 'thai-stock',
    label: 'Thai Stock',
    sheetGid: SHEET_CONFIG.gids['thai-stock'],
    currency: 'THB',
  },
  {
    id: 'crypto',
    label: 'Cryptocurrency',
    sheetGid: SHEET_CONFIG.gids.crypto,
    currency: 'THB',
  },
  {
    id: 'mutual-fund',
    label: 'Mutual Fund',
    sheetGid: SHEET_CONFIG.gids['mutual-fund'],
    currency: 'THB',
  },
  {
    id: 'bond',
    label: 'Bond',
    sheetGid: SHEET_CONFIG.gids.bond,
    currency: 'USD',
  },
  {
    id: 'provident-fund',
    label: 'Provident Fund',
    sheetGid: SHEET_CONFIG.gids['provident-fund'],
    currency: 'THB',
  },
  {
    id: 'closed-position',
    label: 'Closed Position',
    sheetGid: SHEET_CONFIG.gids['closed-position'],
    currency: '',
  },
];

export function getSheetExportUrl(
  gid: string,
  tabId?: string,
  spreadsheetId?: string,
): string {
  const settings = getSettings();
  let sheetId = spreadsheetId;
  if (!sheetId) {
    if (tabId === 'provident-fund') {
      sheetId = settings.googlePvdSpreadsheetId;
    } else {
      sheetId = settings.googleSpreadsheetId;
    }
  }
  return `${SHEET_CONFIG.baseUrl}/${sheetId}/export?format=csv&gid=${gid}`;
}

