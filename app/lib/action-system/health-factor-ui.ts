import type { ActionMetricTone } from "./contracts"
import {
  HEALTH_BANDS,
  healthFactorBand,
  parseHealthFactorValue as parseHealthFactorValueImpl,
} from "@/app/lib/health/health-factor-bands"

export function isHealthFactorMetric(label: string, id?: string) {
  if (id === "health-factor" || id === "hf") return true
  return /health factor/i.test(label)
}

/**
 * Tone for a formatted "after" HF string. No value / ∞ / — read as positive
 * (nothing to warn about yet); otherwise defer to the shared band scale so the
 * thresholds match every other surface.
 */
export function healthFactorToneFromAfter(after: string | undefined): ActionMetricTone {
  if (!after || after === "∞" || after === "—") return "positive"
  const value = parseHealthFactorValueImpl(after)
  if (value == null) return "default"
  return healthFactorBand(value).tone
}

export function resolveMetricTone(
  label: string,
  tone: ActionMetricTone | undefined,
  after?: string,
  id?: string,
): ActionMetricTone {
  if (isHealthFactorMetric(label, id)) {
    return healthFactorToneFromAfter(after) ?? tone ?? "default"
  }
  return tone ?? "default"
}

/** Labelled zone strip under the position bar, derived from the shared bands (safe → liquidation). */
export const HF_ZONES = HEALTH_BANDS.map((band) => ({
  id: band.id,
  label: band.label,
  min: band.min,
  max: band.max,
  widthPct: band.widthPct,
  color: band.segmentColor,
}))

export const parseHealthFactorValue = parseHealthFactorValueImpl

export function healthFactorStatusLabel(value: number | null) {
  const band = healthFactorBand(value)
  return { label: band.label, tone: band.tone }
}

export function activeHealthFactorZoneIndex(value: number | null) {
  const band = healthFactorBand(value)
  if (band.id === "unknown") return -1
  return HF_ZONES.findIndex((zone) => zone.id === band.id)
}

/** Left = safer, right = closer to liquidation. Thumb position aligns with HF_ZONES segment widths. */
export function healthFactorBarPositionPct(value: number | null): number {
  if (value == null || Number.isNaN(value)) return 50

  const zoneIdx = activeHealthFactorZoneIndex(value)
  if (zoneIdx < 0) return 50

  const zone = HF_ZONES[zoneIdx]
  const zoneStart = HF_ZONES.slice(0, zoneIdx).reduce((sum, z) => sum + z.widthPct, 0)

  // Within the active zone, the safer (higher-HF) edge is on the left. As HF
  // falls toward the zone's lower bound, the thumb slides right.
  let fraction: number
  if (zone.id === "safe") {
    const SAFE_LEFT_EDGE = 4
    const clamped = Number.isFinite(value) ? Math.min(value, SAFE_LEFT_EDGE) : SAFE_LEFT_EDGE
    fraction = 1 - Math.min((clamped - zone.min) / (SAFE_LEFT_EDGE - zone.min), 1)
  } else if (zone.id === "danger") {
    const LIQUIDATION = 1
    const clamped = Math.max(value, LIQUIDATION)
    fraction = clamped >= zone.max ? 0 : (zone.max - clamped) / (zone.max - LIQUIDATION)
  } else {
    fraction = (zone.max - value) / (zone.max - zone.min)
  }

  const clampedFraction = Math.max(0, Math.min(1, fraction))
  return zoneStart + clampedFraction * zone.widthPct
}

export function healthFactorBarTone(value: number | null): { text: string; fill: string; border: string } {
  return healthFactorBand(value).bar
}
