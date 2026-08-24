// A multiply market's "open" flow caps collateral at the wallet's spendable balance
// of that market's collateral token — surfaced as a per-market USD bucket in
// `MultiplySystemState.walletBalancesUsd`. Convex only writes an explicit "available"
// multiplyBalances row when a prior multiply flow parked collateral there, so a wallet
// that simply HOLDS the collateral token (its real liquid balance) had an empty bucket
// and the flow blocked with a misleading "Max 0". This derives the bucket from the
// wallet's real liquid holdings of the collateral token whenever no explicit row exists.

/** A wallet's liquid holding of a single token (walletLiquidBalances view, minimally typed). */
export type MultiplyLiquidHolding = {
  symbol: string
  valueUsd: number
}

/**
 * Per-market collateral budget (USD) for a wallet, keyed by market id.
 *
 * Explicit `multiplyBalances` "available" buckets always win. For any market with no
 * explicit (or a zero) bucket, fall back to the wallet's real liquid holding of that
 * market's collateral token (matched by symbol, case-insensitively) so a market whose
 * collateral the wallet actually holds is openable instead of showing "Max 0".
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
