import { describe, it, expect, vi } from 'vitest';
import { SymbolTransaction } from '../models/transaction.model';
import {
  generateTransactionsCsv,
  filterTransactionsForExport,
  generateExportFilename,
  formatDateYMD,
  escapeCsvCell,
  triggerFileDownload,
} from './csv-exporter.utils';

describe('CSV Exporter Utilities', () => {
  const mockTransactions: SymbolTransaction[] = [
    {
      id: 'tx-1',
      symbol: 'AAPL',
      date: '2026-01-05',
      type: 'BUY',
      quantity: 10,
      rawQuantity: 10,
      price: 150.0,
      totalAmount: 1500,
      currency: 'USD',
      assetType: 'us-stock',
      runningShares: 10,
      runningTotalCost: 1500,
      runningAverageCost: 150,
    },
    {
      id: 'tx-2',
      symbol: 'AAPL',
      date: '2026-01-20',
      type: 'SELL',
      quantity: 8,
      rawQuantity: -8,
      price: 170.0,
      totalAmount: 1360,
      currency: 'USD',
      assetType: 'us-stock',
      runningShares: 2,
      runningTotalCost: 300,
      runningAverageCost: 150,
    },
    {
      id: 'tx-3',
      symbol: 'PTT.BK',
      date: '2026-02-01T00:00:00.000Z',
      type: 'BUY',
      quantity: 1000,
      rawQuantity: 1000,
      price: 35.5,
      totalAmount: 35500,
      currency: 'THB',
      assetType: 'thai-stock',
      runningShares: 1000,
      runningTotalCost: 35500,
      runningAverageCost: 35.5,
    },
    {
      id: 'tx-4',
      symbol: 'BTC.CRYPTO',
      date: '2026-02-10',
      type: 'BUY',
      quantity: 0.5,
      rawQuantity: 0.5,
      price: 95000,
      totalAmount: 47500,
      currency: 'USD',
      assetType: 'crypto',
      runningShares: 0.5,
      runningTotalCost: 47500,
      runningAverageCost: 95000,
    },
  ];

  it('TC-CSV-01: should enforce exact 5-column schema (Symbol,Date,Quantity,Price,Currency)', () => {
    const csv = generateTransactionsCsv(mockTransactions);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    const header = lines[0];

    expect(header).toBe('Symbol,Date,Quantity,Price,Currency');
    expect(header).not.toContain('Asset Type');
  });

  it('TC-CSV-02 & TC-CSV-03: should output positive quantity for BUY and negative for SELL', () => {
    const csv = generateTransactionsCsv(mockTransactions);
    const lines = csv.replace('\uFEFF', '').split('\r\n');

    expect(lines[1]).toBe('AAPL,2026-01-05,10,150,USD');
    expect(lines[2]).toBe('AAPL,2026-01-20,-8,170,USD');
  });

  it('TC-CSV-04: should normalize date strings to YYYY-MM-DD', () => {
    expect(formatDateYMD('2026-01-05')).toBe('2026-01-05');
    expect(formatDateYMD('2026-02-01T00:00:00.000Z')).toBe('2026-02-01');
    expect(formatDateYMD('')).toBe('');
  });

  it('TC-CSV-05: should prepend UTF-8 BOM byte marker \\uFEFF at start of CSV content', () => {
    const csv = generateTransactionsCsv(mockTransactions);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('TC-CSV-06: should escape CSV cell values with quotes when containing commas or quotes', () => {
    expect(escapeCsvCell('PTT, INC.')).toBe('"PTT, INC."');
    expect(escapeCsvCell('Symbol "Test"')).toBe('"Symbol ""Test"""');
    expect(escapeCsvCell(150)).toBe('150');
  });

  it('TC-CSV-07: should handle empty transaction list without throwing', () => {
    const csv = generateTransactionsCsv([]);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('Symbol,Date,Quantity,Price,Currency');
  });

  it('should filter transactions by assetTypeFilter (us-stock, thai-stock, crypto)', () => {
    const usOnly = filterTransactionsForExport(mockTransactions, { assetTypeFilter: 'us-stock' });
    expect(usOnly.length).toBe(2);
    expect(usOnly.every((t) => t.assetType === 'us-stock')).toBe(true);

    const thaiOnly = filterTransactionsForExport(mockTransactions, { assetTypeFilter: 'thai-stock' });
    expect(thaiOnly.length).toBe(1);
    expect(thaiOnly[0].symbol).toBe('PTT.BK');

    const cryptoOnly = filterTransactionsForExport(mockTransactions, { assetTypeFilter: 'crypto' });
    expect(cryptoOnly.length).toBe(1);
    expect(cryptoOnly[0].symbol).toBe('BTC.CRYPTO');
  });

  it('should filter transactions by statusScope (open, closed)', () => {
    const openSet = new Set(['AAPL', 'BTC.CRYPTO']);
    const closedSet = new Set(['PTT.BK']);

    const openTxs = filterTransactionsForExport(mockTransactions, {
      statusScope: 'open',
      openSymbols: openSet,
    });
    expect(openTxs.length).toBe(3);
    expect(openTxs.map((t) => t.symbol)).toEqual(['AAPL', 'AAPL', 'BTC.CRYPTO']);

    const closedTxs = filterTransactionsForExport(mockTransactions, {
      statusScope: 'closed',
      closedSymbols: closedSet,
    });
    expect(closedTxs.length).toBe(1);
    expect(closedTxs[0].symbol).toBe('PTT.BK');
  });

  it('should construct structured export filenames correctly', () => {
    const testDate = new Date('2026-08-12T00:00:00Z');

    const f1 = generateExportFilename({}, testDate);
    expect(f1).toBe('ShareLot_Transactions_All_2026-08-12.csv');

    const f2 = generateExportFilename({ assetTypeFilter: 'us-stock', statusScope: 'open' }, testDate);
    expect(f2).toBe('ShareLot_Transactions_US-STOCK_OPEN_2026-08-12.csv');

    const f3 = generateExportFilename(
      { activeSymbol: 'AAPL', statusScope: 'closed', getDisplaySymbolFn: () => 'AAPL' },
      testDate
    );
    expect(f3).toBe('ShareLot_Transactions_AAPL_CLOSED_2026-08-12.csv');
  });

  it('should trigger browser file download without error', () => {
    let clicked = false;
    const linkMock = {
      setAttribute: vi.fn(),
      click: () => {
        clicked = true;
      },
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(linkMock);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => linkMock);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => linkMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    triggerFileDownload('header\r\nrow1', 'test.csv');
    expect(clicked).toBe(true);
  });
});
