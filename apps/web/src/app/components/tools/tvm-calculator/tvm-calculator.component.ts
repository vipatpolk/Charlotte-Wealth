import {
  Component,
  input,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioPosition, PortfolioSummary } from '../../../models/portfolio.model';
import {
  CompoundingFrequency,
  PaymentTiming,
  TvmCalculationResult,
  TvmSolveMode,
} from '../../../models/tools.model';
import { KNOWN_ASSET_TYPES } from '../../../config/asset.constants';
import {
  calculateTVM,
  COMPOUNDING_FREQUENCIES,
  getCompoundingFrequencyLabel,
} from '../../../utils/tvm-calculator.utils';
import {
  convertCurrency,
  getAssetColor,
  getAssetType,
  getAssetTypeLabel,
} from '../../../utils/format.utils';

export type PvSourceMode = 'portfolio' | 'invested' | 'custom';

export interface AssetTypeOption {
  id: string;
  label: string;
  color: string;
  holdingValue: number;
  investedCost: number;
  count: number;
}

export interface ChartPoint {
  year: number;
  x: number;
  yBalance: number;
  yInvested: number;
  balance: number;
  invested: number;
  interest: number;
  multiplier: number;
}

export interface GridLine {
  y: number;
  value: number;
  label: string;
}

export interface XAxisTick {
  x: number;
  year: number;
  label: string;
}

export interface TvmGrowthChartData {
  points: ChartPoint[];
  maxVal: number;
  pathTotalBalance: string;
  pathTotalBalanceArea: string;
  pathInvestedCapital: string;
  pathInvestedCapitalArea: string;
  gridLines: GridLine[];
  xTicks: XAxisTick[];
  svgWidth: number;
  svgHeight: number;
  padBottom: number;
}

@Component({
  selector: 'app-tvm-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './tvm-calculator.component.html',
  styleUrls: ['./tvm-calculator.component.css'],
})
export class TvmCalculatorComponent {
  portfolioPositions = input<PortfolioPosition[]>([]);
  portfolioSummary = input<PortfolioSummary | null>(null);
  displayCurrency = input.required<'USD' | 'THB'>();
  exchangeRate = input.required<number>();
  hasRate = input.required<boolean>();
  privacyMode = input<boolean>(false);

  /** Active Solve-For Mode */
  readonly solveMode = signal<TvmSolveMode>('FV');

  /** Present Value Source & Inputs */
  readonly pvSource = signal<PvSourceMode>('portfolio');
  readonly selectedAssetTypes = signal<Set<string>>(new Set(['all']));
  readonly customPresentValue = signal<number>(100000);

  /** TVM Parameters */
  readonly payment = signal<number>(10000);
  readonly paymentTiming = signal<PaymentTiming>('end');
  readonly annualRatePct = signal<number>(8.0);
  readonly years = signal<number>(10);
  readonly compounding = signal<CompoundingFrequency>('monthly');
  readonly targetFutureValue = signal<number>(1000000);

  /** UI Controls */
  readonly isCompoundingDropdownOpen = signal<boolean>(false);
  readonly isScheduleExpanded = signal<boolean>(false);
  readonly compoundingOptions = COMPOUNDING_FREQUENCIES;

  /** Convert an amount to current display currency (USD / THB) */
  private toDisplayCurrency(amount: number, fromCurrency?: string): number {
    if (!amount || amount === 0) return 0;
    const target = this.displayCurrency();
    const orig = (fromCurrency || target).toUpperCase() === 'USDT' ? 'USD' : (fromCurrency || target).toUpperCase();
    if (orig === target) return amount;
    if (!this.hasRate() || this.exchangeRate() <= 0) return amount;
    return convertCurrency(amount, orig, target, this.exchangeRate());
  }

  /** Summarized Portfolio Values */
  readonly portfolioMarketValue = computed<number>(() => {
    const summary = this.portfolioSummary();
    const positions = this.portfolioPositions();
    const serverCurr = positions[0]?.currency || 'THB';
    if (summary && summary.totalValue > 0) {
      return this.toDisplayCurrency(summary.totalValue, serverCurr);
    }
    if (positions && positions.length > 0) {
      return positions.reduce((acc, p) => acc + this.toDisplayCurrency(p.holdingValue || p.totalCost || 0, p.currency), 0);
    }
    return 0;
  });

  readonly portfolioInvestedCost = computed<number>(() => {
    const summary = this.portfolioSummary();
    const positions = this.portfolioPositions();
    const serverCurr = positions[0]?.currency || 'THB';
    if (summary && typeof summary.openInvested === 'number' && summary.openInvested > 0) {
      return this.toDisplayCurrency(summary.openInvested, serverCurr);
    }
    if (positions && positions.length > 0) {
      return positions.reduce((acc, p) => acc + this.toDisplayCurrency(p.totalCost || 0, p.currency), 0);
    }
    if (summary && typeof summary.totalInvested === 'number' && summary.totalInvested > 0) {
      return this.toDisplayCurrency(summary.totalInvested, serverCurr);
    }
    return 0;
  });

  /** Distinct Asset Types Available in Portfolio with Aggregated Values */
  readonly assetTypeOptions = computed<AssetTypeOption[]>(() => {
    const positions = this.portfolioPositions();
    if (!positions || positions.length === 0) {
      return [];
    }

    const typeMap = new Map<string, { holdingValue: number; investedCost: number; count: number }>();

    for (const p of positions) {
      const typeKey = getAssetType(p.assetType, p.symbol);
      const cur = typeMap.get(typeKey) || { holdingValue: 0, investedCost: 0, count: 0 };
      cur.holdingValue += this.toDisplayCurrency(p.holdingValue || p.totalCost || 0, p.currency);
      cur.investedCost += this.toDisplayCurrency(p.totalCost || 0, p.currency);
      cur.count += 1;
      typeMap.set(typeKey, cur);
    }

    const order = KNOWN_ASSET_TYPES;
    const result: AssetTypeOption[] = [];

    // Add ordered known asset types
    for (const typeKey of order) {
      const data = typeMap.get(typeKey);
      if (data) {
        result.push({
          id: typeKey,
          label: getAssetTypeLabel(typeKey),
          color: getAssetColor(typeKey),
          holdingValue: data.holdingValue,
          investedCost: data.investedCost,
          count: data.count,
        });
        typeMap.delete(typeKey);
      }
    }

    // Add any other custom asset types found
    for (const [typeKey, data] of typeMap.entries()) {
      result.push({
        id: typeKey,
        label: getAssetTypeLabel(typeKey),
        color: getAssetColor(typeKey),
        holdingValue: data.holdingValue,
        investedCost: data.investedCost,
        count: data.count,
      });
    }

    return result;
  });

  /** Summarized Value based on selected asset type filters */
  readonly selectedAssetTypesValue = computed<number>(() => {
    const selected = this.selectedAssetTypes();
    const source = this.pvSource();
    const positions = this.portfolioPositions();

    if (!positions || positions.length === 0) {
      return source === 'invested' ? this.portfolioInvestedCost() : this.portfolioMarketValue();
    }

    if (selected.has('all')) {
      return source === 'invested' ? this.portfolioInvestedCost() : this.portfolioMarketValue();
    }

    let sum = 0;
    for (const p of positions) {
      const typeKey = getAssetType(p.assetType, p.symbol);
      if (selected.has(typeKey)) {
        const val = source === 'invested' ? (p.totalCost || 0) : (p.holdingValue || p.totalCost || 0);
        sum += this.toDisplayCurrency(val, p.currency);
      }
    }
    return sum;
  });

  /** Effective Present Value based on user selection */
  readonly effectivePresentValue = computed<number>(() => {
    const source = this.pvSource();
    if (source === 'custom') {
      return Math.max(0, this.customPresentValue());
    }

    const assetVal = this.selectedAssetTypesValue();
    return assetVal > 0 ? assetVal : this.customPresentValue();
  });

  /** Human-readable description of the active PV source */
  readonly pvSourceDescription = computed<string>(() => {
    const source = this.pvSource();
    if (source === 'custom') {
      return 'Custom manual value';
    }

    const selected = this.selectedAssetTypes();
    const basisLabel = source === 'invested' ? 'Invested Cost' : 'Market Value';

    if (selected.has('all')) {
      return `All Portfolio Assets (${basisLabel})`;
    }

    const labels = Array.from(selected).map((t) => getAssetTypeLabel(t));
    return `${labels.join(' + ')} (${basisLabel})`;
  });

  /** Master Reactive TVM Calculation Result */
  readonly calculationResult = computed<TvmCalculationResult>(() => {
    return calculateTVM({
      mode: this.solveMode(),
      presentValue: this.effectivePresentValue(),
      payment: Math.max(0, this.payment()),
      annualRatePct: Math.max(0, this.annualRatePct()),
      years: Math.max(0, this.years()),
      compounding: this.compounding(),
      timing: this.paymentTiming(),
      targetFutureValue: Math.max(0, this.targetFutureValue()),
    });
  });

  /** Chart / Breakdown Bar Percentages */
  readonly principalPercent = computed<number>(() => {
    const res = this.calculationResult();
    if (!res || res.futureValue <= 0) return 0;
    return Math.min(100, Math.max(0, (res.totalPrincipal / res.futureValue) * 100));
  });

  readonly contributionsPercent = computed<number>(() => {
    const res = this.calculationResult();
    if (!res || res.futureValue <= 0) return 0;
    return Math.min(100, Math.max(0, (res.totalContributions / res.futureValue) * 100));
  });

  readonly interestPercent = computed<number>(() => {
    const res = this.calculationResult();
    if (!res || res.futureValue <= 0) return 0;
    return Math.min(100, Math.max(0, (res.totalInterestEarned / res.futureValue) * 100));
  });

  readonly activeCompoundingLabel = computed<string>(() => {
    return getCompoundingFrequencyLabel(this.compounding());
  });

  /** Chart Hover & View Mode Signals */
  readonly hoveredPoint = signal<ChartPoint | null>(null);
  readonly isAreaChartMode = signal<boolean>(true);

  /** Master Year-by-Year Growth Chart Data & SVG Coordinate Paths */
  readonly growthChartData = computed<TvmGrowthChartData>(() => {
    const res = this.calculationResult();
    const schedule = res.schedule || [];
    const svgWidth = 800;
    const svgHeight = 240;
    const padLeft = 65;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;
    const baseY = padTop + plotHeight;

    if (!res.isValid || schedule.length === 0 || res.years <= 0) {
      return {
        points: [],
        maxVal: 0,
        pathTotalBalance: '',
        pathTotalBalanceArea: '',
        pathInvestedCapital: '',
        pathInvestedCapitalArea: '',
        gridLines: [],
        xTicks: [],
        svgWidth,
        svgHeight,
        padBottom,
      };
    }

    const numYears = schedule.length;
    const maxVal = Math.max(1, res.futureValue, res.totalInvested) * 1.08;

    const scaleX = (yr: number) => padLeft + (yr / numYears) * plotWidth;
    const scaleY = (val: number) => baseY - (Math.max(0, val) / maxVal) * plotHeight;

    const points: ChartPoint[] = [];

    // Year 0 (Start)
    const p0Balance = res.presentValue;
    const p0Invested = res.presentValue;
    points.push({
      year: 0,
      x: scaleX(0),
      yBalance: scaleY(p0Balance),
      yInvested: scaleY(p0Invested),
      balance: p0Balance,
      invested: p0Invested,
      interest: 0,
      multiplier: 1.0,
    });

    // Years 1..N
    for (const entry of schedule) {
      const balance = entry.endBalance;
      const invested = entry.totalContributionsToDate;
      const interest = Math.max(0, balance - invested);
      const mult = invested > 0 ? balance / invested : 1.0;

      points.push({
        year: entry.year,
        x: scaleX(entry.year),
        yBalance: scaleY(balance),
        yInvested: scaleY(invested),
        balance,
        invested,
        interest,
        multiplier: mult,
      });
    }

    // SVG Line & Area Paths
    const pathTotalBalance = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.yBalance.toFixed(1)}`)
      .join(' ');

    const lastPt = points[points.length - 1];
    const firstPt = points[0];

    const pathTotalBalanceArea = `${pathTotalBalance} L ${lastPt.x.toFixed(1)},${baseY.toFixed(1)} L ${firstPt.x.toFixed(1)},${baseY.toFixed(1)} Z`;

    const pathInvestedCapital = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.yInvested.toFixed(1)}`)
      .join(' ');

    const pathInvestedCapitalArea = `${pathInvestedCapital} L ${lastPt.x.toFixed(1)},${baseY.toFixed(1)} L ${firstPt.x.toFixed(1)},${baseY.toFixed(1)} Z`;

    // Horizontal Y Grid Lines
    const gridLines: GridLine[] = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
      const val = maxVal * pct;
      return {
        y: scaleY(val),
        value: val,
        label: this.formatCompactCurrency(val),
      };
    });

    // X Axis Ticks
    let tickStep = 1;
    if (numYears > 30) tickStep = 5;
    else if (numYears > 15) tickStep = 5;
    else if (numYears > 8) tickStep = 2;

    const xTicks: XAxisTick[] = [];
    for (let yr = 0; yr <= numYears; yr += tickStep) {
      xTicks.push({
        x: scaleX(yr),
        year: yr,
        label: yr === 0 ? 'Start' : `Yr ${yr}`,
      });
    }
    if (xTicks[xTicks.length - 1].year !== numYears) {
      xTicks.push({
        x: scaleX(numYears),
        year: numYears,
        label: `Yr ${numYears}`,
      });
    }

    return {
      points,
      maxVal,
      pathTotalBalance,
      pathTotalBalanceArea,
      pathInvestedCapital,
      pathInvestedCapitalArea,
      gridLines,
      xTicks,
      svgWidth,
      svgHeight,
      padBottom,
    };
  });

  private formatCompactCurrency(val: number): string {
    if (val <= 0) return '0';
    if (val >= 1e6) {
      return (val / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (val >= 1e3) {
      return (val / 1e3).toFixed(0) + 'k';
    }
    return val.toFixed(0);
  }

  setHoveredPoint(pt: ChartPoint | null): void {
    this.hoveredPoint.set(pt);
  }

  toggleAreaChartMode(): void {
    this.isAreaChartMode.update((v) => !v);
  }

  constructor() {
    // When portfolio value becomes available and user is in portfolio source mode,
    // sync custom present value as default baseline
    effect(() => {
      const mktVal = this.portfolioMarketValue();
      if (mktVal > 0 && this.customPresentValue() === 100000) {
        this.customPresentValue.set(Math.round(mktVal));
      }
    });
  }

  setSolveMode(mode: TvmSolveMode): void {
    this.solveMode.set(mode);
  }

  setPvSource(source: PvSourceMode): void {
    this.pvSource.set(source);
    if (source === 'portfolio' && this.portfolioMarketValue() > 0) {
      this.customPresentValue.set(Math.round(this.selectedAssetTypesValue() || this.portfolioMarketValue()));
    } else if (source === 'invested' && this.portfolioInvestedCost() > 0) {
      this.customPresentValue.set(Math.round(this.selectedAssetTypesValue() || this.portfolioInvestedCost()));
    }
  }

  toggleAssetType(typeId: string): void {
    if (typeId === 'all') {
      this.selectedAssetTypes.set(new Set(['all']));
      if (this.pvSource() === 'custom') {
        this.pvSource.set('portfolio');
      }
      return;
    }

    this.selectedAssetTypes.update((current) => {
      const next = new Set(current);
      if (next.has('all')) {
        next.clear();
        next.add(typeId);
      } else if (next.has(typeId)) {
        next.delete(typeId);
        if (next.size === 0) {
          next.add('all');
        }
      } else {
        next.add(typeId);
      }
      return next;
    });

    if (this.pvSource() === 'custom') {
      this.pvSource.set('portfolio');
    }
  }

  isAssetTypeSelected(typeId: string): boolean {
    return this.selectedAssetTypes().has(typeId);
  }

  setCompounding(frequency: CompoundingFrequency): void {
    this.compounding.set(frequency);
    this.isCompoundingDropdownOpen.set(false);
  }

  setPaymentTiming(timing: PaymentTiming): void {
    this.paymentTiming.set(timing);
  }

  setAnnualRate(rate: number): void {
    this.annualRatePct.set(rate);
  }

  setYears(years: number): void {
    this.years.set(years);
  }

  adjustPresentValue(delta: number): void {
    this.pvSource.set('custom');
    this.customPresentValue.update((v) => Math.max(0, v + delta));
  }

  adjustPayment(delta: number): void {
    this.payment.update((v) => Math.max(0, v + delta));
  }

  adjustAnnualRate(delta: number): void {
    this.annualRatePct.update((v) => Math.max(0, parseFloat((v + delta).toFixed(2))));
  }

  adjustYears(delta: number): void {
    this.years.update((v) => Math.max(1, v + delta));
  }

  adjustTargetFv(delta: number): void {
    this.targetFutureValue.update((v) => Math.max(0, v + delta));
  }

  toggleSchedule(): void {
    this.isScheduleExpanded.update((v) => !v);
  }

  toggleCompoundingDropdown(): void {
    this.isCompoundingDropdownOpen.update((v) => !v);
  }

  closeCompoundingDropdown(): void {
    this.isCompoundingDropdownOpen.set(false);
  }
}
