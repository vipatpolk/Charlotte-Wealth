import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClassRebalanceGroupModel,
  CompoundingFrequency,
  PositionSnapshotModel,
  RebalanceAction,
  RebalanceCalculateRequest,
  RebalanceCalculateResponse,
  RebalanceTradeOrderModel,
  SimulateOrderRequest,
  SimulateOrderResponse,
  SolveTargetCostRequest,
  SolveTargetCostResponse,
  SymbolRebalanceItemModel,
  TvmCalculateRequest,
  TvmCalculateResponse,
  TvmScheduleEntryModel,
} from '../models/tools.model.js';
import { DEFAULT_TARGETS } from './allocation.service.js';
import { ValuationService } from './valuation.service.js';

export const COMPOUNDING_PERIODS: Record<CompoundingFrequency, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  quarterly: 4,
  semiannually: 2,
  annually: 1,
};

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(public readonly valuationService: ValuationService) {}

  async simulateOrder(req: SimulateOrderRequest): Promise<SimulateOrderResponse> {
    const initial = await this.resolveInitialPosition(
      req.initialPosition,
      req.symbol,
      req.currency || 'USD',
    );

    const initShares = Number(initial.shares || 0);
    const initTotalCost = Number(
      initial.totalCost !== undefined && initial.totalCost !== null
        ? initial.totalCost
        : initShares * Number(initial.avgCost || 0),
    );
    const initAvgCost = initShares > 0 ? initTotalCost / initShares : 0.0;
    const marketPrice = Number(initial.marketPrice || 0);
    const initHoldingVal = initShares * marketPrice;
    const initUnrealizedPL = initHoldingVal - initTotalCost;
    const initUnrealizedPLPct =
      initTotalCost > 0 ? (initUnrealizedPL / initTotalCost) * 100.0 : 0.0;

    let simShares = initShares;
    let simTotalCost = initTotalCost;
    let simAvgCost = initAvgCost;
    let simRealizedPL = 0.0;
    let totalOutlay = 0.0;
    let totalProceeds = 0.0;
    let totalFees = 0.0;

    for (const step of req.steps || []) {
      const shares = Number(step.shares || 0);
      const price = Number(step.price || 0);
      const feePct = Number(step.feePercent ?? req.taxFeePercent ?? 0.0);

      if (step.action === 'BUY') {
        const fee = shares * price * (feePct / 100.0);
        const stepCost = shares * price + fee;
        simShares += shares;
        simTotalCost += stepCost;
        simAvgCost = simShares > 0 ? simTotalCost / simShares : 0.0;
        totalOutlay += stepCost;
        totalFees += fee;
      } else if (step.action === 'SELL') {
        if (simShares <= 0) continue;
        const actualSellShares = Math.min(shares, simShares);
        const gross = actualSellShares * price;
        const fee = gross * (feePct / 100.0);
        const net = gross - fee;
        const costSold = actualSellShares * simAvgCost;
        const stepRealizedPL = net - costSold;

        simRealizedPL += stepRealizedPL;
        simShares -= actualSellShares;
        simTotalCost -= costSold;

        if (simShares <= 0) {
          simShares = 0.0;
          simTotalCost = 0.0;
          simAvgCost = 0.0;
        } else {
          simAvgCost = simTotalCost / simShares;
        }

        totalProceeds += net;
        totalFees += fee;
      }
    }

    const simHoldingVal = simShares * marketPrice;
    const simUnrealizedPL = simHoldingVal - simTotalCost;
    const simUnrealizedPLPct =
      simTotalCost > 0 ? (simUnrealizedPL / simTotalCost) * 100.0 : 0.0;

    const deltaShares = simShares - initShares;
    const deltaSharesPct =
      initShares > 0 ? (deltaShares / initShares) * 100.0 : 0.0;
    const deltaAvgCost = simAvgCost - initAvgCost;
    const deltaAvgCostPct =
      initAvgCost > 0 ? (deltaAvgCost / initAvgCost) * 100.0 : 0.0;
    const deltaTotalCost = simTotalCost - initTotalCost;
    const deltaTotalCostPct =
      initTotalCost > 0 ? (deltaTotalCost / initTotalCost) * 100.0 : 0.0;
    const deltaHoldingVal = simHoldingVal - initHoldingVal;
    const deltaHoldingValPct =
      initHoldingVal > 0 ? (deltaHoldingVal / initHoldingVal) * 100.0 : 0.0;
    const deltaUnrealizedPL = simUnrealizedPL - initUnrealizedPL;
    const deltaUnrealizedPLPct = simUnrealizedPLPct - initUnrealizedPLPct;

    const breakevenDistInit =
      marketPrice > 0 ? ((initAvgCost - marketPrice) / marketPrice) * 100.0 : 0.0;
    const breakevenDistSim =
      marketPrice > 0 ? ((simAvgCost - marketPrice) / marketPrice) * 100.0 : 0.0;

    return {
      initial: {
        totalShares: Math.round(initShares * 1e6) / 1e6,
        averageCost: Math.round(initAvgCost * 1e4) / 1e4,
        totalCost: Math.round(initTotalCost * 100) / 100,
        marketPrice: Math.round(marketPrice * 1e4) / 1e4,
        holdingValue: Math.round(initHoldingVal * 100) / 100,
        unrealizedPL: Math.round(initUnrealizedPL * 100) / 100,
        unrealizedPLPercent: Math.round(initUnrealizedPLPct * 100) / 100,
        realizedPL: 0.0,
      },
      simulated: {
        totalShares: Math.round(simShares * 1e6) / 1e6,
        averageCost: Math.round(simAvgCost * 1e4) / 1e4,
        totalCost: Math.round(simTotalCost * 100) / 100,
        marketPrice: Math.round(marketPrice * 1e4) / 1e4,
        holdingValue: Math.round(simHoldingVal * 100) / 100,
        unrealizedPL: Math.round(simUnrealizedPL * 100) / 100,
        unrealizedPLPercent: Math.round(simUnrealizedPLPct * 100) / 100,
        realizedPL: Math.round(simRealizedPL * 100) / 100,
      },
      delta: {
        shares: Math.round(deltaShares * 1e6) / 1e6,
        sharesPercent: Math.round(deltaSharesPct * 100) / 100,
        averageCost: Math.round(deltaAvgCost * 1e4) / 1e4,
        averageCostPercent: Math.round(deltaAvgCostPct * 100) / 100,
        totalCost: Math.round(deltaTotalCost * 100) / 100,
        totalCostPercent: Math.round(deltaTotalCostPct * 100) / 100,
        holdingValue: Math.round(deltaHoldingVal * 100) / 100,
        holdingValuePercent: Math.round(deltaHoldingValPct * 100) / 100,
        unrealizedPL: Math.round(deltaUnrealizedPL * 100) / 100,
        unrealizedPLPercent: Math.round(deltaUnrealizedPLPct * 100) / 100,
        breakevenDistanceInitial: Math.round(breakevenDistInit * 100) / 100,
        breakevenDistanceSimulated: Math.round(breakevenDistSim * 100) / 100,
        realizedPL: Math.round(simRealizedPL * 100) / 100,
      },
      steps: req.steps,
      totalCapitalOutlay: Math.round(totalOutlay * 100) / 100,
      totalProceeds: Math.round(totalProceeds * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      currency: initial.currency || 'USD',
    };
  }

  async solveTargetCost(req: SolveTargetCostRequest): Promise<SolveTargetCostResponse> {
    const initial = await this.resolveInitialPosition(
      req.initialPosition,
      req.symbol,
      req.currency || 'USD',
    );

    const s0 = Number(initial.shares || 0);
    const c0 = Number(
      initial.totalCost !== undefined && initial.totalCost !== null
        ? initial.totalCost
        : s0 * Number(initial.avgCost || 0),
    );
    const p0 = s0 > 0 ? Number(initial.avgCost || 0) : 0.0;
    const target = Number(req.targetAvgCost);
    const pBuy = Number(req.purchasePrice);
    const feePct = Number(req.feePercent || 0.0);
    const f = feePct / 100.0;
    const pEff = pBuy * (1.0 + f);

    if (s0 <= 0) {
      if (pEff <= 0) {
        return {
          isValid: false,
          errorMessage: 'Purchase price must be greater than zero.',
          requiredShares: 0.0,
          requiredCapital: 0.0,
          feeAmount: 0.0,
          totalOutlay: 0.0,
          achievedAvgCost: 0.0,
          newTotalShares: 0.0,
          newTotalCost: 0.0,
          currency: initial.currency || 'USD',
        };
      }
      const reqShares = 1.0;
      const reqCapital = reqShares * pBuy;
      const feeAmount = reqCapital * f;
      const totalOutlay = reqCapital + feeAmount;
      return {
        isValid: true,
        errorMessage: '',
        requiredShares: Math.round(reqShares * 1e6) / 1e6,
        requiredCapital: Math.round(reqCapital * 100) / 100,
        feeAmount: Math.round(feeAmount * 100) / 100,
        totalOutlay: Math.round(totalOutlay * 100) / 100,
        achievedAvgCost: Math.round((totalOutlay / reqShares) * 1e4) / 1e4,
        newTotalShares: Math.round(reqShares * 1e6) / 1e6,
        newTotalCost: Math.round(totalOutlay * 100) / 100,
        currency: initial.currency || 'USD',
      };
    }

    const denom = target - pEff;
    if (Math.abs(denom) < 1e-9) {
      return {
        isValid: false,
        errorMessage:
          'Target average cost equals effective buy price. Mathematical boundary.',
        requiredShares: 0.0,
        requiredCapital: 0.0,
        feeAmount: 0.0,
        totalOutlay: 0.0,
        achievedAvgCost: 0.0,
        newTotalShares: 0.0,
        newTotalCost: 0.0,
        currency: initial.currency || 'USD',
      };
    }

    const reqShares = (c0 - s0 * target) / denom;

    if (reqShares <= 0) {
      let msg = 'No additional shares required or target is already achieved.';
      if (pEff >= target && target < p0) {
        msg = `Cannot average down to ${target.toFixed(2)} when effective buy price (${pEff.toFixed(2)}) is higher than or equal to target cost.`;
      } else if (pEff <= target && target > p0) {
        msg = `Cannot average up to ${target.toFixed(2)} when effective buy price (${pEff.toFixed(2)}) is lower than or equal to target cost.`;
      }

      return {
        isValid: false,
        errorMessage: msg,
        requiredShares: 0.0,
        requiredCapital: 0.0,
        feeAmount: 0.0,
        totalOutlay: 0.0,
        achievedAvgCost: 0.0,
        newTotalShares: 0.0,
        newTotalCost: 0.0,
        currency: initial.currency || 'USD',
      };
    }

    const reqCapital = reqShares * pBuy;
    const feeAmount = reqCapital * f;
    const totalOutlay = reqCapital + feeAmount;
    const newShares = s0 + reqShares;
    const newCost = c0 + totalOutlay;
    const achievedCost = newShares > 0 ? newCost / newShares : 0.0;

    return {
      isValid: true,
      errorMessage: '',
      requiredShares: Math.round(reqShares * 1e6) / 1e6,
      requiredCapital: Math.round(reqCapital * 100) / 100,
      feeAmount: Math.round(feeAmount * 100) / 100,
      totalOutlay: Math.round(totalOutlay * 100) / 100,
      achievedAvgCost: Math.round(achievedCost * 1e4) / 1e4,
      newTotalShares: Math.round(newShares * 1e6) / 1e6,
      newTotalCost: Math.round(newCost * 100) / 100,
      currency: initial.currency || 'USD',
    };
  }

  async resolveInitialPosition(
    snapshot?: PositionSnapshotModel | null,
    symbol?: string | null,
    currency: string = 'USD',
  ): Promise<PositionSnapshotModel> {
    if (snapshot && (Number(snapshot.shares || 0) > 0 || Number(snapshot.avgCost || 0) > 0)) {
      return snapshot;
    }

    const lookupSymbol = (symbol || snapshot?.symbol || '').toUpperCase().trim();
    if (!lookupSymbol) {
      return snapshot || { currency };
    }

    try {
      const holdings = await this.valuationService.getPortfolioHoldings(
        'all',
        currency,
      );
      for (const pos of holdings.openPositions) {
        if (pos.symbol.toUpperCase() === lookupSymbol) {
          return {
            symbol: pos.symbol,
            shares: pos.totalShares,
            avgCost: pos.averageCost,
            marketPrice: pos.currentPrice,
            currency: pos.currency,
            totalCost: pos.totalCost,
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to auto-resolve position for ${lookupSymbol}: ${err}`);
    }

    return snapshot || { symbol: lookupSymbol, currency };
  }

  async calculateTvm(req: TvmCalculateRequest): Promise<TvmCalculateResponse> {
    const compounding: CompoundingFrequency = req.compounding || 'monthly';
    const m = COMPOUNDING_PERIODS[compounding] || 12;
    let pv = Math.max(0.0, Number((req as any).pv ?? req.presentValue ?? 0.0));
    let pmt = Math.max(0.0, Number((req as any).pmt ?? req.payment ?? 0.0));
    let ratePct = Math.max(0.0, Number((req as any).rate ?? req.annualRatePct ?? 8.0));
    let years = Math.max(0.0, Number((req as any).nper ?? req.years ?? 10.0));
    let fv = Math.max(0.0, Number((req as any).fv ?? req.targetFutureValue ?? 0.0));
    const t = req.timing === 'beginning' ? 1.0 : 0.0;

    let isValid = true;
    let errorMessage = '';

    const mode = req.mode || 'FV';

    if (mode === 'FV') {
      fv = this.tvmFutureValue(pv, pmt, ratePct, years, m, t);
    } else if (mode === 'PMT') {
      if (years <= 0) {
        isValid = false;
        errorMessage = 'Investment horizon must be greater than 0 years to calculate payment.';
        pmt = 0.0;
      } else {
        pmt = this.tvmPayment(fv, pv, ratePct, years, m, t);
      }
    } else if (mode === 'PV') {
      if (years <= 0) {
        pv = fv;
      } else {
        pv = this.tvmPresentValue(fv, pmt, ratePct, years, m, t);
      }
    } else if (mode === 'N') {
      const [resYears, ok, msg] = this.tvmYears(fv, pv, pmt, ratePct, m, t);
      years = resYears;
      isValid = ok;
      errorMessage = msg;
    } else if (mode === 'RATE') {
      if (years <= 0) {
        isValid = false;
        errorMessage = 'Investment horizon must be greater than 0 years to calculate return rate.';
        ratePct = 0.0;
      } else {
        const [resRate, ok, msg] = this.tvmRate(fv, pv, pmt, years, m, t);
        ratePct = resRate;
        isValid = ok;
        errorMessage = msg;
      }
    }

    const totalPeriods = Math.ceil(years * m);
    const totalPrincipal = pv;
    const totalContributions = pmt * totalPeriods;
    const totalInvested = totalPrincipal + totalContributions;
    const totalInterest = Math.max(0.0, fv - totalInvested);

    const periodicRate = ratePct / 100.0 / m;
    const earPct = m > 0 ? (Math.pow(1.0 + periodicRate, m) - 1.0) * 100.0 : ratePct;
    const multiplier =
      totalInvested > 0 ? fv / totalInvested : fv > 0 ? 1.0 : 0.0;

    let schedule: TvmScheduleEntryModel[] = [];
    if (isValid && years > 0) {
      schedule = this.tvmGenerateSchedule(pv, pmt, ratePct, years, m, t);
    }

    return {
      mode,
      futureValue: Math.round(fv * 100) / 100,
      presentValue: Math.round(pv * 100) / 100,
      payment: Math.round(pmt * 100) / 100,
      annualRatePct: Math.round(ratePct * 1e4) / 1e4,
      years: Math.round(years * 100) / 100,
      compounding,
      compoundingPeriodsPerYear: m,
      totalPeriods,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalInterestEarned: Math.round(totalInterest * 100) / 100,
      effectiveAnnualRatePct: Math.round(earPct * 1e4) / 1e4,
      multiplier: Math.round(multiplier * 100) / 100,
      currency: req.currency || 'USD',
      schedule,
      isValid,
      errorMessage,
    };
  }

  private tvmFutureValue(
    pv: number,
    pmt: number,
    ratePct: number,
    years: number,
    m: number,
    t: number,
  ): number {
    const n = years * m;
    if (n <= 0) return pv;
    const i = ratePct / 100.0 / m;
    if (Math.abs(i) < 1e-12) {
      return pv + pmt * n;
    }
    const growth = Math.pow(1.0 + i, n);
    const fvPv = pv * growth;
    const fvPmt = pmt * ((growth - 1.0) / i) * (1.0 + i * t);
    return Math.max(0.0, fvPv + fvPmt);
  }

  private tvmPresentValue(
    fv: number,
    pmt: number,
    ratePct: number,
    years: number,
    m: number,
    t: number,
  ): number {
    const n = years * m;
    if (n <= 0) return fv;
    const i = ratePct / 100.0 / m;
    if (Math.abs(i) < 1e-12) {
      return Math.max(0.0, fv - pmt * n);
    }
    const growth = Math.pow(1.0 + i, n);
    const fvPmt = pmt * ((growth - 1.0) / i) * (1.0 + i * t);
    return Math.max(0.0, (fv - fvPmt) / growth);
  }

  private tvmPayment(
    fv: number,
    pv: number,
    ratePct: number,
    years: number,
    m: number,
    t: number,
  ): number {
    const n = years * m;
    if (n <= 0) return 0.0;
    const i = ratePct / 100.0 / m;
    if (Math.abs(i) < 1e-12) {
      return Math.max(0.0, (fv - pv) / n);
    }
    const growth = Math.pow(1.0 + i, n);
    const fvPv = pv * growth;
    const annuityFactor = ((growth - 1.0) / i) * (1.0 + i * t);
    if (Math.abs(annuityFactor) < 1e-12) return 0.0;
    return Math.max(0.0, (fv - fvPv) / annuityFactor);
  }

  private tvmYears(
    fv: number,
    pv: number,
    pmt: number,
    ratePct: number,
    m: number,
    t: number,
  ): [number, boolean, string] {
    if (fv <= pv) return [0.0, true, ''];
    const i = ratePct / 100.0 / m;
    if (Math.abs(i) < 1e-12) {
      if (pmt <= 0) {
        return [
          0.0,
          false,
          'With 0% return rate and 0 payment, target future value cannot be reached.',
        ];
      }
      const n = (fv - pv) / pmt;
      return [n / m, true, ''];
    }

    const adjPmt = pmt * (1.0 + i * t);
    if (pmt <= 0) {
      if (pv <= 0) {
        return [0.0, false, 'Both starting principal and periodic payment are zero.'];
      }
      const n = Math.log(fv / pv) / Math.log(1.0 + i);
      return [n / m, true, ''];
    }

    const num = fv * i + adjPmt;
    const den = pv * i + adjPmt;
    if (den <= 0 || num / den <= 0) {
      return [0.0, false, 'Cannot solve for time horizon with given inputs.'];
    }

    const n = Math.log(num / den) / Math.log(1.0 + i);
    return [n / m, true, ''];
  }

  private tvmRate(
    fv: number,
    pv: number,
    pmt: number,
    years: number,
    m: number,
    t: number,
  ): [number, boolean, string] {
    const n = Math.max(1.0, years * m);
    const totalInvested = pv + pmt * n;
    if (fv <= totalInvested) {
      if (fv === totalInvested) return [0.0, true, ''];
      if (fv <= 0) return [0.0, false, 'Target Future Value must be greater than 0.'];
    }

    const f = (rateI: number): number => {
      if (Math.abs(rateI) < 1e-12) {
        return pv + pmt * n - fv;
      }
      const growth = Math.pow(1.0 + rateI, n);
      return pv * growth + pmt * ((growth - 1.0) / rateI) * (1.0 + rateI * t) - fv;
    };

    let low = -0.95 / m;
    let high = 5.0 / m;
    let fLow = f(low);
    let fHigh = f(high);

    if (fLow * fHigh > 0) {
      return [0.0, false, 'Could not find a feasible return rate within standard boundaries.'];
    }

    for (let iter = 0; iter < 100; iter++) {
      const mid = (low + high) / 2.0;
      const fMid = f(mid);
      if (Math.abs(fMid) < 1e-7 || high - low < 1e-9) {
        return [mid * m * 100.0, true, ''];
      }
      if (fLow * fMid < 0) {
        high = mid;
        fHigh = fMid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }

    return [((low + high) / 2.0) * m * 100.0, true, ''];
  }

  private tvmGenerateSchedule(
    pv: number,
    pmt: number,
    ratePct: number,
    years: number,
    m: number,
    t: number,
  ): TvmScheduleEntryModel[] {
    const totalYears = Math.min(100, Math.max(1, Math.ceil(years)));
    const periodicRate = ratePct / 100.0 / m;

    const schedule: TvmScheduleEntryModel[] = [];
    let currentBalance = Math.max(0.0, pv);
    let cumContrib = pv;
    let cumInterest = 0.0;

    for (let y = 1; y <= totalYears; y++) {
      const startBalance = currentBalance;
      let yearContrib = 0.0;
      let yearInterest = 0.0;

      for (let p = 0; p < m; p++) {
        if (t === 1.0) {
          currentBalance += pmt;
          yearContrib += pmt;
          const interest = currentBalance * periodicRate;
          currentBalance += interest;
          yearInterest += interest;
        } else {
          const interest = currentBalance * periodicRate;
          currentBalance += interest + pmt;
          yearContrib += pmt;
          yearInterest += interest;
        }
      }

      cumContrib += yearContrib;
      cumInterest += yearInterest;

      schedule.push({
        period: y * m,
        year: y,
        startBalance: Math.round(startBalance * 100) / 100,
        contributions: Math.round(yearContrib * 100) / 100,
        interestEarned: Math.round(yearInterest * 100) / 100,
        endBalance: Math.round(currentBalance * 100) / 100,
        totalContributionsToDate: Math.round(cumContrib * 100) / 100,
        totalInterestToDate: Math.round(cumInterest * 100) / 100,
      });
    }

    return schedule;
  }

  async calculateRebalance(
    req: RebalanceCalculateRequest,
  ): Promise<RebalanceCalculateResponse> {
    const currency = req.currency || 'USD';
    const holdings = await this.valuationService.getPortfolioHoldings(
      'all',
      currency,
    );
    const openPositions = holdings.openPositions || [];

    const classMap = new Map<string, typeof openPositions>();
    for (const pos of openPositions) {
      const atype = pos.assetType || 'us-stock';
      if (!classMap.has(atype)) {
        classMap.set(atype, []);
      }
      classMap.get(atype)!.push(pos);
    }

    const orderedTypes = Object.keys(DEFAULT_TARGETS);
    const allTypes = [
      ...orderedTypes.filter((t) => classMap.has(t)),
      ...Array.from(classMap.keys()).filter((t) => !orderedTypes.includes(t)),
    ];

    const totalPortfolioValue = openPositions.reduce(
      (acc, pos) => acc + pos.holdingValue,
      0,
    );

    const groups: AssetClassRebalanceGroupModel[] = [];
    const orders: RebalanceTradeOrderModel[] = [];
    let totalBuyAmount = 0.0;
    let totalSellAmount = 0.0;
    let totalInflowContribution = 0.0;

    for (const atype of allTypes) {
      const posList = classMap.get(atype) || [];
      const classTotalValue = posList.reduce((acc, pos) => acc + pos.holdingValue, 0);
      const classPortfolioPct =
        totalPortfolioValue > 0
          ? (classTotalValue / totalPortfolioValue) * 100.0
          : 0.0;

      const targetSum = posList.reduce(
        (acc, p) =>
          acc + Math.max(0.0, (req.targetAllocations || {})[p.symbol] || 0.0),
        0.0,
      );
      const isValid =
        Math.abs(targetSum - 100.0) <= 0.1 ||
        (targetSum === 0 && posList.length === 0);

      const symbols: SymbolRebalanceItemModel[] = [];
      let groupBuy = 0.0;
      let groupSell = 0.0;
      let minInflowReq = 0.0;

      if ((req.mode || 'standard') === 'standard') {
        for (const pos of posList) {
          const tpct = Math.max(0.0, (req.targetAllocations || {})[pos.symbol] || 0.0);
          const tval =
            classTotalValue > 0 ? (tpct / 100.0) * classTotalValue : 0.0;
          const deltaVal = tval - pos.holdingValue;
          const curClassPct =
            classTotalValue > 0
              ? (pos.holdingValue / classTotalValue) * 100.0
              : 0.0;
          const curPortPct =
            totalPortfolioValue > 0
              ? (pos.holdingValue / totalPortfolioValue) * 100.0
              : 0.0;

          let act: RebalanceAction;
          let dshares = 0.0;
          if (deltaVal > 0.01) {
            act = 'BUY';
            groupBuy += deltaVal;
            dshares = pos.currentPrice > 0 ? deltaVal / pos.currentPrice : 0.0;
          } else if (deltaVal < -0.01) {
            act = 'SELL';
            groupSell += Math.abs(deltaVal);
            dshares =
              pos.currentPrice > 0 ? -Math.abs(deltaVal) / pos.currentPrice : 0.0;
          } else {
            act = 'BALANCED';
            dshares = 0.0;
          }

          symbols.push({
            symbol: pos.symbol,
            displaySymbol: pos.displaySymbol || pos.symbol,
            name: pos.name || pos.symbol,
            assetType: atype,
            assetTypeLabel: pos.assetTypeLabel || atype,
            currency,
            currentShares: pos.totalShares,
            currentPrice: pos.currentPrice,
            currentValue: pos.holdingValue,
            currentClassPercent: Math.round(curClassPct * 100) / 100,
            currentPortfolioPercent: Math.round(curPortPct * 100) / 100,
            targetPercent: Math.round(tpct * 100) / 100,
            targetValue: Math.round(tval * 100) / 100,
            action: act,
            deltaValue: Math.round(deltaVal * 100) / 100,
            deltaShares: Math.round(dshares * 1e4) / 1e4,
            color: '#3b82f6',
          });
        }
      } else {
        // No-sell mode
        if ((req.noSellSubMode || 'min-inflow') === 'min-inflow') {
          let maxReqClassVal = classTotalValue;
          let anchorSym: string | null = null;
          for (const pos of posList) {
            const tpct = Math.max(0.0, (req.targetAllocations || {})[pos.symbol] || 0.0);
            if (tpct > 0) {
              const reqVal = pos.holdingValue / (tpct / 100.0);
              if (reqVal > maxReqClassVal) {
                maxReqClassVal = reqVal;
                anchorSym = pos.symbol;
              }
            }
          }

          minInflowReq = Math.max(0.0, maxReqClassVal - classTotalValue);
          const newClassVal = maxReqClassVal;
          groupBuy = minInflowReq;
          totalInflowContribution += minInflowReq;

          for (const pos of posList) {
            const tpct = Math.max(0.0, (req.targetAllocations || {})[pos.symbol] || 0.0);
            const tval = (tpct / 100.0) * newClassVal;
            const deltaVal = Math.max(0.0, tval - pos.holdingValue);
            const curClassPct =
              classTotalValue > 0
                ? (pos.holdingValue / classTotalValue) * 100.0
                : 0.0;
            const curPortPct =
              totalPortfolioValue > 0
                ? (pos.holdingValue / totalPortfolioValue) * 100.0
                : 0.0;
            const isAnchor = pos.symbol === anchorSym || deltaVal < 0.01;

            const noSellAct: RebalanceAction =
              deltaVal >= 0.01 ? 'BUY' : 'BALANCED';
            const dshares =
              deltaVal >= 0.01 && pos.currentPrice > 0
                ? deltaVal / pos.currentPrice
                : 0.0;

            symbols.push({
              symbol: pos.symbol,
              displaySymbol: pos.displaySymbol || pos.symbol,
              name: pos.name || pos.symbol,
              assetType: atype,
              assetTypeLabel: pos.assetTypeLabel || atype,
              currency,
              currentShares: pos.totalShares,
              currentPrice: pos.currentPrice,
              currentValue: pos.holdingValue,
              currentClassPercent: Math.round(curClassPct * 100) / 100,
              currentPortfolioPercent: Math.round(curPortPct * 100) / 100,
              targetPercent: Math.round(tpct * 100) / 100,
              targetValue: Math.round(tval * 100) / 100,
              action: noSellAct,
              deltaValue: Math.round(deltaVal * 100) / 100,
              deltaShares: Math.round(dshares * 1e4) / 1e4,
              color: '#3b82f6',
              isAnchorPosition: isAnchor && tpct > 0,
            });
          }
        } else {
          // Custom deposit mode
          const deposit = Math.max(0.0, Number(req.customCashDeposit || 0.0));
          const shareOfDeposit =
            totalPortfolioValue > 0
              ? (classTotalValue / totalPortfolioValue) * deposit
              : deposit / Math.max(1, allTypes.length);
          const targetClassVal = classTotalValue + shareOfDeposit;

          const deficits: [string, number, number][] = [];
          for (const pos of posList) {
            const tpct = Math.max(0.0, (req.targetAllocations || {})[pos.symbol] || 0.0);
            const idealVal = (tpct / 100.0) * targetClassVal;
            const deficit = Math.max(0.0, idealVal - pos.holdingValue);
            deficits.push([pos.symbol, tpct, deficit]);
          }

          const totDeficit = deficits.reduce((acc, d) => acc + d[2], 0.0);
          let allocatedCash = 0.0;

          for (const pos of posList) {
            const matched = deficits.find((d) => d[0] === pos.symbol) || [
              pos.symbol,
              0.0,
              0.0,
            ];
            const tpct = matched[1];
            const dval = matched[2];

            let bAmt = 0.0;
            if (totDeficit > 0 && shareOfDeposit > 0) {
              if (totDeficit <= shareOfDeposit) {
                const surplus = shareOfDeposit - totDeficit;
                bAmt = dval + (tpct / 100.0) * surplus;
              } else {
                bAmt = shareOfDeposit * (dval / totDeficit);
              }
            }

            allocatedCash += bAmt;
            const tval = pos.holdingValue + bAmt;
            const curClassPct =
              classTotalValue > 0
                ? (pos.holdingValue / classTotalValue) * 100.0
                : 0.0;
            const curPortPct =
              totalPortfolioValue > 0
                ? (pos.holdingValue / totalPortfolioValue) * 100.0
                : 0.0;

            const customAct: RebalanceAction = bAmt >= 0.01 ? 'BUY' : 'BALANCED';
            const dshares =
              bAmt >= 0.01 && pos.currentPrice > 0 ? bAmt / pos.currentPrice : 0.0;

            symbols.push({
              symbol: pos.symbol,
              displaySymbol: pos.displaySymbol || pos.symbol,
              name: pos.name || pos.symbol,
              assetType: atype,
              assetTypeLabel: pos.assetTypeLabel || atype,
              currency,
              currentShares: pos.totalShares,
              currentPrice: pos.currentPrice,
              currentValue: pos.holdingValue,
              currentClassPercent: Math.round(curClassPct * 100) / 100,
              currentPortfolioPercent: Math.round(curPortPct * 100) / 100,
              targetPercent: Math.round(tpct * 100) / 100,
              targetValue: Math.round(tval * 100) / 100,
              action: customAct,
              deltaValue: Math.round(bAmt * 100) / 100,
              deltaShares: Math.round(dshares * 1e4) / 1e4,
              color: '#3b82f6',
              isAnchorPosition: bAmt < 0.01 && tpct > 0,
            });
          }

          groupBuy = allocatedCash;
          totalInflowContribution += allocatedCash;
        }
      }

      totalBuyAmount += groupBuy;
      totalSellAmount += groupSell;

      for (const s of symbols) {
        if (s.action === 'BUY' && s.deltaValue >= 0.01) {
          orders.push({
            id: `order-buy-${s.symbol}`,
            symbol: s.symbol,
            displaySymbol: s.displaySymbol,
            name: s.name,
            assetType: s.assetType,
            action: 'BUY',
            shares: Math.round(s.deltaShares * 1e4) / 1e4,
            price: Math.round(s.currentPrice * 1e4) / 1e4,
            amount: Math.round(s.deltaValue * 100) / 100,
            currency,
          });
        } else if (s.action === 'SELL' && s.deltaValue <= -0.01) {
          orders.push({
            id: `order-sell-${s.symbol}`,
            symbol: s.symbol,
            displaySymbol: s.displaySymbol,
            name: s.name,
            assetType: s.assetType,
            action: 'SELL',
            shares: Math.round(Math.abs(s.deltaShares) * 1e4) / 1e4,
            price: Math.round(s.currentPrice * 1e4) / 1e4,
            amount: Math.round(Math.abs(s.deltaValue) * 100) / 100,
            currency,
          });
        }
      }

      groups.push({
        assetType: atype,
        label: atype.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        color: '#3b82f6',
        currentValue: Math.round(classTotalValue * 100) / 100,
        currentPortfolioPercent: Math.round(classPortfolioPct * 100) / 100,
        targetTotalPercent: Math.round(targetSum * 100) / 100,
        isValid,
        minInflowRequired: Math.round(minInflowReq * 100) / 100,
        totalBuyAmount: Math.round(groupBuy * 100) / 100,
        totalSellAmount: Math.round(groupSell * 100) / 100,
        symbols,
      });
    }

    const targetPortVal =
      (req.mode || 'standard') === 'standard'
        ? totalPortfolioValue
        : totalPortfolioValue + totalInflowContribution;

    const isOverallValid = groups.every((g) => g.isValid);
    orders.sort(
      (a, b) =>
        (a.action === 'BUY' ? -1 : 1) - (b.action === 'BUY' ? -1 : 1) ||
        b.amount - a.amount,
    );

    return {
      mode: req.mode || 'standard',
      noSellSubMode: req.noSellSubMode || 'min-inflow',
      currency,
      totalCurrentPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      totalTargetPortfolioValue: Math.round(targetPortVal * 100) / 100,
      cashContribution:
        req.mode === 'no-sell'
          ? Math.round(totalInflowContribution * 100) / 100
          : 0.0,
      totalBuyAmount: Math.round(totalBuyAmount * 100) / 100,
      totalSellAmount: Math.round(totalSellAmount * 100) / 100,
      netCashDifference:
        Math.round((totalBuyAmount - totalSellAmount) * 100) / 100,
      groups,
      orders,
      isValid: isOverallValid,
      errorMessage: isOverallValid
        ? ''
        : 'Target percentages in one or more asset classes do not sum to 100%.',
    };
  }
}
