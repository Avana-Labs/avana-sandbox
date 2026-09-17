/** Catalog leverage labels are shown as-is; named so the division below stays explicit. */
export const MULTIPLY_CATALOG_LEVERAGE_SCALE = 1

/** Multiply action modal slider range (independent of per-market public caps). */
export const MULTIPLY_ACTION_MIN_LEVERAGE = 1
/** Engine / validation hard ceiling. */
export const MULTIPLY_ACTION_MAX_LEVERAGE = 10
/** Slider right end: just under the engine ceiling so ticks land evenly at step 0.01. */
export const MULTIPLY_ACTION_SLIDER_MAX = 9.99
export const MULTIPLY_ACTION_SLIDER_STEP = 0.01
const MULTIPLY_DEFAULT_LEVERAGE = 1.1

/**
 * Per-market public cap clamped to the global action ceiling, for defaults and display. The
 * slider itself always spans the full range; publicMax is enforced as engine validation, not
 * a thumb clamp.
 */
export function resolveMultiplyMarketMaxLeverage(publicMaxMultiplier: number | undefined) {
  if (!Number.isFinite(publicMaxMultiplier) || publicMaxMultiplier == null || publicMaxMultiplier < 1) {
    return MULTIPLY_ACTION_MAX_LEVERAGE
  }

  const actionCap = publicMaxMultiplier / MULTIPLY_CATALOG_LEVERAGE_SCALE
  return Math.min(MULTIPLY_ACTION_MAX_LEVERAGE, actionCap)
}

/**
 * Single source of the per-market "max leverage" figure across the Multiply page. This is the
 * advertised public cap — NOT the recommended/safe cap and NOT the action-slider clamp.
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
 * Snap a leverage value to the slider's step grid using the SAME rounding rule as the ruler thumb
 * (`round((v - min) / step)`), then clamp. Keeps the pill and projection summary on one value.
 */
export function snapMultiplierToStep(value: number, min: number, max: number, step = 0.01): number {
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
 * The leverage the "Recommended up to Nx" marker points at: the largest value on the slider step
 * grid that stays within the market's safe max and still clears its minimum health factor.
 * Must FLOOR to the grid (and step down on a failing boundary) — rounding up lands on a leverage
 * whose HF is below the minimum, so dragging to the marker would be blocked.
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
