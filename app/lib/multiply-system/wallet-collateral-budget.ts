// The open flow caps collateral at a per-market USD bucket in `walletBalancesUsd`. Convex only
// writes an explicit multiplyBalances row when a prior multiply flow parked collateral there, so
// when none exists the bucket is derived from the wallet's real liquid holdings of that token —
// otherwise a wallet merely holding the token blocks with "Max 0".

/** A wallet's liquid holding of a single token (walletLiquidBalances view, minimally typed). */
type MultiplyLiquidHolding = {
  symbol: string
  valueUsd: number
}

/**
 * Per-market collateral budget (USD), keyed by market id. Explicit `multiplyBalances` "available"
 * buckets always win; a missing or zero bucket falls back to the wallet's liquid holding of that
 * market's collateral token, matched by symbol case-insensitively.
 */
export function deriveMultiplyCollateralBudgetUsd({
  explicitBucketsUsd,
  markets,
  liquidHoldings,
}: {
  explicitBucketsUsd: Record<string, number>
  markets: Record<string, { collateralAsset: { symbol: string } }>
  liquidHoldings: readonly MultiplyLiquidHolding[]
}): Record<string, number> {
  const liquidUsdBySymbol = new Map<string, number>()
  for (const holding of liquidHoldings) {
    const symbol = holding?.symbol?.toLowerCase()
    if (!symbol || !Number.isFinite(holding.valueUsd) || holding.valueUsd <= 0) continue
    liquidUsdBySymbol.set(symbol, (liquidUsdBySymbol.get(symbol) ?? 0) + holding.valueUsd)
  }

  const buckets: Record<string, number> = { ...explicitBucketsUsd }
  for (const [marketId, market] of Object.entries(markets)) {
    if ((buckets[marketId] ?? 0) > 0) continue
    const symbol = market.collateralAsset?.symbol?.toLowerCase()
    if (!symbol) continue
    const liquidUsd = liquidUsdBySymbol.get(symbol)
    if (liquidUsd && liquidUsd > 0) buckets[marketId] = liquidUsd
  }
  return buckets
}
