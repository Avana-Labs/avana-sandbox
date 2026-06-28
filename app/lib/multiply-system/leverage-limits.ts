/** Catalog markets display 3× the seeded public max leverage in explore tables. */
export const MULTIPLY_CATALOG_LEVERAGE_SCALE = 3

/** Multiply action modal slider range (independent of per-market public caps). */
export const MULTIPLY_ACTION_MIN_LEVERAGE = 1
export const MULTIPLY_ACTION_MAX_LEVERAGE = 10

export function resolveMultiplyMarketMaxLeverage(publicMaxMultiplier: number | undefined) {
  if (!Number.isFinite(publicMaxMultiplier) || publicMaxMultiplier == null || publicMaxMultiplier < 1) {
    return MULTIPLY_ACTION_MAX_LEVERAGE
  }

  return Math.min(MULTIPLY_ACTION_MAX_LEVERAGE, publicMaxMultiplier)
}

export function getDefaultDeleverageMultiplier(currentMultiplier: number) {
  if (!Number.isFinite(currentMultiplier)) return String(MULTIPLY_ACTION_MIN_LEVERAGE)
  const lowered = Math.max(MULTIPLY_ACTION_MIN_LEVERAGE, currentMultiplier - 0.5)
  return String(Number(lowered.toFixed(2)))
}
