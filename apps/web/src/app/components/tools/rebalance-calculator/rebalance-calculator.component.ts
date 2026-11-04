import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioPosition } from '../../../models/portfolio.model';
import { PriceData } from '../../../services/price.service';
import {
  AssetClassRebalanceGroup,
  NoSellSubMode,
  RebalanceMode,
  RebalancePlanResult,
  RebalanceTradeOrder,
  SymbolRebalanceItem,
} from '../../../models/tools.model';
import {
  calculateRebalancePlan,
  getCurrentWeightsForClass,
  getEqualWeightsForClass,
  normalizeWeightsTo100,
} from '../../../utils/rebalance-calculator.utils';
import {
  convertCurrency,
  displaySymbol,
  getAssetColor,
  getAssetType,
  getAssetTypeLabel,
  getSymbolColor,
} from '../../../utils/format.utils';

@Component({
  selector: 'app-rebalance-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './rebalance-calculator.component.html',
  styleUrls: ['./rebalance-calculator.component.css'],
})
export class RebalanceCalculatorComponent implements OnInit {
  portfolioPositions = input<PortfolioPosition[]>([]);
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();
  privacyMode = input<boolean>(false);

  planChange = output<RebalancePlanResult | null>();

  /** Calculation Settings */
  readonly mode = signal<RebalanceMode>('standard');
  readonly noSellSubMode = signal<NoSellSubMode>('min-inflow');
  readonly selectedAssetClassFilter = signal<string>('all');
  readonly customCashDeposit = signal<number>(1000);

  /** Map of symbol -> target % within its class (0 - 100) */
  readonly targetAllocations = signal<Record<string, number>>({});

  /** UI State */
  readonly isCopiedOrders = signal<boolean>(false);
  readonly isOrdersExpanded = signal<boolean>(true);

  private readonly STORAGE_KEY = 'sharelot_tools_rebalance_targets';

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            this.targetAllocations.set(parsed);
          }
        }
      } catch {
        // Use default
      }
    }
  }

  constructor() {
    // Automatically initialize default targets for symbols if not set
    effect(() => {
      const positions = this.portfolioPositions();
      if (!positions || positions.length === 0) return;

      const currentAlloc = { ...this.targetAllocations() };
      let hasChanges = false;

      // Group positions by class
      const classMap = new Map<string, string[]>();
      for (const p of positions) {
        const atype = getAssetType(p.assetType, p.symbol);
        const list = classMap.get(atype) || [];
        list.push(p.symbol);
        classMap.set(atype, list);
      }

      // Ensure every symbol in each class has a target, defaulting to equal weight if unassigned
      for (const [, symList] of classMap.entries()) {
        const unassigned = symList.filter((s) => currentAlloc[s] === undefined);
        if (unassigned.length > 0) {
          const equal = getEqualWeightsForClass(symList);
          for (const s of symList) {
            currentAlloc[s] = equal[s] || 0;
          }
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.targetAllocations.set(currentAlloc);
      }
    });

    // Save target allocations to localStorage & emit updates
    effect(() => {
      const targets = this.targetAllocations();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(targets));
        } catch {
          // Ignore
        }
      }
      this.planChange.emit(this.masterPlan());
    });
  }

  /** Master calculated rebalance plan */
  readonly masterPlan = computed<RebalancePlanResult>(() => {
    return calculateRebalancePlan(
      this.portfolioPositions(),
      this.pricesMap(),
      {
        mode: this.mode(),
        noSellSubMode: this.noSellSubMode(),
        customCashDeposit: Math.max(0, this.customCashDeposit()),
        targetAllocations: this.targetAllocations(),
        selectedAssetClassFilter: this.selectedAssetClassFilter(),
      },
      this.displayCurrency(),
      this.exchangeRate()
    );
  });

  /** Available Asset Classes present in the portfolio */
  readonly availableAssetClasses = computed<{ id: string; label: string; count: number }[]>(() => {
    const plan = this.masterPlan();
    const list = plan.groups.map((g) => ({
      id: g.assetType,
      label: g.label,
      count: g.symbols.length,
    }));
    return [{ id: 'all', label: 'All Classes', count: plan.groups.reduce((acc, g) => acc + g.symbols.length, 0) }, ...list];
  });

  /** Filtered groups based on user asset class tab */
  readonly displayedGroups = computed<AssetClassRebalanceGroup[]>(() => {
    const filter = this.selectedAssetClassFilter();
    const plan = this.masterPlan();
    if (filter === 'all') {
      return plan.groups;
    }
    return plan.groups.filter((g) => g.assetType === filter);
  });

  /** Filtered KPI Metrics reflecting the active asset class filter */
  readonly filteredCurrentValue = computed<number>(() => {
    return this.displayedGroups().reduce((sum, g) => sum + g.currentValue, 0);
  });

  readonly filteredCashContribution = computed<number>(() => {
    if (this.mode() === 'standard') return 0;
    return this.displayedGroups().reduce(
      (sum, g) => sum + (this.noSellSubMode() === 'min-inflow' ? g.minInflowRequired : g.totalBuyAmount),
      0
    );
  });

  readonly filteredBuyAmount = computed<number>(() => {
    return this.displayedGroups().reduce((sum, g) => sum + g.totalBuyAmount, 0);
  });

  readonly filteredSellAmount = computed<number>(() => {
    return this.displayedGroups().reduce((sum, g) => sum + g.totalSellAmount, 0);
  });

  readonly filteredTargetValue = computed<number>(() => {
    if (this.mode() === 'standard') {
      return this.filteredCurrentValue();
    }
    return this.filteredCurrentValue() + this.filteredCashContribution();
  });

  readonly currentValueLabel = computed<string>(() => {
    return this.selectedAssetClassFilter() === 'all' ? 'Current Portfolio Value' : 'Current Class Value';
  });

  readonly targetValueLabel = computed<string>(() => {
    return this.selectedAssetClassFilter() === 'all' ? 'Resulting Portfolio Value' : 'Resulting Class Value';
  });


  /** Filtered Rebalance Trade Orders */
  readonly filteredOrders = computed<RebalanceTradeOrder[]>(() => {
    const filter = this.selectedAssetClassFilter();
    const all = this.masterPlan().orders;
    if (filter === 'all') {
      return all;
    }
    return all.filter((o) => o.assetType === filter);
  });

  /** Backwards compatible alias for orders */
  readonly orders = computed<RebalanceTradeOrder[]>(() => {
    return this.filteredOrders();
  });


  /** Mode & Filter Controllers */
  setMode(mode: RebalanceMode): void {
    this.mode.set(mode);
  }

  setNoSellSubMode(subMode: NoSellSubMode): void {
    this.noSellSubMode.set(subMode);
  }

  setAssetClassFilter(filter: string): void {
    this.selectedAssetClassFilter.set(filter);
  }

  setCustomCashDeposit(amount: number): void {
    this.customCashDeposit.set(Math.max(0, amount));
  }

  adjustCashDeposit(delta: number): void {
    this.customCashDeposit.update((v) => Math.max(0, v + delta));
  }

  /** Target % Adjusters */
  updateTarget(symbol: string, targetPct: number): void {
    const sanitized = Math.min(100, Math.max(0, parseFloat(targetPct.toFixed(2)) || 0));
    this.targetAllocations.update((curr) => ({
      ...curr,
      [symbol]: sanitized,
    }));
  }

  adjustTarget(symbol: string, delta: number): void {
    const curVal = this.targetAllocations()[symbol] ?? 0;
    this.updateTarget(symbol, curVal + delta);
  }

  /** Quick Presets */
  applyEqualWeight(group: AssetClassRebalanceGroup): void {
    const syms = group.symbols.map((s) => s.symbol);
    const equal = getEqualWeightsForClass(syms);
    this.targetAllocations.update((curr) => ({
      ...curr,
      ...equal,
    }));
  }

  applyCurrentWeight(group: AssetClassRebalanceGroup): void {
    const current = getCurrentWeightsForClass(group.symbols);
    this.targetAllocations.update((curr) => ({
      ...curr,
      ...current,
    }));
  }

  normalizeGroup(group: AssetClassRebalanceGroup): void {
    const syms = group.symbols.map((s) => s.symbol);
    const normalized = normalizeWeightsTo100(this.targetAllocations(), syms);
    this.targetAllocations.update((curr) => ({
      ...curr,
      ...normalized,
    }));
  }

  resetGroup(group: AssetClassRebalanceGroup): void {
    this.applyEqualWeight(group);
  }

  toggleOrdersExpanded(): void {
    this.isOrdersExpanded.update((v) => !v);
  }

  copyOrdersToClipboard(): void {
    const orders = this.orders();
    if (!orders || orders.length === 0) return;

    const lines = [
      `SGSK Portfolio Rebalance Plan (${new Date().toLocaleDateString()})`,
      `Mode: ${this.mode() === 'standard' ? 'Standard (Buy & Sell)' : 'No-Sell Contribution'}`,
      `Currency: ${this.displayCurrency()}`,
      '--------------------------------------------------',
      ...orders.map(
        (o, idx) =>
          `${idx + 1}. ${o.action} ${o.shares.toFixed(4)} ${o.symbol} @ ${o.price.toFixed(2)} ${o.currency} (~${o.amount.toFixed(2)} ${o.currency})`
      ),
      '--------------------------------------------------',
      `Total Buy: ${this.filteredBuyAmount().toFixed(2)} ${this.displayCurrency()}`,
      `Total Sell: ${this.filteredSellAmount().toFixed(2)} ${this.displayCurrency()}`,
      `Net Cash: ${(this.filteredBuyAmount() - this.filteredSellAmount()).toFixed(2)} ${this.displayCurrency()}`,
    ];


    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        this.isCopiedOrders.set(true);
        setTimeout(() => this.isCopiedOrders.set(false), 2500);
      });
    }
  }

  getSymbolColor = getSymbolColor;
  getDisplaySymbol = displaySymbol;
  getAssetColor = getAssetColor;
  getAssetTypeLabel = getAssetTypeLabel;

  cx(amount: number, fromCurrency: string): number {
    return convertCurrency(amount, fromCurrency, this.displayCurrency(), this.exchangeRate());
  }
}
