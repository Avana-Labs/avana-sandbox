/**
 * Catalog leverage labels are shown as-is (no inflation). Kept as a named constant
 * so the division in resolveMultiplyMarketMaxLeverage stays explicit; 1 = truthful.
 */
export const MULTIPLY_CATALOG_LEVERAGE_SCALE = 1

/** Multiply action modal slider range (independent of per-market public caps). */
export const MULTIPLY_ACTION_MIN_LEVERAGE = 1
export const MULTIPLY_ACTION_MAX_LEVERAGE = 10
export const MULTIPLY_DEFAULT_LEVERAGE = 1.1

/**
 * Resolve the per-market public cap into the action slider's max, clamped to the
 * global slider ceiling. (Catalog values are no longer inflated, so this is just a clamp.)
 */
export function resolveMultiplyMarketMaxLeverage(publicMaxMultiplier: number | undefined) {
  if (!Number.isFinite(publicMaxMultiplier) || publicMaxMultiplier == null || publicMaxMultiplier < 1) {
    return MULTIPLY_ACTION_MAX_LEVERAGE
  }

  const actionCap = publicMaxMultiplier / MULTIPLY_CATALOG_LEVERAGE_SCALE
  return Math.min(MULTIPLY_ACTION_MAX_LEVERAGE, actionCap)
}

/**
 * The single source of the per-market "max leverage" figure shown across the
 * Multiply page (hero average, trending card, markets table, explore table).
 * It is the public cap the market advertises — NOT the recommended/safe cap and
 * NOT the action-slider clamp — so every surface prints the same number.
 */
export function resolveMultiplyMarketDisplayMaxLeverage(publicMaxMultiplier: number | undefined) {
  if (!Number.isFinite(publicMaxMultiplier) || publicMaxMultiplier == null || publicMaxMultiplier < 1) {
    return 1
  }
  return publicMaxMultiplier
}

export function resolveDefaultMultiplyLeverage(
  publicMaxMultiplier: number | undefined,
  recommendedMaxMultiplier?: number,
) {
  const publicMax = resolveMultiplyMarketMaxLeverage(publicMaxMultiplier)
  const recommendedMax = Number.isFinite(recommendedMaxMultiplier)
    ? Math.max(MULTIPLY_ACTION_MIN_LEVERAGE, recommendedMaxMultiplier!)
    : publicMax
  return Math.min(publicMax, recommendedMax, MULTIPLY_DEFAULT_LEVERAGE)
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
