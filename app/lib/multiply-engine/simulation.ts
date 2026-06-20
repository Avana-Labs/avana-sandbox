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
  calculateTotalExposure,
} from "./formulas"
import type { DeleverageSimulation, MultiplyMarketRecord, MultiplyPosition, MultiplySimulation } from "./types"
import { validateDeleverageAction, validateMultiplyAction } from "./validation"

const DEFAULT_BASE_IMPACT = 0.001
const MAX_ALLOWED_PRICE_IMPACT = 0.05

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
}): MultiplySimulation {
  const { market, collateralAmount, selectedMultiplier, existingPosition } = params
  const collateralPriceUsd = market.collateralAsset.priceUsd
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

  const newTotalExposureUsd = calculateTotalExposure(initialCollateralValueUsd, selectedMultiplier)
  const newBorrowedExposureUsd = newTotalExposureUsd - initialCollateralValueUsd
  const effectiveAddedExposureUsd = newBorrowedExposureUsd * (1 - priceImpactPct)
  const newCollateralValueUsd = initialCollateralValueUsd + effectiveAddedExposureUsd
  const newDebtValueUsd = newBorrowedExposureUsd
  const existingCollateralValueUsd = existingPosition?.collateralValueUsd ?? 0
  const existingDebtValueUsd = existingPosition?.debtValueUsd ?? 0
  const finalCollateralValueUsd = existingCollateralValueUsd + newCollateralValueUsd
  const debtValueUsd = existingDebtValueUsd + newDebtValueUsd
  const finalCollateralAmount =
    (existingPosition?.collateralAmount ?? 0) + newCollateralValueUsd / collateralPriceUsd
  const equityValueUsd = finalCollateralValueUsd - debtValueUsd
  const effectiveMultiplier = equityValueUsd > 0 ? finalCollateralValueUsd / equityValueUsd : selectedMultiplier
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
}): DeleverageSimulation {
  const { market, position, targetMultiplier } = params
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

  const equityValueUsd = currentCollateralValueUsd - currentDebtValueUsd
  const denominator = 1 - targetMultiplier * priceImpactPct
  const collateralToUnwindUsd =
    denominator <= 0
      ? currentCollateralValueUsd
      : Math.min(
          currentCollateralValueUsd,
          Math.max(0, (currentCollateralValueUsd - targetMultiplier * equityValueUsd) / denominator),
        )
  const effectiveRepayUsd = collateralToUnwindUsd * (1 - priceImpactPct)
  const newDebtValueUsd = Math.max(0, currentDebtValueUsd - effectiveRepayUsd)
  const newCollateralValueUsd = currentCollateralValueUsd - collateralToUnwindUsd
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
