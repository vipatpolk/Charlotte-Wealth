import {
  Component,
  input,
  signal,
  computed,
  effect,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import {
  SymbolSummary,
  TargetAllocation,
  RebalanceRecommendation,
} from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioAllocationResponse } from '../../models/portfolio.model';
import {
  getAssetType,
  getAssetTypeLabel,
  getAssetColor,
  getSymbolColor,
  displaySymbol,
  resolveSymbolName,
} from '../../utils/format.utils';

@Component({
  selector: 'app-asset-allocation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, SymbolIconComponent],
  templateUrl: './asset-allocation.component.html',
  styleUrls: ['./asset-allocation.component.css'],
})
export class AssetAllocationComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);

  summaries = input.required<SymbolSummary[]>();
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();

  private defaultTargets: TargetAllocation = {
    'us-stock': 40,
    'thai-stock': 30,
    crypto: 15,
    'mutual-fund': 15,
    bond: 0,
    'provident-fund': 0,
  };

  targetAllocation = signal<TargetAllocation>(this.defaultTargets);
  selectedAssetType = signal<string | null>(null);

  readonly serverAllocation = signal<PortfolioAllocationResponse | null>(null);

  selectAssetType(type: string | null): void {
    if (this.selectedAssetType() === type) {
      this.selectedAssetType.set(null);
    } else {
      this.selectedAssetType.set(type);
    }
  }

  readonly selectedAssetLabel = computed<string>(() => {
    const type = this.selectedAssetType();
    return type ? this.getAssetLabel(type) : 'All Classes';
  });

  constructor() {
    effect(() => {
      const targets = this.targetAllocation();
      const curr = this.displayCurrency();
      this.portfolioService.fetchAllocation(targets, curr).subscribe({
        next: (res) => {
          if (!res.error) {
            this.serverAllocation.set(res);
          }
        },
      });
      localStorage.setItem('sharelot_target_allocation', JSON.stringify(targets));
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem('sharelot_target_allocation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.targetAllocation.set({ ...this.defaultTargets, ...parsed });
        }
      } catch (e) {
        // use defaults
      }
    }
  }

  private cx(value: number, originalCurrency: string): number {
    if (!this.hasRate()) return value;
    const target = this.displayCurrency();
    const orig = originalCurrency === 'USDT' ? 'USD' : originalCurrency;
    if (orig === target) return value;
    if (orig === 'USD' && target === 'THB') return value * this.exchangeRate();
    if (orig === 'THB' && target === 'USD') return value / this.exchangeRate();
    return value;
  }

  readonly currentValues = computed(() => {
    const vals: Record<string, number> = Object.fromEntries(
      Object.keys(this.defaultTargets).map((k) => [k, 0]),
    );
    const pm = this.pricesMap();
    for (const s of this.summaries()) {
      const pd = pm.get(s.symbol);
      if (pd && pd.price > 0) {
        const type = getAssetType(s.assetType, s.symbol);
        const val = s.totalShares * pd.price;
        if (vals[type] !== undefined) {
          vals[type] += this.cx(val, pd.currency);
        } else {
          vals[type] = this.cx(val, pd.currency);
        }
      }
    }
    return vals;
  });

  readonly totalValue = computed(() => {
    const alloc = this.serverAllocation();
    if (alloc && alloc.totalPortfolioValue > 0) {
      return this.cx(alloc.totalPortfolioValue, alloc.currency);
    }
    return Object.values(this.currentValues()).reduce((a, b) => a + b, 0);
  });

  readonly recommendations = computed<RebalanceRecommendation[]>(() => {
    const alloc = this.serverAllocation();
    if (alloc && alloc.recommendations && alloc.recommendations.length > 0) {
      return alloc.recommendations.map((r) => ({
        assetType: r.assetType,
        currentValue: this.cx(r.currentValue, alloc.currency),
        actualPercent: r.actualPercent,
        targetPercent: r.targetPercent,
        rebalanceAmount: this.cx(r.rebalanceAmount, alloc.currency),
        deviationPercent: r.deviationPercent,
      }));
    }

    const vals = this.currentValues();
    const total = this.totalValue();
    const targets = this.targetAllocation();

    const defaultKeys = Object.keys(this.defaultTargets);
    const extraKeys = Object.keys({ ...vals, ...targets }).filter((k) => !defaultKeys.includes(k));
    const keys = [...defaultKeys, ...extraKeys];

    const recs: RebalanceRecommendation[] = [];
    for (const k of keys) {
      const val = vals[k] || 0;
      const actualPct = total > 0 ? (val / total) * 100 : 0;
      const targetPct = targets[k] || 0;
      const targetVal = (targetPct / 100) * total;

      recs.push({
        assetType: k,
        currentValue: val,
        actualPercent: actualPct,
        targetPercent: targetPct,
        rebalanceAmount: targetVal - val,
        deviationPercent: actualPct - targetPct,
      });
    }

    return recs;
  });

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
    const selectedType = this.selectedAssetType();
    const summaries = selectedType
      ? this.summaries().filter((s) => getAssetType(s.assetType, s.symbol) === selectedType)
      : this.summaries();

    for (const s of summaries) {
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

  readonly allHoldings = computed(() => {
    const pm = this.pricesMap();
    const selectedType = this.selectedAssetType();
    const summaries = selectedType
      ? this.summaries().filter((s) => getAssetType(s.assetType, s.symbol) === selectedType)
      : this.summaries();

    const holdings = summaries
      .map((s) => {
        const pd = pm.get(s.symbol);
        const val = pd && pd.price > 0 ? this.cx(s.totalShares * pd.price, pd.currency) : 0;
        return {
          symbol: s.symbol,
          displaySymbol: displaySymbol(s.symbol),
          value: val,
          percent: 0,
          color: getSymbolColor(s.symbol),
        };
      })
      .filter((h) => h.value > 0);

    const total = selectedType ? this.classTotalValue() : this.totalValue();
    holdings.forEach((h) => (h.percent = total > 0 ? (h.value / total) * 100 : 0));

    return holdings.sort((a, b) => b.value - a.value);
  });

  showAllHoldings = signal<boolean>(false);

  readonly displayedHoldings = computed(() => {
    const all = this.allHoldings();
    return this.showAllHoldings() ? all : all.slice(0, 5);
  });

  toggleShowAllHoldings() {
    this.showAllHoldings.update((v) => !v);
  }

  readonly classHoldings = computed(() => {
    const selectedType = this.selectedAssetType();
    if (!selectedType) return [];

    const pm = this.pricesMap();
    return this.summaries()
      .filter((s) => getAssetType(s.assetType, s.symbol) === selectedType)
      .map((s) => {
        const pd = pm.get(s.symbol);
        const val = pd && pd.price > 0 ? this.cx(s.totalShares * pd.price, pd.currency) : 0;
        return {
          symbol: s.symbol,
          displaySymbol: displaySymbol(s.symbol),
          name: resolveSymbolName(s.symbol, pm),
          shares: s.totalShares,
          price: pd?.price || 0,
          currency: pd?.currency || 'USD',
          value: val,
          color: getSymbolColor(s.symbol),
        };
      })
      .filter((h) => h.value > 0 || h.shares > 0)
      .sort((a, b) => b.value - a.value);
  });

  readonly classTotalValue = computed(() => {
    return this.classHoldings().reduce((sum, h) => sum + h.value, 0);
  });

  readonly enrichedClassHoldings = computed(() => {
    const holdings = this.classHoldings();
    const classTot = this.classTotalValue();
    const portTot = this.totalValue();

    return holdings.map((h) => ({
      ...h,
      classPercent: classTot > 0 ? (h.value / classTot) * 100 : 0,
      portfolioPercent: portTot > 0 ? (h.value / portTot) * 100 : 0,
    }));
  });

  readonly displayTotalValue = computed(() => {
    return this.selectedAssetType() ? this.classTotalValue() : this.totalValue();
  });

  readonly actualTotal = computed(() => {
    return this.recommendations().reduce((sum, r) => sum + r.actualPercent, 0);
  });

  getAssetColor = getAssetColor;

  getAssetLabel(type: string): string {
    return getAssetTypeLabel(type);
  }

  readonly donutSegments = computed(() => {
    const selectedType = this.selectedAssetType();
    let cumulativePercent = 0;

    if (!selectedType) {
      const recs = this.recommendations();
      return recs.map((r) => {
        const percent = r.actualPercent;
        const offset = 100 - cumulativePercent;
        cumulativePercent += percent;

        return {
          key: r.assetType,
          label: this.getAssetLabel(r.assetType),
          actualPercent: percent,
          dashArray: `${Math.max(percent, 0.001)} ${100 - Math.max(percent, 0.001)}`,
          dashOffset: offset,
          color: this.getAssetColor(r.assetType),
        };
      });
    } else {
      const holdings = this.enrichedClassHoldings();
      return holdings.map((h) => {
        const percent = h.classPercent;
        const offset = 100 - cumulativePercent;
        cumulativePercent += percent;

        return {
          key: h.symbol,
          label: h.displaySymbol,
          actualPercent: percent,
          dashArray: `${Math.max(percent, 0.001)} ${100 - Math.max(percent, 0.001)}`,
          dashOffset: offset,
          color: h.color,
        };
      });
    }
  });
}
