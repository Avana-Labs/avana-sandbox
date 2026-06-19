export function calculateTheoreticalMaxMultiplier(maxLtv: number): number {
  if (maxLtv >= 1) return Number.POSITIVE_INFINITY
  return 1 / (1 - maxLtv)
}

export function calculateSafeMaxMultiplier(params: {
  publicMaxMultiplier: number
  theoreticalMaxMultiplier: number
  minHealthFactor: number
  liquidationThreshold: number
}): number {
  const hfBased = params.minHealthFactor / (params.minHealthFactor - params.liquidationThreshold)
  return Math.min(params.publicMaxMultiplier, params.theoreticalMaxMultiplier, hfBased)
}

export function calculateTotalExposure(initialCollateralValueUsd: number, selectedMultiplier: number): number {
  return initialCollateralValueUsd * selectedMultiplier
}

export function calculateMultiplyLtv(debtValueUsd: number, collateralValueUsd: number): number {
  if (collateralValueUsd <= 0) return 0
  return debtValueUsd / collateralValueUsd
}

export function calculateMultiplyHealthFactor(
  collateralValueUsd: number,
  debtValueUsd: number,
  liquidationThreshold: number,
): number | "infinity" {
  if (debtValueUsd <= 0) return "infinity"
  return (collateralValueUsd * liquidationThreshold) / debtValueUsd
}

export function calculateLiquidationPrice(params: {
  debtValueUsd: number
  collateralAmount: number
  liquidationThreshold: number
}): number | null {
  if (params.debtValueUsd <= 0 || params.collateralAmount <= 0 || params.liquidationThreshold <= 0) {
    return null
  }
  return params.debtValueUsd / (params.collateralAmount * params.liquidationThreshold)
}

export function calculateNetApy(params: {
  supplyApy: number
  borrowApy: number
  finalCollateralValueUsd: number
  debtValueUsd: number
  initialCollateralValueUsd: number
}): number {
  if (params.initialCollateralValueUsd <= 0) return 0
  return (
    (params.supplyApy * params.finalCollateralValueUsd - params.borrowApy * params.debtValueUsd) /
    params.initialCollateralValueUsd
  )
}

export function calculateMaxLeverageApy(params: {
  supplyApy: number
  borrowApy: number
  safeMaxMultiplier: number
}): number {
  return params.supplyApy * params.safeMaxMultiplier - params.borrowApy * (params.safeMaxMultiplier - 1)
}

export function calculatePriceImpact(params: {
  baseImpact: number
  multiplier: number
  availableLiquidityUsd: number
  collateralValueUsd: number
}): number {
  const multiplierImpact = Math.max(0, params.multiplier - 1) * 0.0005
  const liquidityImpact =
    params.availableLiquidityUsd > 0 ? Math.min(0.01, params.collateralValueUsd / params.availableLiquidityUsd) * 0.002 : 0.002
  return params.baseImpact + multiplierImpact + liquidityImpact
}

export function calculatePriceDropToLiquidationPct(
  liquidationPrice: number | null,
  collateralPriceUsd: number,
): number | null {
  if (liquidationPrice === null || collateralPriceUsd <= 0) return null
  return 1 - liquidationPrice / collateralPriceUsd
}

export function calculateLoopSteps(maxLtv: number, targetMultiplier: number): number {
  if (targetMultiplier <= 1 || maxLtv >= 1) return 0
  const stepFactor = 1 / (1 - maxLtv)
  if (stepFactor <= 1) return 1
  return Math.max(1, Math.ceil(Math.log(targetMultiplier) / Math.log(stepFactor)))
}

export function isCorrelatedPair(collateralSymbol: string, borrowSymbol: string): boolean {
  const ethFamily = new Set(["ETH", "WETH", "STETH", "WSTETH", "RETH", "CBETH"])
  const btcFamily = new Set(["WBTC", "CBBTC", "BTC"])
  const stableFamily = new Set(["USDC", "USDT", "DAI", "GHO", "CRVUSD", "EURC"])
  const collateral = collateralSymbol.toUpperCase()
  const borrow = borrowSymbol.toUpperCase()
  if (ethFamily.has(collateral) && ethFamily.has(borrow)) return true
  if (btcFamily.has(collateral) && btcFamily.has(borrow)) return true
  if (stableFamily.has(collateral) && stableFamily.has(borrow)) return true
  return false
}
