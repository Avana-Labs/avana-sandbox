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

function stepDecimals(step: number) {
  const fraction = String(step).split(".")[1]
  return fraction?.length ?? 0
}

/**
 * Snap a leverage value to the slider's step grid, using the SAME rounding rule the
 * ruler thumb uses (`round((v - min) / step)`), then clamp to [min, max]. Keeping the
 * controlled state on this grid means the slider label, the number input and the
 * projection summary all read one value instead of drifting apart. (E6)
 */
export function snapMultiplierToStep(value: number, min: number, max: number, step = 0.1): number {
  if (!Number.isFinite(value)) return min
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.1
  const steps = Math.round((value - min) / safeStep)
  const snapped = min + steps * safeStep
  const clamped = Math.min(max, Math.max(min, snapped))
  return Number(clamped.toFixed(stepDecimals(safeStep)))
}

/** Analytic loop health factor at a given multiplier: LT·m / (m − 1). Infinite at ≤1x. */
function analyticLoopHealthFactor(multiplier: number, liquidationThreshold: number): number {
  if (multiplier <= 1) return Number.POSITIVE_INFINITY
  return (liquidationThreshold * multiplier) / (multiplier - 1)
}

/**
 * The leverage the "Recommended up to Nx" marker should point at. It is the largest
 * value ON THE SLIDER STEP GRID that (a) does not exceed the market's safe/recommended
 * max and (b) still clears the market's minimum health factor.
 *
 * The safe max already equals the HF-analytic ceiling, but the slider snaps in 0.1
 * steps and would round a marker at e.g. 1.76x UP to 1.80x — a leverage whose health
 * factor sits below the minimum, so opening there is blocked. Flooring the marker to
 * the grid (and stepping down if a boundary value still fails the HF gate) makes
 * dragging to the recommended max a valid, non-blocked action. (E2)
 */
export function resolveRecommendedActionLeverage(params: {
  recommendedMaxMultiplier: number
  liquidationThreshold: number
  minHealthFactor: number
  actionMax: number
  step?: number
}): number {
  const step = Number.isFinite(params.step) && (params.step ?? 0) > 0 ? params.step! : 0.1
  const precision = stepDecimals(step)
  const actionMax = Number.isFinite(params.actionMax) ? params.actionMax : MULTIPLY_ACTION_MAX_LEVERAGE
  const recommended = Number.isFinite(params.recommendedMaxMultiplier) ? params.recommendedMaxMultiplier : actionMax
  const ceiling = Math.min(recommended, actionMax)
  if (!Number.isFinite(ceiling) || ceiling <= MULTIPLY_ACTION_MIN_LEVERAGE) {
    return MULTIPLY_ACTION_MIN_LEVERAGE
  }
  // Floor to the step grid so a drag to the marker never rounds UP past the ceiling.
  let candidate = Math.floor((ceiling + 1e-9) / step) * step
  // Safety net for the on-boundary case (ceiling exactly on a step where HF === minHF,
  // which swap losses could tip under): step down until the HF gate is cleared.
  while (
    candidate > MULTIPLY_ACTION_MIN_LEVERAGE &&
    analyticLoopHealthFactor(candidate, params.liquidationThreshold) < params.minHealthFactor
  ) {
    candidate -= step
  }
  return Number(Math.max(MULTIPLY_ACTION_MIN_LEVERAGE, candidate).toFixed(precision))
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

/** True when deleverage has no room below current leverage — Close is the only exit. */
export function isDeleverageCloseOnly(currentMultiplier: number, step = 0.1) {
  return getDeleverageMultiplierMax(currentMultiplier, step) <= MULTIPLY_ACTION_MIN_LEVERAGE + 1e-9
}
