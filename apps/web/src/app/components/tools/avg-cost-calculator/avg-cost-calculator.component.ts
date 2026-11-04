import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioPosition } from '../../../models/portfolio.model';
import { PriceData } from '../../../services/price.service';
import {
  AvgCostSimulationResult,
  PositionSnapshot,
  SimulatedStep,
  SimulationAction,
  TargetAvgCostGoalResult,
} from '../../../models/tools.model';
import {
  simulateAvgCost,
  solveTargetAvgCostGoal,
  getQuickAdjustedPrice,
} from '../../../utils/calculator.utils';
import {
  displaySymbol,
  getAssetType,
  getAssetTypeClass,
  getAssetTypeLabel,
  getPriceFormat,
  getQuantityFormat,
  getSymbolColor,
  resolveSymbolName,
  convertCurrency,
} from '../../../utils/format.utils';

export interface SymbolOption {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  currency: string;
  totalShares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  color: string;
}

import { SymbolIconComponent } from '../../symbol-icon/symbol-icon.component';

@Component({
  selector: 'app-avg-cost-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, FormsModule, SymbolIconComponent],
  templateUrl: './avg-cost-calculator.component.html',
  styleUrls: ['./avg-cost-calculator.component.css'],
})
export class AvgCostCalculatorComponent {
  portfolioPositions = input.required<PortfolioPosition[]>();
  pricesMap = input.required<Map<string, PriceData>>();
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();
  privacyMode = input<boolean>(false);
  initialSymbol = input<string>('');

  symbolChange = output<string>();
  simulationChange = output<AvgCostSimulationResult | null>();

  /** Current active calculation mode */
  readonly mode = signal<'forward' | 'reverse'>('forward');

  /** Symbol Selection & Custom Symbol state */
  readonly selectedSymbol = signal<string>('');
  readonly isCustomMode = signal<boolean>(false);
  readonly symbolSearchQuery = signal<string>('');
  readonly isDropdownOpen = signal<boolean>(false);

  /** Custom Position Inputs (when user enters un-owned stock/crypto) */
  readonly customSymbol = signal<string>('CUSTOM');
  readonly customAssetType = signal<string>('us-stock');
  readonly customCurrency = signal<string>('USD');
  readonly customShares = signal<number>(100);
  readonly customAvgCost = signal<number>(150);
  readonly customMarketPrice = signal<number>(140);

  /** Forward Simulation Form Controls */
  readonly currentAction = signal<SimulationAction>('BUY');
  readonly inputMode = signal<'shares' | 'amount'>('shares');
  readonly inputShares = signal<number>(0);
  readonly inputAmount = signal<number>(0);
  readonly inputPrice = signal<number>(0);
  readonly inputFeePercent = signal<number>(0);

  /** Queued Simulation Steps for Multi-Step Chains */
  readonly queuedSteps = signal<SimulatedStep[]>([]);

  /** Calculation State */
  readonly isCalculating = signal<boolean>(false);
  readonly lastCalculatedTime = signal<string>('Just now');

  /** Reverse Target Cost Goal Inputs */
  readonly targetAvgCost = signal<number>(0);
  readonly targetBuyPrice = signal<number>(0);
  readonly targetFeePercent = signal<number>(0);

  readonly hasSelectedSymbol = computed<boolean>(() => {
    return Boolean(this.selectedSymbol()) || this.isCustomMode();
  });

  private prevCurrency: string | null = null;

  constructor() {
    // Sync initial symbol if provided
    effect(() => {
      const initSym = this.initialSymbol();
      if (initSym && !this.selectedSymbol()) {
        this.selectSymbol(initSym);
      }
    });

    // Automatically emit simulation updates when a symbol is selected
    effect(() => {
      if (this.hasSelectedSymbol()) {
        const sim = this.simulationResult();
        this.simulationChange.emit(sim);
      } else {
        this.simulationChange.emit(null);
      }
    });

    // Update input price and targets only when displayCurrency actually switches
    effect(() => {
      const curr = this.displayCurrency();
      if (this.prevCurrency && this.prevCurrency !== curr) {
        this.prevCurrency = curr;
        const sym = this.selectedSymbol();
        if (sym && !this.isCustomMode()) {
          const pos = this.portfolioPositions().find((p) => p.symbol === sym);
          if (pos) {
            const pm = this.pricesMap();
            const pd = pm.get(sym);
            const mktPrice = pd && pd.price > 0 ? pd.price : pos.currentPrice || pos.averageCost;
            const mktCurr = pd?.currency || pos.currency;
            const convMktPrice = this.toDisplayCurrency(mktPrice, mktCurr);
            const convAvgCost = this.toDisplayCurrency(pos.averageCost, pos.currency);

            this.inputPrice.set(parseFloat(convMktPrice.toFixed(4)));
            this.inputAmount.set(parseFloat((this.inputShares() * convMktPrice).toFixed(2)));
            this.targetBuyPrice.set(parseFloat((convMktPrice * 0.95).toFixed(4)));
            this.targetAvgCost.set(parseFloat((convAvgCost * 0.9).toFixed(4)));
          }
        }
      } else {
        this.prevCurrency = curr;
      }
    });
  }

  toDisplayCurrency(amount: number, fromCurrency?: string): number {
    if (!amount || amount === 0) return 0;
    const target = this.displayCurrency();
    const orig = (fromCurrency || target).toUpperCase() === 'USDT' ? 'USD' : (fromCurrency || target).toUpperCase();
    if (orig === target) return amount;
    if (!this.hasRate() || this.exchangeRate() <= 0) return amount;
    return convertCurrency(amount, orig, target, this.exchangeRate());
  }

  readonly availableSymbols = computed<SymbolOption[]>(() => {
    const positions = this.portfolioPositions();
    const pm = this.pricesMap();

    return positions.map((p) => {
      const pd = pm.get(p.symbol);
      const mktPrice = pd && pd.price > 0 ? pd.price : p.currentPrice || 0;
      const mktCurr = pd?.currency || p.currency;
      return {
        symbol: p.symbol,
        displaySymbol: p.displaySymbol || displaySymbol(p.symbol),
        name: p.name || resolveSymbolName(p.symbol, pm),
        assetType: p.assetType,
        assetTypeLabel: p.assetTypeLabel || getAssetTypeLabel(p.assetType, p.symbol),
        currency: this.displayCurrency(),
        totalShares: p.totalShares,
        averageCost: this.toDisplayCurrency(p.averageCost, p.currency),
        totalCost: this.toDisplayCurrency(p.totalCost, p.currency),
        currentPrice: this.toDisplayCurrency(mktPrice, mktCurr),
        color: getSymbolColor(p.symbol),
      };
    });
  });

  readonly filteredSymbolOptions = computed<SymbolOption[]>(() => {
    const q = this.symbolSearchQuery().trim().toUpperCase();
    const list = this.availableSymbols();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.symbol.toUpperCase().includes(q) ||
        s.displaySymbol.toUpperCase().includes(q) ||
        s.name.toUpperCase().includes(q) ||
        s.assetTypeLabel.toUpperCase().includes(q)
    );
  });

  readonly selectedPosition = computed<PortfolioPosition | null>(() => {
    const sym = this.selectedSymbol();
    if (!sym || this.isCustomMode()) return null;
    return this.portfolioPositions().find((p) => p.symbol === sym) || null;
  });

  /** Snapshot of current initial position */
  readonly positionSnapshot = computed<PositionSnapshot>(() => {
    if (this.isCustomMode()) {
      const shares = Math.max(0, this.customShares());
      const avgCost = Math.max(0, this.customAvgCost());
      const mktPrice = Math.max(0, this.customMarketPrice());
      const totalCost = shares * avgCost;
      const holdingValue = shares * mktPrice;
      const unPL = holdingValue - totalCost;
      const unPLPct = totalCost > 0 ? (unPL / totalCost) * 100 : 0;
      const sym = this.customSymbol().trim().toUpperCase() || 'CUSTOM';

      return {
        symbol: sym,
        displaySymbol: sym,
        name: `Custom Simulation (${sym})`,
        assetType: this.customAssetType(),
        assetTypeLabel: getAssetTypeLabel(this.customAssetType()),
        currency: this.customCurrency(),
        totalShares: shares,
        averageCost: avgCost,
        totalCost: totalCost,
        currentPrice: mktPrice,
        holdingValue: holdingValue,
        unrealizedPL: unPL,
        unrealizedPLPercent: unPLPct,
        hasPrice: mktPrice > 0,
      };
    }

    const pos = this.selectedPosition();
    if (!pos || !this.hasSelectedSymbol()) {
      return {
        symbol: 'NONE',
        displaySymbol: 'Select symbol',
        name: 'No position selected',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: this.displayCurrency(),
        totalShares: 0,
        averageCost: 0,
        totalCost: 0,
        currentPrice: 0,
        holdingValue: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        hasPrice: false,
      };
    }

    const pm = this.pricesMap();
    const pd = pm.get(pos.symbol);
    const mktPrice = pd && pd.price > 0 ? pd.price : pos.currentPrice || 0;
    const mktCurr = pd?.currency || pos.currency;
    const convMktPrice = this.toDisplayCurrency(mktPrice, mktCurr);
    const convAvgCost = this.toDisplayCurrency(pos.averageCost, pos.currency);
    const convTotalCost = this.toDisplayCurrency(pos.totalCost, pos.currency);
    const holdingVal = pos.totalShares * convMktPrice;
    const unPL = holdingVal - convTotalCost;
    const unPLPct = convTotalCost > 0 ? (unPL / convTotalCost) * 100 : 0;

    return {
      symbol: pos.symbol,
      displaySymbol: pos.displaySymbol || displaySymbol(pos.symbol),
      name: pos.name || resolveSymbolName(pos.symbol, pm),
      assetType: pos.assetType,
      assetTypeLabel: pos.assetTypeLabel || getAssetTypeLabel(pos.assetType, pos.symbol),
      currency: this.displayCurrency(),
      totalShares: pos.totalShares,
      averageCost: convAvgCost,
      totalCost: convTotalCost,
      currentPrice: convMktPrice,
      holdingValue: holdingVal,
      unrealizedPL: unPL,
      unrealizedPLPercent: unPLPct,
      hasPrice: convMktPrice > 0,
    };
  });

  /** Active steps combined: queued steps + current interactive form step (if non-zero) */
  readonly effectiveSteps = computed<SimulatedStep[]>(() => {
    const queued = [...this.queuedSteps()];
    const curShares = this.inputShares();
    const curPrice = this.inputPrice();
    const curFee = this.inputFeePercent();

    if (curShares > 0 && curPrice > 0) {
      const gross = curShares * curPrice;
      const feeAmount = gross * (curFee / 100);
      const totalCost = this.currentAction() === 'BUY' ? gross + feeAmount : gross - feeAmount;

      queued.push({
        id: 'active-input-step',
        action: this.currentAction(),
        shares: curShares,
        price: curPrice,
        feePercent: curFee,
        feeAmount,
        totalCost,
      });
    }

    return queued;
  });

  /** Forward Simulation Result */
  readonly simulationResult = computed<AvgCostSimulationResult>(() => {
    const snapshot = this.positionSnapshot();
    const steps = this.effectiveSteps();
    return simulateAvgCost(snapshot, steps);
  });

  /** Reverse Target Cost Goal Result */
  readonly reverseGoalResult = computed<TargetAvgCostGoalResult>(() => {
    const snapshot = this.positionSnapshot();
    return solveTargetAvgCostGoal({
      currentShares: snapshot.totalShares,
      currentAvgCost: snapshot.averageCost,
      targetAvgCost: this.targetAvgCost(),
      purchasePrice: this.targetBuyPrice(),
      feePercent: this.targetFeePercent(),
    });
  });

  /** Visual Shift Percentage for Bar Indicator */
  readonly costShiftBarPercent = computed<number>(() => {
    const res = this.simulationResult();
    const initAvg = res.initial.averageCost;
    const simAvg = res.simulated.averageCost;
    if (initAvg <= 0 || simAvg <= 0) return 50;

    const maxVal = Math.max(initAvg, simAvg) * 1.15;
    return Math.min(100, Math.max(5, (simAvg / maxVal) * 100));
  });

  selectSymbol(symbol: string): void {
    this.selectedSymbol.set(symbol);
    this.isCustomMode.set(false);
    this.isDropdownOpen.set(false);
    this.symbolChange.emit(symbol);

    const pos = this.portfolioPositions().find((p) => p.symbol === symbol);
    if (pos) {
      const pm = this.pricesMap();
      const pd = pm.get(symbol);
      const mktPrice = pd && pd.price > 0 ? pd.price : pos.currentPrice || pos.averageCost;
      const mktCurr = pd?.currency || pos.currency;

      const convMktPrice = this.toDisplayCurrency(mktPrice, mktCurr);
      const convAvgCost = this.toDisplayCurrency(pos.averageCost, pos.currency);

      // Suggest default simulation parameters
      const defaultPrice = parseFloat(convMktPrice.toFixed(4));
      const defaultShares = Math.max(1, Math.round(pos.totalShares * 0.25));
      this.inputPrice.set(defaultPrice);
      this.inputShares.set(defaultShares);
      this.inputAmount.set(parseFloat((defaultShares * defaultPrice).toFixed(2)));

      // Default fee for Thai stocks is ~0.157%, 0% for US/crypto
      const assetType = getAssetType(pos.assetType, symbol);
      this.inputFeePercent.set(assetType === 'thai-stock' ? 0.157 : 0);

      // Reverse solver defaults
      this.targetAvgCost.set(parseFloat((convAvgCost * 0.9).toFixed(4)));
      this.targetBuyPrice.set(parseFloat((convMktPrice * 0.95).toFixed(4)));
      this.targetFeePercent.set(assetType === 'thai-stock' ? 0.157 : 0);
    }
  }

  enableCustomMode(): void {
    this.isCustomMode.set(true);
    this.selectedSymbol.set('CUSTOM');
    this.isDropdownOpen.set(false);
    this.symbolChange.emit('CUSTOM');

    const defaultPrice = this.customMarketPrice();
    const defaultShares = Math.round(this.customShares() * 0.25);
    this.inputPrice.set(defaultPrice);
    this.inputShares.set(defaultShares);
    this.inputAmount.set(parseFloat((defaultShares * defaultPrice).toFixed(2)));
    this.targetAvgCost.set(parseFloat((this.customAvgCost() * 0.9).toFixed(4)));
    this.targetBuyPrice.set(parseFloat((this.customMarketPrice() * 0.95).toFixed(4)));
  }

  setInputMode(mode: 'shares' | 'amount'): void {
    this.inputMode.set(mode);
    const price = this.inputPrice();
    if (mode === 'amount') {
      this.inputAmount.set(price > 0 ? parseFloat((this.inputShares() * price).toFixed(2)) : 0);
    } else {
      this.inputShares.set(price > 0 ? parseFloat((this.inputAmount() / price).toFixed(4)) : 0);
    }
  }

  onSharesInput(shares: number): void {
    this.inputShares.set(shares);
    const price = this.inputPrice();
    this.inputAmount.set(price > 0 ? parseFloat((shares * price).toFixed(2)) : 0);
  }

  onAmountInput(amount: number): void {
    this.inputAmount.set(amount);
    const price = this.inputPrice();
    if (price > 0) {
      const sh = amount / price;
      this.inputShares.set(parseFloat(sh.toFixed(4)));
    } else {
      this.inputShares.set(0);
    }
  }

  onPriceInput(price: number): void {
    this.inputPrice.set(price);
    if (this.inputMode() === 'amount') {
      this.inputShares.set(price > 0 ? parseFloat((this.inputAmount() / price).toFixed(4)) : 0);
    } else {
      this.inputAmount.set(parseFloat((this.inputShares() * price).toFixed(2)));
    }
  }

  setAction(action: SimulationAction): void {
    this.currentAction.set(action);
  }

  applyShareMultiplier(multiplier: number): void {
    const snapshot = this.positionSnapshot();
    const baseShares = snapshot.totalShares > 0 ? snapshot.totalShares : 100;
    const shares = Math.max(1, Math.round(baseShares * multiplier));
    this.onSharesInput(shares);
  }

  applyMaxSellShares(): void {
    const snapshot = this.positionSnapshot();
    this.onSharesInput(Math.max(0, snapshot.totalShares));
  }

  applyAmountAddition(amount: number): void {
    this.onAmountInput(amount);
  }

  applyAmountMultiplier(multiplier: number): void {
    const snapshot = this.positionSnapshot();
    const baseVal =
      snapshot.holdingValue > 0
        ? snapshot.holdingValue
        : snapshot.totalCost > 0
        ? snapshot.totalCost
        : 10000;
    const amt = Math.max(0, baseVal * multiplier);
    this.onAmountInput(parseFloat(amt.toFixed(2)));
  }

  applyMaxSellAmount(): void {
    const snapshot = this.positionSnapshot();
    const price = this.inputPrice() > 0 ? this.inputPrice() : snapshot.currentPrice;
    const maxVal = snapshot.totalShares * price;
    this.onAmountInput(parseFloat(maxVal.toFixed(2)));
  }

  applyPriceQuickDip(percentChange: number): void {
    const basePrice = this.positionSnapshot().currentPrice || this.inputPrice();
    const adjusted = getQuickAdjustedPrice(basePrice, percentChange);
    this.onPriceInput(adjusted);
  }

  applyMarketPrice(): void {
    const mkt = this.positionSnapshot().currentPrice;
    if (mkt > 0) {
      this.onPriceInput(parseFloat(mkt.toFixed(4)));
    }
  }

  addStepToQueue(): void {
    const curShares = this.inputShares();
    const curPrice = this.inputPrice();
    const curFee = this.inputFeePercent();

    if (curShares <= 0 || curPrice <= 0) return;

    const gross = curShares * curPrice;
    const feeAmount = gross * (curFee / 100);
    const totalCost = this.currentAction() === 'BUY' ? gross + feeAmount : gross - feeAmount;

    const newStep: SimulatedStep = {
      id: 'step-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      action: this.currentAction(),
      shares: curShares,
      price: curPrice,
      feePercent: curFee,
      feeAmount,
      totalCost,
    };

    this.queuedSteps.update((steps) => [...steps, newStep]);
    // Reset active input shares to 0 or default
    this.inputShares.set(0);
  }

  removeQueuedStep(stepId: string): void {
    this.queuedSteps.update((steps) => steps.filter((s) => s.id !== stepId));
  }

  clearAllSteps(): void {
    this.queuedSteps.set([]);
    this.inputShares.set(50);
  }

  calculate(): void {
    this.isCalculating.set(true);

    if (this.inputMode() === 'amount') {
      this.onAmountInput(this.inputAmount());
    } else {
      this.onSharesInput(this.inputShares());
    }

    setTimeout(() => {
      this.isCalculating.set(false);
      this.lastCalculatedTime.set(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      this.simulationChange.emit(this.simulationResult());
    }, 200);
  }

  applyReverseGoalToSimulation(): void {
    const goal = this.reverseGoalResult();
    if (!goal.isValid || goal.requiredShares <= 0) return;

    this.mode.set('forward');
    this.currentAction.set('BUY');
    this.inputShares.set(parseFloat(goal.requiredShares.toFixed(4)));
    this.inputPrice.set(this.targetBuyPrice());
    this.inputFeePercent.set(this.targetFeePercent());
    this.calculate();
  }

  /** Helpers for formatting & symbols */
  getSymbolColor = getSymbolColor;
  getDisplaySymbol = displaySymbol;
  getAssetTypeClass = getAssetTypeClass;
  getAssetTypeLabel = getAssetTypeLabel;
  getQuantityFormat = getQuantityFormat;
  getPriceFormat = getPriceFormat;

  cx(amount: number, currency: string): number {
    return convertCurrency(amount, currency, this.displayCurrency(), this.exchangeRate());
  }
}
