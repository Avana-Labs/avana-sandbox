/** Catalog tables intentionally inflate leverage labels for discovery UI only. */
export const MULTIPLY_CATALOG_LEVERAGE_SCALE = 3

/** Multiply action modal slider range (independent of per-market public caps). */
export const MULTIPLY_ACTION_MIN_LEVERAGE = 1
export const MULTIPLY_ACTION_MAX_LEVERAGE = 10

/**
 * Action pages should use the seeded market cap, not the scaled catalog label.
 * The state model currently stores the scaled value, so divide it back down here.
 */
export function resolveMultiplyMarketMaxLeverage(publicMaxMultiplier: number | undefined) {
  if (!Number.isFinite(publicMaxMultiplier) || publicMaxMultiplier == null || publicMaxMultiplier < 1) {
    return MULTIPLY_ACTION_MAX_LEVERAGE
  }

  const actionCap = publicMaxMultiplier / MULTIPLY_CATALOG_LEVERAGE_SCALE
  return Math.min(MULTIPLY_ACTION_MAX_LEVERAGE, actionCap)
}

export function getDefaultDeleverageMultiplier(currentMultiplier: number) {
  if (!Number.isFinite(currentMultiplier)) return String(MULTIPLY_ACTION_MIN_LEVERAGE)
  const lowered = Math.max(MULTIPLY_ACTION_MIN_LEVERAGE, currentMultiplier - 0.5)
  return String(Number(lowered.toFixed(2)))
}

export function getDeleverageMultiplierMax(currentMultiplier: number, step = 0.1) {
  if (!Number.isFinite(currentMultiplier)) return MULTIPLY_ACTION_MIN_LEVERAGE
  const upperBound = Math.max(MULTIPLY_ACTION_MIN_LEVERAGE, currentMultiplier - step)
  return Number(upperBound.toFixed(2))
}
