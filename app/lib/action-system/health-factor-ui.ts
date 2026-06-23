import type { ActionMetricTone } from "./contracts"

export function isHealthFactorMetric(label: string, id?: string) {
  if (id === "health-factor" || id === "hf") return true
  return /health factor/i.test(label)
}

/** Aave-style looping: liquidation risk only near HF 1.0. */
export function healthFactorToneFromAfter(after: string | undefined): ActionMetricTone {
  if (!after || after === "∞" || after === "—") return "positive"
  const value = Number.parseFloat(after.replace(/[^\d.]/g, ""))
  if (!Number.isFinite(value)) return "default"
  if (value < 1.05) return "danger"
  if (value < 1.15) return "warning"
  return "positive"
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

export const HF_ZONES = [
  { id: "safe", label: "Safe", min: 1.5, max: Infinity, widthPct: 50, color: "bg-emerald-500" },
  { id: "warn", label: "Caution", min: 1.15, max: 1.5, widthPct: 30, color: "bg-amber-500" },
  { id: "danger", label: "Liquidation", min: 0, max: 1.15, widthPct: 20, color: "bg-rose-500" },
] as const

export function parseHealthFactorValue(value: string | undefined): number | null {
  if (!value || value === "—") return null
  if (value.includes("∞")) return Number.POSITIVE_INFINITY
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

export function healthFactorStatusLabel(value: number | null) {
  if (value == null || Number.isNaN(value)) return { label: "Unknown", tone: "default" as const }
  if (!Number.isFinite(value) || value >= 1.5) return { label: "Safe", tone: "positive" as const }
  if (value >= 1.15) return { label: "Caution", tone: "warning" as const }
  return { label: "At risk", tone: "danger" as const }
}

export function activeHealthFactorZoneIndex(value: number | null) {
  if (value == null || Number.isNaN(value)) return -1
  if (!Number.isFinite(value) || value >= HF_ZONES[0].min) return 0
  return HF_ZONES.findIndex((zone) => value >= zone.min && value < zone.max)
}

/** Left = safer, right = closer to liquidation. Thumb position aligns with HF_ZONES segment widths. */
export function healthFactorBarPositionPct(value: number | null): number {
  if (value == null || Number.isNaN(value)) return 50

  const zoneIdx = activeHealthFactorZoneIndex(value)
  if (zoneIdx < 0) return 50

  const zoneStart = HF_ZONES.slice(0, zoneIdx).reduce((sum, zone) => sum + zone.widthPct, 0)
  const zone = HF_ZONES[zoneIdx]
  const innerPadding = zone.widthPct * 0.1

  let ratioInZone = 0.5
  if (zone.id === "safe") {
    const clamped = Number.isFinite(value) ? Math.min(value, 10) : 10
    ratioInZone = 1 - Math.min((clamped - zone.min) / (10 - zone.min), 1)
  } else if (zone.id === "warn") {
    ratioInZone = 1 - (value - zone.min) / (zone.max - zone.min)
  } else {
    const clamped = Math.max(value, 1)
    ratioInZone = clamped <= 1 ? 1 : 1 - (clamped - 1) / (zone.max - 1)
  }

  ratioInZone = Math.max(0, Math.min(1, ratioInZone))
  return zoneStart + innerPadding + ratioInZone * Math.max(0, zone.widthPct - innerPadding * 2)
}

export function healthFactorBarTone(value: number | null): { text: string; fill: string; border: string } {
  const status = healthFactorStatusLabel(value)
  if (status.tone === "positive") {
    return { text: "text-emerald-600", fill: "bg-emerald-500", border: "border-emerald-500" }
  }
  if (status.tone === "warning") {
    return { text: "text-amber-600", fill: "bg-amber-500", border: "border-amber-500" }
  }
  if (status.tone === "danger") {
    return { text: "text-rose-600", fill: "bg-rose-500", border: "border-rose-500" }
  }
  return { text: "text-muted-foreground", fill: "bg-slate-300", border: "border-slate-300" }
}
