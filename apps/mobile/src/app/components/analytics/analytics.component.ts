import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AssetAllocationComponent } from '../asset-allocation/asset-allocation.component';
import { PerformanceComponent } from '../performance/performance.component';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import {
  SymbolSummary,
  ClosedSymbolSummary,
  SymbolTransactionSummary,
  Transaction,
  TargetAllocation,
} from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';
import { PortfolioService } from '../../services/portfolio.service';
import {
  PortfolioAllocationResponse,
  PortfolioPerformanceResponse,
} from '../../models/portfolio.model';
import { AnalyticsSubTab } from '../../config/asset.constants';
import {
  getAssetType,
  getAssetTypeLabel,
  getAssetColor,
  getSymbolColor,
  displaySymbol,
  resolveSymbolName,
  convertCurrency,
} from '../../utils/format.utils';

@Component({
  selector: 'app-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    AssetAllocationComponent,
    PerformanceComponent,
    SymbolIconComponent,
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
})
export class AnalyticsComponent {
  private readonly portfolioService = inject(PortfolioService);

  summaries = input.required<SymbolSummary[]>();
  closedSummaries = input.required<ClosedSymbolSummary[]>();
  transactionSummaries = input.required<SymbolTransactionSummary[]>();
  rawTransactions = input.required<Transaction[]>();
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();
  activeSubTab = input<AnalyticsSubTab>('overview');

  subTabChange = output<AnalyticsSubTab>();

  readonly internalSubTab = signal<AnalyticsSubTab>('overview');
  readonly serverPerformance = signal<PortfolioPerformanceResponse | null>(null);
  readonly serverAllocation = signal<PortfolioAllocationResponse | null>(null);

  getAssetColor = getAssetColor;

  private defaultTargets: TargetAllocation = {
    'us-stock': 40,
    'thai-stock': 30,
    crypto: 15,
    'mutual-fund': 15,
    bond: 0,
    'provident-fund': 0,
  };

  constructor() {
    effect(() => {
      const sub = this.activeSubTab();
      this.internalSubTab.set(sub);
    });

    // Fetch overview analytics data from backend
    effect(() => {
      const curr = this.displayCurrency();
      this.portfolioService.fetchPerformance('ALL', '', '', curr).subscribe({
        next: (res) => {
          if (!res.error) {
            this.serverPerformance.set(res);
          }
        },
      });

      this.portfolioService.fetchAllocation(this.defaultTargets, curr).subscribe({
        next: (res) => {
          if (!res.error) {
            this.serverAllocation.set(res);
          }
        },
      });
    });
  }

  selectSubTab(tab: AnalyticsSubTab): void {
    this.internalSubTab.set(tab);
    this.subTabChange.emit(tab);
  }

  private cx(value: number, originalCurrency: string): number {
    if (!this.hasRate()) {
      const target = this.displayCurrency();
      const orig = originalCurrency === 'USDT' ? 'USD' : originalCurrency;
      if (orig !== target) return value;
      return value;
    }
    return convertCurrency(value, originalCurrency, this.displayCurrency(), this.exchangeRate());
  }

  // --- OVERVIEW: KPI Summary ---
  readonly portfolioSummary = computed(() => {
    const perf = this.serverPerformance();
    if (perf && perf.summary && (perf.summary.totalInvested > 0 || perf.summary.totalValue > 0)) {
      return {
        totalInvested: this.cx(perf.summary.totalInvested, perf.currency),
        totalCurrentValue: this.cx(perf.summary.totalValue, perf.currency),
        totalUnrealizedPL: this.cx(perf.summary.totalUnrealizedPL, perf.currency),
        totalUnrealizedPLPercent: perf.summary.totalUnrealizedPLPercent,
        totalRealizedPL: this.cx(perf.summary.totalRealizedPL, perf.currency),
        totalRealizedPLPercent: perf.summary.totalRealizedPLPercent,
        totalReturn: this.cx(perf.summary.totalReturn, perf.currency),
        totalReturnPercent: perf.summary.totalReturnPercent,
      };
    }

    let openInvested = 0;
    let openValue = 0;
    let closedInvested = 0;
    let closedRealized = 0;

    for (const summary of this.summaries()) {
      const priceData = this.pricesMap().get(summary.symbol);
      const invested = this.cx(summary.totalCost, summary.currency);
      let value = 0;
      if (priceData && priceData.price > 0) {
        value = this.cx(summary.totalShares * priceData.price, priceData.currency);
      } else {
        value = this.cx(summary.totalShares * summary.averageCost, summary.currency);
      }
      openInvested += invested;
      openValue += value;
    }

    for (const closed of this.closedSummaries()) {
      for (const lot of closed.lots) {
        const lotCurrency = lot.currency || closed.currency;
        closedInvested += this.cx(lot.totalCost, lotCurrency);
        closedRealized += this.cx(lot.realizedPL, lotCurrency);
      }
    }

    const totalInvested = openInvested + closedInvested;
    const totalUnrealizedPL = openValue - openInvested;
    const totalUnrealizedPLPercent =
      openInvested > 0 ? (totalUnrealizedPL / openInvested) * 100 : 0;
    const totalRealizedPL = closedRealized;
    const totalRealizedPLPercent =
      closedInvested > 0 ? (totalRealizedPL / closedInvested) * 100 : 0;
    const totalReturn = totalRealizedPL + totalUnrealizedPL;
    const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue: openValue,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalRealizedPL,
      totalRealizedPLPercent,
      totalReturn,
      totalReturnPercent,
    };
  });

  // --- OVERVIEW: Asset Allocation Segments & Donut ---
  readonly assetClassDistribution = computed(() => {
    const pm = this.pricesMap();
    const typeMap = new Map<string, number>();

    for (const s of this.summaries()) {
      const pd = pm.get(s.symbol);
      if (pd && pd.price > 0) {
        const type = getAssetType(s.assetType, s.symbol);
        const val = this.cx(s.totalShares * pd.price, pd.currency);
        typeMap.set(type, (typeMap.get(type) || 0) + val);
      }
    }

    const totalVal = Array.from(typeMap.values()).reduce((a, b) => a + b, 0);
    const list: Array<{
      type: string;
      label: string;
      value: number;
      percentage: number;
      color: string;
    }> = [];

    for (const [type, val] of typeMap.entries()) {
      list.push({
        type,
        label: getAssetTypeLabel(type),
        value: val,
        percentage: totalVal > 0 ? (val / totalVal) * 100 : 0,
        color: getAssetColor(type),
      });
    }

    return list.sort((a, b) => b.value - a.value);
  });

  readonly totalPortfolioValue = computed(() => {
    const list = this.assetClassDistribution();
    return list.reduce((acc, item) => acc + item.value, 0);
  });

  readonly donutSegments = computed(() => {
    const classes = this.assetClassDistribution();
    let cumulativePercent = 0;

    return classes.map((c) => {
      const percent = c.percentage;
      const offset = 100 - cumulativePercent;
      cumulativePercent += percent;

      return {
        key: c.type,
        label: c.label,
        actualPercent: percent,
        dashArray: `${Math.max(percent, 0.001)} ${100 - Math.max(percent, 0.001)}`,
        dashOffset: offset,
        color: c.color,
      };
    });
  });

  // --- OVERVIEW: Currency Exposure ---
  readonly currencyExposure = computed(() => {
    const alloc = this.serverAllocation();
    if (
      alloc &&
      alloc.currencyExposure &&
      (alloc.currencyExposure.usd > 0 || alloc.currencyExposure.thb > 0)
    ) {
      return {
        usd: this.cx(alloc.currencyExposure.usd, alloc.currency),
        thb: this.cx(alloc.currencyExposure.thb, alloc.currency),
        usdPercent: alloc.currencyExposure.usdPercent,
        thbPercent: alloc.currencyExposure.thbPercent,
      };
    }

    let usdVal = 0;
    let thbVal = 0;
    const pm = this.pricesMap();

    for (const s of this.summaries()) {
      const pd = pm.get(s.symbol);
      if (pd && pd.price > 0) {
        const val = this.cx(s.totalShares * pd.price, pd.currency);
        const orig = pd.currency === 'USDT' ? 'USD' : pd.currency;
        if (orig === 'USD') usdVal += val;
        else if (orig === 'THB') thbVal += val;
      }
    }

    const tot = usdVal + thbVal;
    return {
      usd: usdVal,
      thb: thbVal,
      usdPercent: tot > 0 ? (usdVal / tot) * 100 : 0,
      thbPercent: tot > 0 ? (thbVal / tot) * 100 : 0,
    };
  });

  // --- OVERVIEW: Asset Type Returns ---
  readonly assetTypePerformance = computed(() => {
    const perf = this.serverPerformance();
    if (perf && perf.assetTypePerformance && perf.assetTypePerformance.length > 0) {
      return perf.assetTypePerformance.map((t) => ({
        type: t.assetType,
        label: t.label,
        totalReturnPercent: t.totalReturnPercent,
        color: this.getAssetColor(t.assetType),
      }));
    }

    // Fallback calculation
    const typeMap = new Map<string, { invested: number; val: number; realized: number }>();
    const pm = this.pricesMap();

    for (const s of this.summaries()) {
      const type = getAssetType(s.assetType || '', s.symbol);
      const inv = this.cx(s.totalCost, s.currency);
      const pd = pm.get(s.symbol);
      const val = pd && pd.price > 0 ? this.cx(s.totalShares * pd.price, pd.currency) : inv;

      if (!typeMap.has(type)) {
        typeMap.set(type, { invested: 0, val: 0, realized: 0 });
      }
      const item = typeMap.get(type)!;
      item.invested += inv;
      item.val += val;
    }

    for (const c of this.closedSummaries()) {
      const type = getAssetType(c.assetType || '', c.symbol);
      if (!typeMap.has(type)) {
        typeMap.set(type, { invested: 0, val: 0, realized: 0 });
      }
      const item = typeMap.get(type)!;
      for (const lot of c.lots) {
        const cur = lot.currency || c.currency;
        item.invested += this.cx(lot.totalCost, cur);
        item.realized += this.cx(lot.realizedPL, cur);
      }
    }

    return Array.from(typeMap.entries()).map(([type, data]) => {
      const totalReturn = data.val - data.invested + data.realized;
      const totalReturnPercent = data.invested > 0 ? (totalReturn / data.invested) * 100 : 0;
      return {
        type,
        label: getAssetTypeLabel(type),
        totalReturnPercent,
        color: this.getAssetColor(type),
      };
    });
  });

  readonly maxAbsReturnPercent = computed(() => {
    let max = 0;
    for (const t of this.assetTypePerformance()) {
      if (Math.abs(t.totalReturnPercent) > max) {
        max = Math.abs(t.totalReturnPercent);
      }
    }
    return max === 0 ? 1 : max;
  });

  // --- OVERVIEW: Top Concentration ---
  readonly topConcentration = computed(() => {
    const pm = this.pricesMap();
    const tot = this.totalPortfolioValue();

    return this.summaries()
      .map((s) => {
        const pd = pm.get(s.symbol);
        const val = pd && pd.price > 0 ? this.cx(s.totalShares * pd.price, pd.currency) : 0;
        return {
          symbol: s.symbol,
          displaySymbol: displaySymbol(s.symbol),
          value: val,
          percent: tot > 0 ? (val / tot) * 100 : 0,
          color: getSymbolColor(s.symbol),
        };
      })
      .filter((h) => h.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  });

  // --- OVERVIEW: Top Movers ---
  readonly topMovers = computed(() => {
    const pm = this.pricesMap();
    const items = this.summaries().map((s) => {
      const pd = pm.get(s.symbol);
      const inv = this.cx(s.totalCost, s.currency);
      const curVal = pd && pd.price > 0 ? this.cx(s.totalShares * pd.price, pd.currency) : inv;
      const unPL = curVal - inv;
      const pct = inv > 0 ? (unPL / inv) * 100 : 0;

      return {
        symbol: s.symbol,
        displaySymbol: displaySymbol(s.symbol),
        name: resolveSymbolName(s.symbol, pm),
        assetType: getAssetType(s.assetType, s.symbol),
        totalReturnPercent: pct,
        color: getSymbolColor(s.symbol),
      };
    });

    const gainers = items
      .filter((i) => i.totalReturnPercent > 0)
      .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
      .slice(0, 3);

    const losers = items
      .filter((i) => i.totalReturnPercent < 0)
      .sort((a, b) => a.totalReturnPercent - b.totalReturnPercent)
      .slice(0, 3);

    return { gainers, losers };
  });
}
