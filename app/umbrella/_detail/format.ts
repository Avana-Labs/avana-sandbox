import { formatCompactUsd as formatCompactUsdCanonical, formatUsdExact } from "@/app/lib/borrow-sim"

// Umbrella money display MUST go through the same currency-aware formatters as
// every other Avana surface. Previously these hardcoded "$" and ignored the
// header currency switcher, so picking EUR left the whole Umbrella block in USD
// while the rest of the page converted — mixed €/$ on one screen.

/** Currency-aware exact USD (honours the active currency + its rate/symbol). */
export function formatUsd(value: number) {
  return formatUsdExact(value)
}

/** Currency-aware compact USD (K/M/B), shared with borrow/lend/multiply. */
export function formatCompactUsd(value: number) {
  return formatCompactUsdCanonical(value)
}

/** Percent body only (callers append "%"). Unchanged: variable precision, currency-agnostic. */
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
