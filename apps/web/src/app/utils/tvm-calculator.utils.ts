import {
  CompoundingFrequency,
  PaymentTiming,
  TvmCalculationResult,
  TvmInputParams,
  TvmScheduleEntry,
  TvmSolveMode,
} from '../models/tools.model';

export const COMPOUNDING_FREQUENCIES: { id: CompoundingFrequency; label: string; periods: number }[] = [
  { id: 'daily', label: 'Daily (365/yr)', periods: 365 },
  { id: 'weekly', label: 'Weekly (52/yr)', periods: 52 },
  { id: 'biweekly', label: 'Biweekly (26/yr)', periods: 26 },
  { id: 'semimonthly', label: 'Semimonthly (24/yr)', periods: 24 },
  { id: 'monthly', label: 'Monthly (12/yr)', periods: 12 },
  { id: 'quarterly', label: 'Quarterly (4/yr)', periods: 4 },
  { id: 'semiannually', label: 'Semiannually (2/yr)', periods: 2 },
  { id: 'annually', label: 'Annually (1/yr)', periods: 1 },
];

/**
 * Returns number of compounding periods per calendar year.
 */
export function getCompoundingPeriodsPerYear(frequency: CompoundingFrequency): number {
  switch (frequency) {
    case 'daily':
      return 365;
    case 'weekly':
      return 52;
    case 'biweekly':
      return 26;
    case 'semimonthly':
      return 24;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'semiannually':
      return 2;
    case 'annually':
    default:
      return 1;
  }
}

/**
 * Returns the human-readable label for a compounding frequency.
 */
export function getCompoundingFrequencyLabel(frequency: CompoundingFrequency): string {
  const match = COMPOUNDING_FREQUENCIES.find((c) => c.id === frequency);
  return match ? match.label : 'Monthly (12/yr)';
}

/**
 * Calculates Future Value (FV) given PV, PMT, rate, periods, compounding, and timing.
 */
export function calculateFutureValue(
  pv: number,
  pmt: number,
  annualRatePct: number,
  years: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): number {
  const m = getCompoundingPeriodsPerYear(compounding);
  const n = Math.max(0, years * m);
  const i = (annualRatePct / 100) / m;
  const t = timing === 'beginning' ? 1 : 0;

  if (n === 0) {
    return Math.max(0, pv);
  }

  if (Math.abs(i) < 1e-12) {
    return Math.max(0, pv + pmt * n);
  }

  const growthFactor = Math.pow(1 + i, n);
  const fvPv = pv * growthFactor;
  const fvPmt = pmt * ((growthFactor - 1) / i) * (1 + i * t);

  return Math.max(0, fvPv + fvPmt);
}

/**
 * Calculates required Present Value (PV) to reach target FV.
 */
export function calculatePresentValue(
  targetFv: number,
  pmt: number,
  annualRatePct: number,
  years: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): number {
  const m = getCompoundingPeriodsPerYear(compounding);
  const n = Math.max(0, years * m);
  const i = (annualRatePct / 100) / m;
  const t = timing === 'beginning' ? 1 : 0;

  if (n === 0) {
    return Math.max(0, targetFv);
  }

  if (Math.abs(i) < 1e-12) {
    return Math.max(0, targetFv - pmt * n);
  }

  const growthFactor = Math.pow(1 + i, n);
  const fvPmt = pmt * ((growthFactor - 1) / i) * (1 + i * t);
  const requiredPv = (targetFv - fvPmt) / growthFactor;

  return Math.max(0, requiredPv);
}

/**
 * Calculates required Periodic Payment (PMT) to reach target FV.
 */
export function calculatePayment(
  targetFv: number,
  pv: number,
  annualRatePct: number,
  years: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): number {
  const m = getCompoundingPeriodsPerYear(compounding);
  const n = Math.max(0, years * m);
  const i = (annualRatePct / 100) / m;
  const t = timing === 'beginning' ? 1 : 0;

  if (n === 0) {
    return 0;
  }

  if (Math.abs(i) < 1e-12) {
    return Math.max(0, (targetFv - pv) / n);
  }

  const growthFactor = Math.pow(1 + i, n);
  const fvPv = pv * growthFactor;
  const annuityMultiplier = ((growthFactor - 1) / i) * (1 + i * t);

  if (Math.abs(annuityMultiplier) < 1e-12) {
    return 0;
  }

  const requiredPmt = (targetFv - fvPv) / annuityMultiplier;
  return Math.max(0, requiredPmt);
}

/**
 * Calculates required time in Years to reach target FV.
 */
export function calculatePeriodsInYears(
  targetFv: number,
  pv: number,
  pmt: number,
  annualRatePct: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): { years: number; periods: number; isValid: boolean; errorMessage?: string } {
  const m = getCompoundingPeriodsPerYear(compounding);
  const i = (annualRatePct / 100) / m;
  const t = timing === 'beginning' ? 1 : 0;

  if (targetFv <= pv) {
    return { years: 0, periods: 0, isValid: true };
  }

  if (Math.abs(i) < 1e-12) {
    if (pmt <= 0) {
      return {
        years: 0,
        periods: 0,
        isValid: false,
        errorMessage: 'With 0% return rate and 0 payment, target future value cannot be reached.',
      };
    }
    const n = (targetFv - pv) / pmt;
    return { years: n / m, periods: Math.ceil(n), isValid: true };
  }

  const adjPmt = pmt * (1 + i * t);

  if (pmt <= 0) {
    if (pv <= 0) {
      return {
        years: 0,
        periods: 0,
        isValid: false,
        errorMessage: 'Both starting principal and periodic payment are zero.',
      };
    }
    const n = Math.log(targetFv / pv) / Math.log(1 + i);
    if (!isFinite(n) || n < 0) {
      return {
        years: 0,
        periods: 0,
        isValid: false,
        errorMessage: 'Target value cannot be reached with the current parameters.',
      };
    }
    return { years: n / m, periods: Math.ceil(n), isValid: true };
  }

  const numerator = targetFv * i + adjPmt;
  const denominator = pv * i + adjPmt;

  if (denominator <= 0 || numerator / denominator <= 0) {
    return {
      years: 0,
      periods: 0,
      isValid: false,
      errorMessage: 'Cannot solve for time horizon with given inputs.',
    };
  }

  const n = Math.log(numerator / denominator) / Math.log(1 + i);
  if (!isFinite(n) || n < 0) {
    return {
      years: 0,
      periods: 0,
      isValid: false,
      errorMessage: 'Cannot solve for time horizon with given inputs.',
    };
  }

  return { years: n / m, periods: Math.ceil(n), isValid: true };
}

/**
 * Numerically solves required Annual Return Rate (%) to reach target FV using Newton-Raphson with bisection fallback.
 */
export function calculateAnnualRate(
  targetFv: number,
  pv: number,
  pmt: number,
  years: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): { annualRatePct: number; isValid: boolean; errorMessage?: string } {
  const m = getCompoundingPeriodsPerYear(compounding);
  const n = Math.max(1, years * m);
  const t = timing === 'beginning' ? 1 : 0;

  const totalInvested = pv + pmt * n;
  if (targetFv <= totalInvested) {
    if (targetFv === totalInvested) {
      return { annualRatePct: 0, isValid: true };
    }
    if (targetFv <= 0) {
      return { annualRatePct: 0, isValid: false, errorMessage: 'Target Future Value must be greater than 0.' };
    }
  }

  // Objective function f(i) = FV(i) - targetFv
  const f = (rateI: number): number => {
    if (Math.abs(rateI) < 1e-12) {
      return pv + pmt * n - targetFv;
    }
    const growth = Math.pow(1 + rateI, n);
    const fvPv = pv * growth;
    const fvPmt = pmt * ((growth - 1) / rateI) * (1 + rateI * t);
    return fvPv + fvPmt - targetFv;
  };

  // Derivative df/di
  const df = (rateI: number): number => {
    if (Math.abs(rateI) < 1e-12) {
      return pv * n + pmt * (n * (n - 1) / 2);
    }
    const growth = Math.pow(1 + rateI, n);
    const dGrowth = n * Math.pow(1 + rateI, n - 1);
    const dfPv = pv * dGrowth;

    // PMT term derivative
    const pmtFactor = 1 + rateI * t;
    const num = (growth - 1) * pmtFactor;
    const dNum = dGrowth * pmtFactor + (growth - 1) * t;
    const dAnnuity = (dNum * rateI - num) / (rateI * rateI);
    const dfPmt = pmt * dAnnuity;

    return dfPv + dfPmt;
  };

  // Initial guess based on simple interest approximation
  let i = 0.08 / m;
  if (totalInvested > 0) {
    const simpleEst = ((targetFv - totalInvested) / (totalInvested * (years || 1))) / m;
    if (simpleEst > -0.5 / m && simpleEst < 2.0 / m) {
      i = Math.max(0.001 / m, simpleEst);
    }
  }

  // Newton-Raphson iterations
  const maxIter = 80;
  const tol = 1e-7;

  for (let iter = 0; iter < maxIter; iter++) {
    const y = f(i);
    if (Math.abs(y) < tol) {
      const annualPct = i * m * 100;
      return { annualRatePct: parseFloat(annualPct.toFixed(4)), isValid: true };
    }
    const dy = df(i);
    if (Math.abs(dy) < 1e-12) {
      break;
    }
    const nextI = i - y / dy;
    if (nextI < -0.99 / m || nextI > 10.0 / m || isNaN(nextI)) {
      break; // Fallback to bisection
    }
    if (Math.abs(nextI - i) < 1e-9) {
      const annualPct = nextI * m * 100;
      return { annualRatePct: parseFloat(annualPct.toFixed(4)), isValid: true };
    }
    i = nextI;
  }

  // Bisection method fallback
  let low = -0.95 / m;
  let high = 5.0 / m; // 500% annual
  let fLow = f(low);
  let fHigh = f(high);

  if (fLow * fHigh > 0) {
    return {
      annualRatePct: 0,
      isValid: false,
      errorMessage: 'Could not find a feasible return rate within standard boundaries.',
    };
  }

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < tol || (high - low) < 1e-9) {
      const annualPct = mid * m * 100;
      return { annualRatePct: parseFloat(annualPct.toFixed(4)), isValid: true };
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  const resRate = ((low + high) / 2) * m * 100;
  return { annualRatePct: parseFloat(resRate.toFixed(4)), isValid: true };
}

/**
 * Generates year-by-year accumulation and amortization schedule.
 */
export function generateTvmSchedule(
  pv: number,
  pmt: number,
  annualRatePct: number,
  years: number,
  compounding: CompoundingFrequency = 'monthly',
  timing: PaymentTiming = 'end'
): TvmScheduleEntry[] {
  const m = getCompoundingPeriodsPerYear(compounding);
  const totalYears = Math.min(100, Math.max(1, Math.ceil(years)));
  const periodicRate = (annualRatePct / 100) / m;
  const t = timing === 'beginning' ? 1 : 0;

  const schedule: TvmScheduleEntry[] = [];
  let currentBalance = Math.max(0, pv);
  let cumulativeContributions = pv;
  let cumulativeInterest = 0;

  for (let y = 1; y <= totalYears; y++) {
    const startYearBalance = currentBalance;
    let yearContributions = 0;
    let yearInterest = 0;

    // Simulate all m periods for this year
    for (let p = 1; p <= m; p++) {
      if (t === 1) {
        // Beginning of period: add payment before applying interest
        currentBalance += pmt;
        yearContributions += pmt;
        const interest = currentBalance * periodicRate;
        currentBalance += interest;
        yearInterest += interest;
      } else {
        // End of period: apply interest before adding payment
        const interest = currentBalance * periodicRate;
        currentBalance += interest + pmt;
        yearContributions += pmt;
        yearInterest += interest;
      }
    }

    cumulativeContributions += yearContributions;
    cumulativeInterest += yearInterest;

    schedule.push({
      period: y * m,
      year: y,
      startBalance: startYearBalance,
      contributions: yearContributions,
      interestEarned: yearInterest,
      endBalance: currentBalance,
      totalContributionsToDate: cumulativeContributions,
      totalInterestToDate: cumulativeInterest,
    });
  }

  return schedule;
}

/**
 * Main master calculation function for TVM.
 */
export function calculateTVM(params: TvmInputParams): TvmCalculationResult {
  const {
    mode = 'FV',
    compounding = 'monthly',
    timing = 'end',
  } = params;

  const m = getCompoundingPeriodsPerYear(compounding);
  let pv = Math.max(0, params.presentValue || 0);
  let pmt = Math.max(0, params.payment || 0);
  let annualRatePct = Math.max(0, params.annualRatePct || 0);
  let years = Math.max(0, params.years || 0);
  let fv = Math.max(0, params.targetFutureValue || 0);
  let isValid = true;
  let errorMessage: string | undefined;

  // Solve for requested target variable
  switch (mode) {
    case 'FV': {
      fv = calculateFutureValue(pv, pmt, annualRatePct, years, compounding, timing);
      break;
    }
    case 'PMT': {
      if (years <= 0) {
        isValid = false;
        errorMessage = 'Investment horizon must be greater than 0 years to calculate payment.';
        pmt = 0;
      } else {
        pmt = calculatePayment(fv, pv, annualRatePct, years, compounding, timing);
      }
      break;
    }
    case 'PV': {
      if (years <= 0) {
        pv = fv;
      } else {
        pv = calculatePresentValue(fv, pmt, annualRatePct, years, compounding, timing);
      }
      break;
    }
    case 'N': {
      const resN = calculatePeriodsInYears(fv, pv, pmt, annualRatePct, compounding, timing);
      isValid = resN.isValid;
      errorMessage = resN.errorMessage;
      years = resN.years;
      break;
    }
    case 'RATE': {
      if (years <= 0) {
        isValid = false;
        errorMessage = 'Investment horizon must be greater than 0 years to calculate return rate.';
        annualRatePct = 0;
      } else {
        const resRate = calculateAnnualRate(fv, pv, pmt, years, compounding, timing);
        isValid = resRate.isValid;
        errorMessage = resRate.errorMessage;
        annualRatePct = resRate.annualRatePct;
      }
      break;
    }
  }

  const totalPeriods = Math.ceil(years * m);
  const totalPrincipal = pv;
  const totalContributions = pmt * totalPeriods;
  const totalInvested = totalPrincipal + totalContributions;
  const totalInterestEarned = Math.max(0, fv - totalInvested);

  // Effective Annual Rate (EAR / APY)
  const periodicRate = (annualRatePct / 100) / m;
  const ear = (Math.pow(1 + periodicRate, m) - 1) * 100;
  const multiplier = totalInvested > 0 ? fv / totalInvested : (fv > 0 ? 1 : 0);

  // Generate schedule
  const schedule = (isValid && years > 0)
    ? generateTvmSchedule(pv, pmt, annualRatePct, years, compounding, timing)
    : [];

  return {
    mode,
    futureValue: parseFloat(fv.toFixed(2)),
    presentValue: parseFloat(pv.toFixed(2)),
    payment: parseFloat(pmt.toFixed(2)),
    annualRatePct: parseFloat(annualRatePct.toFixed(4)),
    years: parseFloat(years.toFixed(2)),
    compounding,
    compoundingPeriodsPerYear: m,
    totalPeriods,
    totalPrincipal: parseFloat(totalPrincipal.toFixed(2)),
    totalContributions: parseFloat(totalContributions.toFixed(2)),
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    totalInterestEarned: parseFloat(totalInterestEarned.toFixed(2)),
    effectiveAnnualRatePct: parseFloat(ear.toFixed(4)),
    multiplier: parseFloat(multiplier.toFixed(2)),
    schedule,
    isValid,
    errorMessage,
  };
}
