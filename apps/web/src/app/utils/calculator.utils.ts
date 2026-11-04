import {
  AvgCostSimulationResult,
  PositionSnapshot,
  SimulatedStep,
  SimulationDeltaMetrics,
  SimulationStateMetrics,
  TargetAvgCostGoalInput,
  TargetAvgCostGoalResult,
} from '../models/tools.model';

/**
 * Calculates the forward simulation of multiple Buy/Sell steps on an initial position.
 */
export function simulateAvgCost(
  initial: PositionSnapshot,
  steps: SimulatedStep[]
): AvgCostSimulationResult {
  let curShares = Math.max(0, initial.totalShares);
  let curCost = Math.max(0, initial.totalCost);
  let curAvg = curShares > 0 ? curCost / curShares : initial.averageCost;

  let totalOutlay = 0;
  let totalProceeds = 0;
  let totalFees = 0;
  let realizedPL = 0;

  const processedSteps: SimulatedStep[] = [];

  for (const step of steps) {
    const feePct = Math.max(0, step.feePercent || 0);
    const shares = Math.max(0, step.shares || 0);
    const price = Math.max(0, step.price || 0);

    if (shares === 0 || price === 0) {
      continue;
    }

    if (step.action === 'BUY') {
      const gross = shares * price;
      const feeAmount = gross * (feePct / 100);
      const totalStepCost = gross + feeAmount;

      curShares += shares;
      curCost += totalStepCost;
      curAvg = curShares > 0 ? curCost / curShares : 0;

      totalOutlay += totalStepCost;
      totalFees += feeAmount;

      processedSteps.push({
        ...step,
        shares,
        price,
        feePercent: feePct,
        feeAmount,
        totalCost: totalStepCost,
      });
    } else if (step.action === 'SELL') {
      const sellShares = Math.min(shares, curShares);
      if (sellShares <= 0) {
        continue;
      }

      const gross = sellShares * price;
      const feeAmount = gross * (feePct / 100);
      const netProceeds = gross - feeAmount;

      const costBasisOfSold = sellShares * curAvg;
      const stepRealized = netProceeds - costBasisOfSold;

      curShares -= sellShares;
      curCost = Math.max(0, curCost - costBasisOfSold);
      curAvg = curShares > 0 ? curCost / curShares : 0;

      totalProceeds += netProceeds;
      totalFees += feeAmount;
      realizedPL += stepRealized;

      processedSteps.push({
        ...step,
        shares: sellShares,
        price,
        feePercent: feePct,
        feeAmount,
        totalCost: netProceeds,
      });
    }
  }

  const marketPrice = initial.currentPrice;
  const holdingValue = curShares * marketPrice;
  const unrealizedPL = curShares > 0 && marketPrice > 0 ? holdingValue - curCost : 0;
  const unrealizedPLPercent = curCost > 0 ? (unrealizedPL / curCost) * 100 : 0;

  const simulated: SimulationStateMetrics = {
    totalShares: curShares,
    averageCost: curAvg,
    totalCost: curCost,
    currentPrice: marketPrice,
    holdingValue,
    unrealizedPL,
    unrealizedPLPercent,
    realizedPL,
    totalOutlay,
    totalProceeds,
    totalFees,
  };

  const deltaShares = curShares - initial.totalShares;
  const deltaSharesPercent =
    initial.totalShares > 0 ? (deltaShares / initial.totalShares) * 100 : 0;

  const deltaAvgCost = curAvg - initial.averageCost;
  const deltaAvgCostPercent =
    initial.averageCost > 0 ? (deltaAvgCost / initial.averageCost) * 100 : 0;

  const deltaTotalCost = curCost - initial.totalCost;
  const deltaHoldingValue = holdingValue - initial.holdingValue;
  const deltaUnrealizedPL = unrealizedPL - initial.unrealizedPL;
  const deltaUnrealizedPLPercent = unrealizedPLPercent - initial.unrealizedPLPercent;

  const breakevenDistanceInitial =
    initial.currentPrice > 0
      ? ((initial.averageCost - initial.currentPrice) / initial.currentPrice) * 100
      : 0;

  const breakevenDistanceSimulated =
    initial.currentPrice > 0
      ? ((curAvg - initial.currentPrice) / initial.currentPrice) * 100
      : 0;

  const delta: SimulationDeltaMetrics = {
    shares: deltaShares,
    sharesPercent: deltaSharesPercent,
    averageCost: deltaAvgCost,
    averageCostPercent: deltaAvgCostPercent,
    totalCost: deltaTotalCost,
    holdingValue: deltaHoldingValue,
    unrealizedPL: deltaUnrealizedPL,
    unrealizedPLPercent: deltaUnrealizedPLPercent,
    breakevenDistanceInitial,
    breakevenDistanceSimulated,
  };

  return {
    initial,
    simulated,
    delta,
    steps: processedSteps,
  };
}

/**
 * Solves the number of shares and capital required at a purchase price to hit a desired average cost.
 */
export function solveTargetAvgCostGoal(input: TargetAvgCostGoalInput): TargetAvgCostGoalResult {
  const { currentShares, currentAvgCost, targetAvgCost, purchasePrice } = input;
  const feePct = Math.max(0, input.feePercent || 0);

  if (currentShares < 0 || currentAvgCost < 0 || targetAvgCost <= 0 || purchasePrice <= 0) {
    return {
      isValid: false,
      errorMessage: 'Please enter valid positive values for all inputs.',
      requiredShares: 0,
      requiredCapital: 0,
      feeAmount: 0,
      totalOutlay: 0,
      newTotalShares: 0,
      newTotalCost: 0,
      achievedAvgCost: 0,
    };
  }

  // If currently 0 shares, buying at purchase price determines initial cost
  if (currentShares === 0) {
    const effectivePrice = purchasePrice * (1 + feePct / 100);
    return {
      isValid: true,
      requiredShares: 1,
      requiredCapital: purchasePrice,
      feeAmount: purchasePrice * (feePct / 100),
      totalOutlay: effectivePrice,
      newTotalShares: 1,
      newTotalCost: effectivePrice,
      achievedAvgCost: effectivePrice,
    };
  }

  const effectivePurchasePrice = purchasePrice * (1 + feePct / 100);

  // Case 1: Averaging Down
  if (targetAvgCost < currentAvgCost) {
    if (effectivePurchasePrice >= targetAvgCost) {
      return {
        isValid: false,
        errorMessage: `Purchase price (${purchasePrice.toFixed(2)}) including fees (${feePct}%) is ${effectivePurchasePrice.toFixed(2)}, which is >= your target average cost (${targetAvgCost.toFixed(2)}). You cannot average down at or above your target.`,
        requiredShares: 0,
        requiredCapital: 0,
        feeAmount: 0,
        totalOutlay: 0,
        newTotalShares: 0,
        newTotalCost: 0,
        achievedAvgCost: 0,
      };
    }
  }

  // Case 2: Averaging Up
  if (targetAvgCost > currentAvgCost) {
    if (effectivePurchasePrice <= targetAvgCost) {
      return {
        isValid: false,
        errorMessage: `Purchase price (${purchasePrice.toFixed(2)}) is <= your target average cost (${targetAvgCost.toFixed(2)}). You cannot average up at or below your target.`,
        requiredShares: 0,
        requiredCapital: 0,
        feeAmount: 0,
        totalOutlay: 0,
        newTotalShares: 0,
        newTotalCost: 0,
        achievedAvgCost: 0,
      };
    }
  }

  // Case 3: Already at target
  if (Math.abs(targetAvgCost - currentAvgCost) < 0.0001) {
    return {
      isValid: true,
      requiredShares: 0,
      requiredCapital: 0,
      feeAmount: 0,
      totalOutlay: 0,
      newTotalShares: currentShares,
      newTotalCost: currentShares * currentAvgCost,
      achievedAvgCost: currentAvgCost,
    };
  }

  // Formula:
  // targetAvgCost = (currentCost + Q_req * effectivePurchasePrice) / (currentShares + Q_req)
  // targetAvgCost * (currentShares + Q_req) = currentCost + Q_req * effectivePurchasePrice
  // targetAvgCost * currentShares + targetAvgCost * Q_req = currentCost + Q_req * effectivePurchasePrice
  // Q_req * (targetAvgCost - effectivePurchasePrice) = currentCost - targetAvgCost * currentShares
  // Q_req = currentShares * (currentAvgCost - targetAvgCost) / (targetAvgCost - effectivePurchasePrice)

  const numerator = currentShares * (currentAvgCost - targetAvgCost);
  const denominator = targetAvgCost - effectivePurchasePrice;

  if (Math.abs(denominator) < 0.000001) {
    return {
      isValid: false,
      errorMessage: 'Cannot divide by zero. Please adjust your target average cost.',
      requiredShares: 0,
      requiredCapital: 0,
      feeAmount: 0,
      totalOutlay: 0,
      newTotalShares: 0,
      newTotalCost: 0,
      achievedAvgCost: 0,
    };
  }

  const requiredShares = numerator / denominator;

  if (requiredShares < 0 || !isFinite(requiredShares)) {
    return {
      isValid: false,
      errorMessage: 'No feasible solution found with the given parameters.',
      requiredShares: 0,
      requiredCapital: 0,
      feeAmount: 0,
      totalOutlay: 0,
      newTotalShares: 0,
      newTotalCost: 0,
      achievedAvgCost: 0,
    };
  }

  const requiredCapital = requiredShares * purchasePrice;
  const feeAmount = requiredCapital * (feePct / 100);
  const totalOutlay = requiredCapital + feeAmount;
  const newTotalShares = currentShares + requiredShares;
  const newTotalCost = currentShares * currentAvgCost + totalOutlay;
  const achievedAvgCost = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;

  return {
    isValid: true,
    requiredShares,
    requiredCapital,
    feeAmount,
    totalOutlay,
    newTotalShares,
    newTotalCost,
    achievedAvgCost,
  };
}

/**
 * Calculates a quick price multiplier (e.g. -5%, -10%, +5%) relative to a base price.
 */
export function getQuickAdjustedPrice(basePrice: number, percentChange: number): number {
  if (basePrice <= 0) return 0;
  const newPrice = basePrice * (1 + percentChange / 100);
  return Math.max(0.0001, parseFloat(newPrice.toFixed(4)));
}
