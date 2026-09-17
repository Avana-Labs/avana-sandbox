/**
 * Canonical display casing for token symbols — the single source of truth shared by the multiply
 * catalog (app) and the sandbox balance writers (Convex).
 *
 * PURE module (no runtime imports) so Convex can bundle it, and so a cased mismatch never silently
 * falls through a lookup again: the multiply catalog declared UPPERCASE collateral symbols (STETH,
 * CBBTC…) that missed the correctly-cased per-token maps (stETH, cbBTC…), and Convex persisted blind
 * `toUpperCase()` display symbols. This set mirrors the keys of MULTIPLY_TOKEN_LOGOS in
 * app/lib/multiply-sim.ts — keep the two in sync (tsc flags drift where catalog.ts indexes
 * MULTIPLY_COLLATERAL_FACTORS with a `CanonicalTokenSymbol`). Symbols outside this set keep their
 * blind-uppercase casing (already canonical for all-caps tickers like ETH/USDC/WBTC), so callers
 * never regress an unknown symbol or a market slug.
 */
export const CANONICAL_TOKEN_SYMBOLS = [
  "ETH",
  "stETH",
  "wstETH",
  "rETH",
  "cbETH",
  "USDT",
  "USDC",
  "DAI",
  "GHO",
  "crvUSD",
  "EURC",
  "WBTC",
  "cbBTC",
  "AAVE",
  "UNI",
  "CRV",
] as const

export type CanonicalTokenSymbol = (typeof CANONICAL_TOKEN_SYMBOLS)[number]

const CANONICAL_BY_LOWER: ReadonlyMap<string, CanonicalTokenSymbol> = new Map(
  CANONICAL_TOKEN_SYMBOLS.map((symbol) => [symbol.toLowerCase(), symbol] as const),
)

/** Canonical casing for a known token symbol (case-insensitive), or null when the symbol is unknown. */
export function canonicalTokenSymbol(symbol: string): CanonicalTokenSymbol | null {
  return CANONICAL_BY_LOWER.get(symbol.trim().toLowerCase()) ?? null
}

/** Canonical casing when the symbol is known, else the blind uppercase used before (safe for slugs). */
export function canonicalTokenSymbolOrUpper(symbol: string): string {
  return canonicalTokenSymbol(symbol) ?? symbol.trim().toUpperCase()
}
