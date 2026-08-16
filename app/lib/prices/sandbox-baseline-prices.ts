/**
 * Single source of truth for sandbox baseline token prices (USD).
 *
 * WHY THIS EXISTS: lend, multiply, swap, and borrow each used to carry their own
 * hardcoded price map, and they disagreed badly — ETH read $3,500 on lend/multiply
 * but $1,934 on swap and ~$2,021 on borrow, so the SAME token balance showed a
 * different USD value depending on which screen you were on (e.g. dashboard Lend
 * vs Wallet). These are the realistic-tier values, aligned with the swap/wallet
 * surface and the live DefiLlama oracle used on detail pages (ETH ~$1.9k, not $3.5k).
 *
 * Any product that needs a static USD price for a symbol MUST read it from here.
 * Keys are UPPERCASE symbols. The detail-page single-asset "Price" quick-stat tile also
 * reads this baseline (via injectBaselinePrice in detail-page/live-detail-helpers), so the
 * tile agrees with the collateral valuation shown beside it instead of drifting to the live
 * oracle. The live Convex `tokenPrices` (DefiLlama) via token-prices-context is still used
 * for the borrow-list pair exchange-rate cells, which are intentionally live.
 */
export const SANDBOX_BASELINE_PRICES_USD: Record<string, number> = {
  // Stablecoins
  USDC: 1,
  USDT: 1,
  DAI: 1,
  GHO: 1,
  CRVUSD: 1,
  FRXUSD: 1,
  USDG: 1,
  RLUSD: 1,
  EURC: 1.08,
  // ETH and liquid-staking derivatives (ratios to ETH preserved from the prior maps)
  ETH: 1934,
  WETH: 1934,
  STETH: 1930,
  WSTETH: 2100,
  RETH: 2045,
  CBETH: 1990,
  WEETH: 2017,
  // BTC family
  BTC: 65000,
  WBTC: 65000,
  CBBTC: 65000,
  // Governance / other majors
  AAVE: 105,
  UNI: 12,
  CRV: 0.5,
  LDO: 2,
  BAL: 3.3,
  GNO: 220,
  AERO: 2.25,
  ARB: 0.6,
  OP: 1.46,
  LINK: 18,
}

/** Baseline USD price for a symbol, defaulting to $1 for unknown/stable-like ids. */
export function sandboxBaselinePriceUsd(symbol: string): number {
  return SANDBOX_BASELINE_PRICES_USD[symbol?.toUpperCase()] ?? 1
}
