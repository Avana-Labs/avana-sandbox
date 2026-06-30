/**
 * Shared formatting for the real token-price oracle (Convex `tokenPrices`, sourced
 * from DefiLlama). Used server-side (asset detail "Price") and client-side (the
 * borrow-list price-under-logos). Pure — no React, no server-only imports.
 */

/** Normalize a token symbol to the oracle's key (lowercase base id, e.g. "WETH" → "weth"). */
export function priceKey(symbol: string): string {
  return symbol.trim().toLowerCase()
}

/** Format a USD token price: "$1,612.87", "$1.00", "$0.9997" (more precision under $1). */
export function formatTokenPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—"
  if (value >= 1) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

/**
 * Pair exchange rate label for an LP pair, e.g. "1 ETH = 1,612 USDC". `priceFor`
 * resolves a symbol to its USD price; returns null if either side is unpriced so
 * the caller can fall back. The rate is token0-priced-in-token1 (price0 / price1).
 */
export function pairExchangeRateLabel(
  symbol0: string,
  symbol1: string,
  priceFor: (symbol: string) => number | undefined,
): string | null {
  const p0 = priceFor(symbol0)
  const p1 = priceFor(symbol1)
  if (!p0 || !p1) return null
  const rate = p0 / p1
  const rateStr =
    rate >= 1000
      ? rate.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : rate >= 1
        ? rate.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : rate.toLocaleString(undefined, { maximumFractionDigits: 6 })
  return `1 ${symbol0} = ${rateStr} ${symbol1}`
}
