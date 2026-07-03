import {
  calculateLiquidationPrice,
  calculateMaxLeverageApy,
  calculateMultiplyHealthFactor,
  calculateMultiplyLtv,
  calculateNetApy,
  calculatePriceDropToLiquidationPct,
  calculatePriceImpact,
  calculateSafeMaxMultiplier,
  calculateTheoreticalMaxMultiplier,
  simulateCollateralLoop,
  simulateDeleverageToTarget,
} from "./formulas"
import type { DeleverageSimulation, MultiplyMarketRecord, MultiplyPosition, MultiplySimulation } from "./types"
import { validateDeleverageAction, validateMultiplyAction } from "./validation"

const DEFAULT_BASE_IMPACT = 0.001
const MAX_ALLOWED_PRICE_IMPACT = 0.05

/**
 * Re-price a stored multiply position against the CURRENT collateral price and
 * re-derive its dollar figures with the SAME engine math a live simulation uses
 * (`calculateMultiplyHealthFactor` / `calculateMultiplyLtv` / `calculateLiquidationPrice`).
 *
 * The stored primitives are `collateralAmount` (token quantity) and `debtValueUsd`;
 * everything else (`collateralValueUsd`, `healthFactor`, `ltv`, `liquidationPrice`) is
 * derived so a freshly-hydrated position and a just-simulated one agree instead of the
 * position carrying a frozen persisted health factor while the price moves.
 *
 * `collateralPriceOverrideUsd` defaults to the live market price so the read path stays
 * deterministic in tests (pass the price explicitly) yet reflects the current oracle in
 * production. A non-finite/non-positive override falls back to the market price.
 */
export function revalueMultiplyPosition(
  position: MultiplyPosition,
  market: MultiplyMarketRecord,
  collateralPriceOverrideUsd?: number,
): MultiplyPosition {
  const collateralPriceUsd =
    collateralPriceOverrideUsd != null &&
    Number.isFinite(collateralPriceOverrideUsd) &&
    collateralPriceOverrideUsd > 0
      ? collateralPriceOverrideUsd
      : market.collateralAsset.priceUsd
  const collateralValueUsd = position.collateralAmount * collateralPriceUsd
  const debtValueUsd = position.debtValueUsd
  const ltv = calculateMultiplyLtv(debtValueUsd, collateralValueUsd)
  const healthFactor = calculateMultiplyHealthFactor(
    collateralValueUsd,
    debtValueUsd,
    market.risk.liquidationThreshold,
  )
  const liquidationPrice = calculateLiquidationPrice({
    debtValueUsd,
    collateralAmount: position.collateralAmount,
    liquidationThreshold: market.risk.liquidationThreshold,
  })

  return {
    ...position,
    collateralValueUsd,
    ltv,
    healthFactor,
    liquidationPrice,
  }
}

function emptyBefore() {
  return {
    collateralValueUsd: 0,
    debtValueUsd: 0,
    ltv: 0,
    healthFactor: "infinity" as const,
    multiplier: 1,
    liquidationPrice: null,
  }
}

export function simulateMultiply(params: {
  market: MultiplyMarketRecord
  collateralAmount: number
  selectedMultiplier: number
  existingPosition?: MultiplyPosition | null
  collateralPriceOverrideUsd?: number
}): MultiplySimulation {
  const { market, collateralAmount, selectedMultiplier, existingPosition, collateralPriceOverrideUsd } = params
  const collateralPriceUsd =
    collateralPriceOverrideUsd != null && Number.isFinite(collateralPriceOverrideUsd) && collateralPriceOverrideUsd > 0
      ? collateralPriceOverrideUsd
      : market.collateralAsset.priceUsd
  const initialCollateralValueUsd = collateralAmount * collateralPriceUsd
  const priceImpactPct = calculatePriceImpact({
    baseImpact: DEFAULT_BASE_IMPACT,
    multiplier: selectedMultiplier,
    availableLiquidityUsd: market.economics.availableLiquidityUsd,
    collateralValueUsd: initialCollateralValueUsd,
  })

  const theoreticalMaxMultiplier = calculateTheoreticalMaxMultiplier(market.risk.maxLtv)
  const safeMaxMultiplier = calculateSafeMaxMultiplier({
    publicMaxMultiplier: market.risk.publicMaxMultiplier,
    theoreticalMaxMultiplier,
    minHealthFactor: market.risk.minHealthFactor,
    liquidationThreshold: market.risk.liquidationThreshold,
  })

  const swapEfficiency = Math.max(0, 1 - priceImpactPct)
  const loop = simulateCollateralLoop({
    initialCollateralUsd: initialCollateralValueUsd,
    targetMultiplier: selectedMultiplier,
    maxLtv: market.risk.maxLtv,
    swapEfficiency,
  })

  const newCollateralValueUsd = loop.collateralUsd
  const newDebtValueUsd = loop.debtUsd
  const existingCollateralValueUsd = existingPosition?.collateralValueUsd ?? 0
  const existingDebtValueUsd = existingPosition?.debtValueUsd ?? 0
  const finalCollateralValueUsd = existingCollateralValueUsd + newCollateralValueUsd
  const debtValueUsd = existingDebtValueUsd + newDebtValueUsd
  const finalCollateralAmount =
    (existingPosition?.collateralAmount ?? 0) + newCollateralValueUsd / collateralPriceUsd
  const equityValueUsd = finalCollateralValueUsd - debtValueUsd
  const effectiveMultiplier = equityValueUsd > 0 ? finalCollateralValueUsd / equityValueUsd : loop.achievedMultiplier
  const ltv = calculateMultiplyLtv(debtValueUsd, finalCollateralValueUsd)
  const healthFactor = calculateMultiplyHealthFactor(
    finalCollateralValueUsd,
    debtValueUsd,
    market.risk.liquidationThreshold,
  )
  const liquidationPrice = calculateLiquidationPrice({
    debtValueUsd,
    collateralAmount: finalCollateralAmount,
    liquidationThreshold: market.risk.liquidationThreshold,
  })
  const netApy = calculateNetApy({
    supplyApy: market.economics.supplyApy,
    borrowApy: market.economics.borrowApy,
    finalCollateralValueUsd,
    debtValueUsd,
    initialCollateralValueUsd: Math.max(1, finalCollateralValueUsd - debtValueUsd),
  })
  const maxLeverageApy = calculateMaxLeverageApy({
    supplyApy: market.economics.supplyApy,
    borrowApy: market.economics.borrowApy,
    safeMaxMultiplier,
  })

  const before = existingPosition
    ? {
        collateralValueUsd: existingPosition.collateralValueUsd,
        debtValueUsd: existingPosition.debtValueUsd,
        ltv: existingPosition.ltv,
        healthFactor: existingPosition.healthFactor,
        multiplier: existingPosition.multiplier,
        liquidationPrice: existingPosition.liquidationPrice,
      }
    : emptyBefore()

  const validation = validateMultiplyAction({
    selectedMultiplier,
    achievedMultiplier: loop.achievedMultiplier,
    loopSteps: loop.loops,
    theoreticalMaxMultiplier,
    publicMaxMultiplier: market.risk.publicMaxMultiplier,
    safeMaxMultiplier,
    recommendedMaxMultiplier: market.risk.recommendedMaxMultiplier,
    minHealthFactor: market.risk.minHealthFactor,
    maxLtv: market.risk.maxLtv,
    healthFactor,
    ltv,
    debtValueUsd,
    initialCollateralValueUsd,
    priceImpactPct,
    maxAllowedPriceImpact: MAX_ALLOWED_PRICE_IMPACT,
    netApy,
    supplyApy: market.economics.supplyApy,
    borrowApy: market.economics.borrowApy,
    liquidationPrice,
    collateralPriceUsd,
  })

  return {
    action: "multiply",
    input: { collateralAmount, selectedMultiplier },
    before,
    after: {
      collateralValueUsd: finalCollateralValueUsd,
      collateralAmount: finalCollateralAmount,
      debtValueUsd,
      ltv,
      healthFactor,
      multiplier: effectiveMultiplier,
      liquidationPrice,
      priceDropToLiquidationPct: calculatePriceDropToLiquidationPct(liquidationPrice, collateralPriceUsd),
    },
    economics: {
      supplyApy: market.economics.supplyApy,
      borrowApy: market.economics.borrowApy,
      netApy,
      maxLeverageApy,
      priceImpactPct,
    },
    limits: {
      maxLtv: market.risk.maxLtv,
      liquidationThreshold: market.risk.liquidationThreshold,
      theoreticalMaxMultiplier,
      safeMaxMultiplier,
      publicMaxMultiplier: market.risk.publicMaxMultiplier,
      recommendedMaxMultiplier: market.risk.recommendedMaxMultiplier,
      minHealthFactor: market.risk.minHealthFactor,
    },
    validation,
  }
}

export function simulateDeleverage(params: {
  market: MultiplyMarketRecord
  position: MultiplyPosition
  targetMultiplier: number
  repayAmountUsd?: number
}): DeleverageSimulation {
  const { market, position, targetMultiplier, repayAmountUsd } = params
  const collateralPriceUsd = market.collateralAsset.priceUsd
  const currentCollateralValueUsd = position.collateralValueUsd
  const currentDebtValueUsd = position.debtValueUsd
  const currentMultiplier = position.multiplier

  const priceImpactPct = calculatePriceImpact({
    baseImpact: DEFAULT_BASE_IMPACT,
    multiplier: currentMultiplier,
    availableLiquidityUsd: market.economics.availableLiquidityUsd,
    collateralValueUsd: currentCollateralValueUsd,
  })

  const swapEfficiency = Math.max(0, 1 - priceImpactPct)
  const unwind = simulateDeleverageToTarget({
    collateralUsd: currentCollateralValueUsd,
    debtUsd: currentDebtValueUsd,
    targetMultiplier,
    swapEfficiency,
    repayAmountUsd,
  })

  const collateralToUnwindUsd = unwind.collateralUnwoundUsd
  const effectiveRepayUsd = unwind.debtRepaidUsd
  const newDebtValueUsd = unwind.debtUsd
  const newCollateralValueUsd = unwind.collateralUsd
  const targetDebtValueUsd = Math.max(0, newDebtValueUsd)
  const debtToRepayUsd = currentDebtValueUsd - newDebtValueUsd
  const newCollateralAmount = newCollateralValueUsd / collateralPriceUsd
  const newEquityValueUsd = newCollateralValueUsd - newDebtValueUsd
  const newMultiplier = newEquityValueUsd > 0 ? newCollateralValueUsd / newEquityValueUsd : 1
  const newLtv = calculateMultiplyLtv(newDebtValueUsd, newCollateralValueUsd)
  const newHealthFactor = calculateMultiplyHealthFactor(
    newCollateralValueUsd,
    newDebtValueUsd,
    market.risk.liquidationThreshold,
  )
  const newLiquidationPrice = calculateLiquidationPrice({
    debtValueUsd: newDebtValueUsd,
    collateralAmount: newCollateralAmount,
    liquidationThreshold: market.risk.liquidationThreshold,
  })
  const newNetApy = calculateNetApy({
    supplyApy: market.economics.supplyApy,
    borrowApy: market.economics.borrowApy,
    finalCollateralValueUsd: newCollateralValueUsd,
    debtValueUsd: newDebtValueUsd,
    initialCollateralValueUsd: Math.max(1, newCollateralValueUsd - newDebtValueUsd),
  })

  const validation = validateDeleverageAction({
    targetMultiplier,
    currentMultiplier,
    targetDebtValueUsd,
    currentDebtValueUsd,
    newHealthFactor,
    minHealthFactor: market.risk.minHealthFactor,
    priceImpactPct,
    maxAllowedPriceImpact: MAX_ALLOWED_PRICE_IMPACT,
  })

  return {
    action: "deleverage",
    input: { currentMultiplier, targetMultiplier },
    before: {
      collateralValueUsd: currentCollateralValueUsd,
      debtValueUsd: currentDebtValueUsd,
      ltv: position.ltv,
      healthFactor: position.healthFactor,
      multiplier: currentMultiplier,
      liquidationPrice: position.liquidationPrice,
    },
    after: {
      collateralValueUsd: newCollateralValueUsd,
      debtValueUsd: newDebtValueUsd,
      debtRepaidUsd: debtToRepayUsd,
      collateralUnwoundUsd: collateralToUnwindUsd,
      ltv: newLtv,
      healthFactor: newHealthFactor,
      multiplier: newMultiplier,
      liquidationPrice: newLiquidationPrice,
    },
    economics: {
      priceImpactPct,
      effectiveRepayUsd,
      netApy: newNetApy,
    },
    validation,
  }
}
