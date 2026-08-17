import { priceKey } from "./format"
import { SANDBOX_BASELINE_PRICES_USD } from "./sandbox-baseline-prices"

/**
 * Canonical per-token USD price — the SINGLE basis every surface reads: the borrow list
 * price + token quantities, the detail "Price" tile, the pool pair price, the swap catalog,
 * and (via sandboxBaselinePriceUsd) the engine valuation. Collapsing to one basis means the
 * same token can never show two different prices one click apart (list vs detail), and pool
 * pair prices are exact PA/PB ratios of the per-token prices shown elsewhere.
 *
 * Values are the deterministic sandbox snapshot (SANDBOX_BASELINE_PRICES_USD). The live
 * DefiLlama oracle (convex/prices.ts) is what a refresh job snapshots FROM and what drives the
 * freshness hint (usePriceFreshness) — no surface renders a different, live-ticking number than
 * the engine values positions at.
 */

export type CanonicalPrice = {
  /** Uppercase token symbol. */
  symbol: string
  priceUsd: number
  /** Provenance of the snapshot (kept for the { symbol, priceUsd, updatedAt, source } contract). */
  source: string
}

export const CANONICAL_PRICE_SOURCE = "sandbox-snapshot"

/**
 * Canonical USD price for a symbol, or `undefined` when the token is not in the snapshot.
 * Deliberately strict (no `?? 1` default) so callers fall back to their own label instead of
 * silently rendering "$1.00" for an unpriced asset. Engine code that needs a guaranteed number
 * keeps using `sandboxBaselinePriceUsd` (same values, defaults to 1).
 */
export function canonicalPriceUsd(symbol: string): number | undefined {
  if (!symbol) return undefined
  return SANDBOX_BASELINE_PRICES_USD[symbol.toUpperCase()]
}

/** The full canonical object for a symbol, or `undefined` when unpriced. */
export function getCanonicalPrice(symbol: string): CanonicalPrice | undefined {
  const priceUsd = canonicalPriceUsd(symbol)
  if (priceUsd === undefined) return undefined
  return { symbol: symbol.toUpperCase(), priceUsd, source: CANONICAL_PRICE_SOURCE }
}

/**
 * Canonical prices keyed by `priceKey` (lowercased symbol), matching the shape the pool
 * oracle path (`injectPoolOraclePrice`) consumes. Lets the detail page read the deterministic
 * canonical basis instead of a separate live-oracle fetch.
 */
export function canonicalPriceMap(): Record<string, number> {
  const map: Record<string, number> = {}
  for (const [symbol, priceUsd] of Object.entries(SANDBOX_BASELINE_PRICES_USD)) {
    map[priceKey(symbol)] = priceUsd
  }
  return map
}

/**
 * Pool pair spot price: `base` denominated in `quote` = P(base) / P(quote). Derived from the
 * canonical single-token USD prices so it is always consistent with the prices shown on the
 * token rows and tiles. Returns `undefined` when either side is unpriced or the quote is ≤ 0
 * (the caller drops the stat rather than showing a fabricated value).
 *
 * Float division is safe here because the result is a displayed ratio formatted to a few
 * decimals; on-chain position math uses bigint fixed-point (see credit-engine/units.ts).
 * Examples: ETH/USDC = 1934, USDC/ETH = 1/1934, WBTC/ETH = 65000/1934 ≈ 33.6, USDC/USDT ≈ 1.
 */
export function poolPairPriceUsd(base: string, quote: string): number | undefined {
  const p0 = canonicalPriceUsd(base)
  const p1 = canonicalPriceUsd(quote)
  if (p0 === undefined || p1 === undefined) return undefined
  if (!Number.isFinite(p0) || !Number.isFinite(p1) || p1 <= 0) return undefined
  return p0 / p1
}
