export function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCompactUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2)}K`
  return formatUsd(value)
}

export function formatPct(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatUnits(value: number) {
  const fraction = Number.isInteger(value) ? 0 : 3
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })
}

export function formatAge(elapsedMs: number) {
  const s = Math.max(1, Math.floor(elapsedMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/** Share of the fused bar that is offset (green); remainder is current deficit (red). */
export function deficitOffsetPercent(offsetUsd: number, deficitUsd: number): number {
  const offset = Math.max(offsetUsd, 0)
  const deficit = Math.max(deficitUsd, 0)
  const total = offset + deficit
  if (total <= 0) return 50
  // Keep a visible red tip when offset dominates (USDC/GHO).
  return Math.min(96, Math.max(4, (offset / total) * 100))
}
