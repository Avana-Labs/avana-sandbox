import { priceKey } from "./format"
import { PRICE_FIXTURE } from "./price-fixture"

/**
 * Canonical per-token USD price — the SINGLE basis every surface reads: the borrow list price +
 * token quantities, the detail "Price" tile, the pool pair price, the swap catalog, and (via
 * sandboxBaselinePriceUsd) the engine valuation. One basis means a token can never show two prices
 * one click apart, and pool pair prices are exact PA/PB ratios of the per-token prices.
 *
 * The values live in a mutable module store seeded with the deterministic PRICE_FIXTURE so SSR,
 * tests, and offline renders are stable. At runtime the live Convex oracle (convex/prices.ts,
 * DefiLlama) overlays it via `setCanonicalPrices` — so connected clients value positions at the
 * real refreshed price, and a token the oracle doesn't cover falls back to the fixture. A symbol
 * in NEITHER resolves to `undefined` (unavailable), never a fabricated number.
 */

/** UPPERCASE symbol → USD price. Seeded with the fixture; overlaid by the live oracle. */
let priceStore: Record<string, number> = { ...PRICE_FIXTURE }

function normalizePrices(next: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [symbol, price] of Object.entries(next)) {
    if (Number.isFinite(price) && price > 0) out[symbol.toUpperCase()] = price
  }
  return out
}

/**
 * Overlay live oracle prices onto the canonical store (client-only). Kept on TOP of the fixture so
 * a partial oracle response (missing an exotic token) still resolves the covered majors instead of
 * going unavailable. Non-finite/non-positive quotes are dropped.
 */
export function setCanonicalPrices(next: Record<string, number>): void {
  priceStore = { ...PRICE_FIXTURE, ...normalizePrices(next) }
}

/** Reset the store to the deterministic fixture (used by test setup to prevent cross-test leakage). */
export function resetCanonicalPrices(): void {
  priceStore = { ...PRICE_FIXTURE }
}

export type CanonicalPrice = {
  /** Uppercase token symbol. */
  symbol: string
  priceUsd: number
  /** Provenance of the snapshot (kept for the { symbol, priceUsd, updatedAt, source } contract). */
  source: string
}

export const CANONICAL_PRICE_SOURCE = "canonical-store"

/**
 * Canonical USD price for a symbol, or `undefined` when neither the live oracle nor the fixture
 * covers it. Deliberately strict (no `?? 1` default) so callers fall back to their own label
 * instead of silently rendering "$1.00" for an unpriced asset. Engine code that needs a guaranteed
 * number uses `sandboxBaselinePriceUsd` (same store, last-resort default of 1).
 */
export function canonicalPriceUsd(symbol: string): number | undefined {
  if (!symbol) return undefined
  return priceStore[symbol.toUpperCase()]
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
  for (const [symbol, priceUsd] of Object.entries(priceStore)) {
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
