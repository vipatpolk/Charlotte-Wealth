import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { PortfolioHoldingsResponse, PortfolioPosition } from '../../models/portfolio.model';
import { PortfolioDividendResponse } from '../../models/dividend.model';
import { PriceData } from '../../services/price.service';
import { ToolId } from '../../models/tools.model';
import { AppView } from '../../config/asset.constants';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import {
  displaySymbol,
  getSymbolName,
  getAssetType,
  getAssetTypeLabel,
  getAssetColor,
  convertCurrency,
  getQuantityFormat,
  getUnitLabel,
} from '../../utils/format.utils';

export interface AssetAllocationItem {
  type: string;
  label: string;
  color: string;
  value: number;
  percentage: number;
  symbolCount: number;
  dashArray: string;
  dashOffset: number;
}

export interface RecentTransactionItem {
  id: string;
  date: string;
  type: 'BUY' | 'SELL' | 'EX-IN' | 'EX-OUT';
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  currency: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, DatePipe, SymbolIconComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  portfolioData = input<PortfolioHoldingsResponse | null>(null);
  dividendData = input<PortfolioDividendResponse | null>(null);
  pricesMap = input<Map<string, PriceData>>(new Map());
  displayCurrency = input<'USD' | 'THB'>('THB');
  exchangeRate = input<number>(1.0);
  hasRate = input<boolean>(false);
  privacyMode = input<boolean>(false);
  loading = input<boolean>(false);

  navigateView = output<AppView>();
  symbolSelected = output<string>();
  toolSelected = output<ToolId>();

  // Formatting helpers
  readonly displaySymbol = displaySymbol;
  readonly getSymbolName = getSymbolName;
  readonly getAssetType = getAssetType;
  readonly getAssetTypeLabel = getAssetTypeLabel;
  readonly getAssetColor = getAssetColor;
  readonly getQuantityFormat = getQuantityFormat;
  readonly getUnitLabel = getUnitLabel;

  private cx(value: number, originalCurrency: string): number {
    if (!this.hasRate()) return value;
    return convertCurrency(value, originalCurrency, this.displayCurrency(), this.exchangeRate());
  }

  readonly openPositions = computed<PortfolioPosition[]>(() => {
    return this.portfolioData()?.openPositions || [];
  });

  readonly closedPositions = computed(() => {
    return this.portfolioData()?.closedPositions || [];
  });

  // Net Portfolio Value converted to display currency
  readonly netPortfolioValue = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const rawVal = data.summary?.totalValue ?? 0;
    return this.cx(rawVal, data.currency);
  });

  // Secondary currency value (e.g. if viewing THB, shows USD approx)
  readonly secondaryNetValue = computed<number | null>(() => {
    const rate = this.exchangeRate();
    if (!this.hasRate() || rate <= 0) return null;
    const net = this.netPortfolioValue();
    return this.displayCurrency() === 'THB' ? net / rate : net * rate;
  });

  readonly secondaryCurrencyLabel = computed<string>(() => {
    return this.displayCurrency() === 'THB' ? 'USD' : 'THB';
  });

  // Total Invested Capital
  readonly totalInvested = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const rawCost = data.summary?.openInvested ?? data.summary?.totalInvested ?? 0;
    return this.cx(rawCost, data.currency);
  });

  // Unrealized P&L
  readonly unrealizedPL = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const rawPL = data.summary?.totalUnrealizedPL ?? 0;
    return this.cx(rawPL, data.currency);
  });

  readonly unrealizedPLPercent = computed<number>(() => {
    return this.portfolioData()?.summary?.totalUnrealizedPLPercent ?? 0;
  });

  // Realized P&L
  readonly realizedPL = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const rawRealized = data.summary?.totalRealizedPL ?? 0;
    return this.cx(rawRealized, data.currency);
  });

  readonly realizedPLPercent = computed<number>(() => {
    return this.portfolioData()?.summary?.totalRealizedPLPercent ?? 0;
  });

  // Combined Total Return
  readonly totalReturn = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const rawReturn =
      data.summary?.totalReturn ??
      (data.summary?.totalUnrealizedPL ?? 0) + (data.summary?.totalRealizedPL ?? 0);
    return this.cx(rawReturn, data.currency);
  });

  readonly totalReturnPercent = computed<number>(() => {
    return this.portfolioData()?.summary?.totalReturnPercent ?? 0;
  });

  // Total Lots count
  readonly totalLotsCount = computed<number>(() => {
    return this.openPositions().reduce((acc, pos) => acc + (pos.lots?.length || 0), 0);
  });

  // Asset Allocation breakdown & SVG donut metrics
  readonly assetAllocationList = computed<AssetAllocationItem[]>(() => {
    const positions = this.openPositions();
    if (positions.length === 0) return [];

    const order = ['us-stock', 'thai-stock', 'crypto', 'mutual-fund', 'bond', 'provident-fund'];
    const map = new Map<string, { value: number; count: number }>();

    for (const pos of positions) {
      const type = pos.assetType || getAssetType(pos.symbol);
      const val = this.cx(pos.holdingValue || pos.totalCost || 0, pos.currency || 'USD');
      const current = map.get(type) || { value: 0, count: 0 };
      map.set(type, { value: current.value + val, count: current.count + 1 });
    }

    const totalVal = Array.from(map.values()).reduce((sum, item) => sum + item.value, 0);
    if (totalVal <= 0) return [];

    const circumference = 251.327; // 2 * pi * 40
    let cumulativePercent = 0;
    const result: AssetAllocationItem[] = [];

    // Sort according to preferred order
    const sortedTypes = Array.from(map.keys()).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    for (const type of sortedTypes) {
      const item = map.get(type)!;
      const pct = (item.value / totalVal) * 100;
      const dashLength = (pct / 100) * circumference;
      const dashOffset = -(cumulativePercent / 100) * circumference;
      cumulativePercent += pct;

      result.push({
        type,
        label: getAssetTypeLabel(type),
        color: getAssetColor(type),
        value: item.value,
        percentage: pct,
        symbolCount: item.count,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset,
      });
    }

    return result;
  });

  // Top Gainers & Losers
  readonly topGainers = computed<PortfolioPosition[]>(() => {
    const list = this.openPositions().filter((p) => (p.unrealizedPLPercent || 0) > 0);
    return [...list]
      .sort((a, b) => (b.unrealizedPLPercent || 0) - (a.unrealizedPLPercent || 0))
      .slice(0, 4);
  });

  readonly topLosers = computed<PortfolioPosition[]>(() => {
    const list = this.openPositions().filter((p) => (p.unrealizedPLPercent || 0) < 0);
    return [...list]
      .sort((a, b) => (a.unrealizedPLPercent || 0) - (b.unrealizedPLPercent || 0))
      .slice(0, 4);
  });

  readonly winningPositionsCount = computed<number>(() => {
    return this.openPositions().filter((p) => (p.unrealizedPL || 0) > 0).length;
  });

  readonly losingPositionsCount = computed<number>(() => {
    return this.openPositions().filter((p) => (p.unrealizedPL || 0) < 0).length;
  });

  // Dividend analytics
  readonly annualProjectedDividendConverted = computed<number>(() => {
    const div = this.dividendData();
    if (!div) return 0;
    return this.cx(div.projectedAnnualDividends || 0, div.currency || 'THB');
  });

  readonly portfolioYieldOnCost = computed<number>(() => {
    return this.dividendData()?.portfolioYieldOnCost || 0;
  });

  readonly portfolioCurrentYield = computed<number>(() => {
    return this.dividendData()?.portfolioDividendYield || 0;
  });

  readonly dividendPayingCount = computed<number>(() => {
    return this.dividendData()?.symbolSummaries?.length || 0;
  });

  // Provident Fund (PVD) specific insights (if present)
  readonly pvdPositions = computed<PortfolioPosition[]>(() => {
    return this.openPositions().filter(
      (p) => getAssetType(p.assetType, p.symbol) === 'provident-fund',
    );
  });

  readonly hasPvd = computed<boolean>(() => {
    return this.pvdPositions().length > 0;
  });

  readonly pvdTotalValue = computed<number>(() => {
    return this.pvdPositions().reduce(
      (acc, pos) => acc + this.cx(pos.holdingValue || pos.totalCost, pos.currency),
      0,
    );
  });

  readonly pvdEmployeeContribution = computed<number>(() => {
    return this.pvdPositions().reduce((acc, pos) => acc + (pos.employeeContribution || 0), 0);
  });

  readonly pvdEmployerMatching = computed<number>(() => {
    return this.pvdPositions().reduce((acc, pos) => acc + (pos.employerMatching || 0), 0);
  });

  // Recent transactions feed (actual trade transactions only, excluding provident fund)
  readonly recentTransactions = computed<RecentTransactionItem[]>(() => {
    const data = this.portfolioData();
    if (!data) return [];

    const items: RecentTransactionItem[] = [];

    const hasValidSummaries = data.transactionSummaries?.some(
      (s) => getAssetType(s.assetType, s.symbol) !== 'provident-fund',
    );

    if (data.transactionSummaries && data.transactionSummaries.length > 0 && hasValidSummaries) {
      for (const sum of data.transactionSummaries) {
        if (getAssetType(sum.assetType, sum.symbol) === 'provident-fund') {
          continue;
        }
        if (sum.transactions) {
          for (const tx of sum.transactions) {
            const assetType = tx.assetType || sum.assetType;
            const symbol = tx.symbol || sum.symbol;
            if (getAssetType(assetType, symbol) === 'provident-fund') {
              continue;
            }
            if (!tx.quantity || tx.quantity <= 0 || !tx.date) {
              continue;
            }

            let t: 'BUY' | 'SELL' | 'EX-IN' | 'EX-OUT' = 'BUY';
            if (tx.type === 'SELL') t = 'SELL';
            else if (tx.type === 'EXCHANGE_IN' || tx.type === 'EXCHANGE') t = 'EX-IN';
            else if (tx.type === 'EXCHANGE_OUT') t = 'EX-OUT';
            else if (tx.type === 'BUY') t = 'BUY';
            else continue;

            items.push({
              id: tx.id || `tx-${symbol}-${tx.date}-${tx.quantity}`,
              date: tx.date,
              type: t,
              symbol: symbol,
              displaySymbol: displaySymbol(symbol),
              name: getSymbolName(symbol),
              assetType: assetType,
              quantity: tx.quantity,
              price: this.cx(tx.price, tx.currency || 'USD'),
              totalAmount: this.cx(tx.totalAmount || tx.quantity * tx.price, tx.currency || 'USD'),
              currency: this.displayCurrency(),
            });
          }
        }
      }
    } else if (data.rawTransactions && data.rawTransactions.length > 0) {
      for (let i = 0; i < data.rawTransactions.length; i++) {
        const tx = data.rawTransactions[i];
        if (getAssetType(tx.assetType, tx.symbol) === 'provident-fund') {
          continue;
        }
        if (!tx.quantity || tx.quantity <= 0 || !tx.date) {
          continue;
        }

        let t: 'BUY' | 'SELL' | 'EX-IN' | 'EX-OUT' = 'BUY';
        const rawType = (tx.txType || 'BUY').toUpperCase();
        if (rawType.includes('SELL')) t = 'SELL';
        else if (rawType.includes('IN') || rawType === 'EXCHANGE') t = 'EX-IN';
        else if (rawType.includes('OUT')) t = 'EX-OUT';
        else if (rawType.includes('BUY')) t = 'BUY';
        else continue;

        items.push({
          id: `raw-${i}-${tx.symbol}-${tx.date}`,
          date: tx.date,
          type: t,
          symbol: tx.symbol,
          displaySymbol: displaySymbol(tx.symbol),
          name: getSymbolName(tx.symbol),
          assetType: tx.assetType,
          quantity: tx.quantity,
          price: this.cx(tx.price, tx.currency || 'USD'),
          totalAmount: this.cx(tx.quantity * tx.price, tx.currency || 'USD'),
          currency: this.displayCurrency(),
        });
      }
    }

    if (items.length === 0) return [];

    const sorted = [...items].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });

    return sorted.slice(0, 5);
  });

  onSymbolClick(symbol: string): void {
    this.symbolSelected.emit(symbol);
  }

  onToolClick(toolId: ToolId): void {
    this.toolSelected.emit(toolId);
  }

  onNavigate(view: AppView): void {
    this.navigateView.emit(view);
  }
}
