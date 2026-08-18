/**
 * Outlook / forecast core — pure math + shared types for the per-tab "Outlook"
 * sections (Lend / Borrow / Multiply).
 *
 * UI-only phase: everything here is fed by the mock module (`mock-data.ts`) and
 * carries the same *shape* the real Convex hydrators will eventually return, so
 * the later wiring pass is a data-source swap, not a rewrite. No Convex imports,
 * no session reads — keep this tree self-contained and trivially removable.
 */

// ────────────────────────────────────────────────────────────────────────────
// Timeframes
// ────────────────────────────────────────────────────────────────────────────

export type TimeframeId = "1D" | "1W" | "1M" | "3M" | "1Y"

export interface Timeframe {
  id: TimeframeId
  /** Short chip label. */
  label: string
  /** Horizon length in days used by the projection math. */
  days: number
}

// Forward horizons only — an "All / realized" column has no place in a projection.
export const TIMEFRAMES: Timeframe[] = [
  { id: "1D", label: "1D", days: 1 },
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "3M", label: "3M", days: 91 },
  { id: "1Y", label: "1Y", days: 365 },
]

// ────────────────────────────────────────────────────────────────────────────
// Scenarios (bear / base / bull bands)
// ────────────────────────────────────────────────────────────────────────────

export type ScenarioId = "bear" | "base" | "bull"

export interface Scenario {
  id: ScenarioId
  label: string
  /** Multiplier applied to the *yield* rate (supply APY / staking APR). */
  yieldMultiplier: number
  /** Multiplier applied to the *cost* rate (borrow APR). Bear = costs rise. */
  costMultiplier: number
  /** Fractional collateral price move applied in risk scenarios (bear = drop). */
  priceMove: number
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  bear: { id: "bear", label: "Bear", yieldMultiplier: 0.7, costMultiplier: 1.4, priceMove: -0.25 },
  base: { id: "base", label: "Base", yieldMultiplier: 1, costMultiplier: 1, priceMove: 0 },
  bull: { id: "bull", label: "Bull", yieldMultiplier: 1.3, costMultiplier: 0.8, priceMove: 0.25 },
}

export const SCENARIO_ORDER: ScenarioId[] = ["bear", "base", "bull"]

// ────────────────────────────────────────────────────────────────────────────
// Projection math
//
// Displayed APY is treated as the annual growth factor and interpolated by
// fractional years, so the 1Y figure always equals P·APY exactly. This mirrors
// how Morpho / Summer.fi / Spark present monthly + yearly projected earnings.
//   projectedBalance(t)  = P · (1 + apy)^(t / 365)
//   projectedEarnings(t) = P · ((1 + apy)^(t / 365) − 1)
// ────────────────────────────────────────────────────────────────────────────

/** Compound interest earned on `principal` at `apyPct` (%) over `days`. */
export function projectedEarnings(principal: number, apyPct: number, days: number): number {
  if (principal <= 0 || days <= 0) return 0
  const apy = apyPct / 100
  return principal * (Math.pow(1 + apy, days / 365) - 1)
}

/** Ending balance = principal + projected earnings. */
export function projectedBalance(principal: number, apyPct: number, days: number): number {
  return principal + projectedEarnings(principal, apyPct, days)
}

/** Apply a scenario's yield multiplier to a base APY. */
export function scenarioYield(baseApyPct: number, scenario: ScenarioId): number {
  return baseApyPct * SCENARIOS[scenario].yieldMultiplier
}

/** Apply a scenario's cost multiplier to a borrow APR. */
export function scenarioCost(baseAprPct: number, scenario: ScenarioId): number {
  return baseAprPct * SCENARIOS[scenario].costMultiplier
}

// ────────────────────────────────────────────────────────────────────────────
// Leverage / looping math (Multiply)
//   k     = 1 / (1 − LTV)
//   netAPY = k·yield − (k−1)·cost = yield + (k−1)·(yield − cost)
//   P_liq  = P0 · (k−1) / (k · liqThreshold)
//   HF     = (collateralValue · liqThreshold) / debt
// ────────────────────────────────────────────────────────────────────────────

/** Leverage multiplier from a target loan-to-value (0–1). */
export function leverageFromLtv(ltv: number): number {
  if (ltv <= 0) return 1
  if (ltv >= 1) return Infinity
  return 1 / (1 - ltv)
}

/** Net/effective APY (%) of a looped position on equity. */
export function netLoopApy(yieldPct: number, costPct: number, leverage: number): number {
  return leverage * yieldPct - (leverage - 1) * costPct
}

/** Spread (%) = yield − cost. Non-positive means leverage is destroying value. */
export function loopSpread(yieldPct: number, costPct: number): number {
  return yieldPct - costPct
}

/** Liquidation price for a looped/borrow position, holding all else equal. */
export function liquidationPrice(currentPrice: number, leverage: number, liqThreshold: number): number {
  if (leverage <= 1 || liqThreshold <= 0) return 0
  return (currentPrice * (leverage - 1)) / (leverage * liqThreshold)
}

/** Fractional price drop the collateral can absorb before liquidation (0–1). */
export function dropBuffer(currentPrice: number, liqPrice: number): number {
  if (currentPrice <= 0) return 0
  return Math.max(0, (currentPrice - liqPrice) / currentPrice)
}

/** Health factor = (collateral value · liq threshold) / debt. */
export function healthFactor(collateralValueUsd: number, liqThreshold: number, debtUsd: number): number {
  if (debtUsd <= 0) return Infinity
  return (collateralValueUsd * liqThreshold) / debtUsd
}
