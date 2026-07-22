/**
 * Detail-level presentational formatters shared by both the deterministic
 * fallback builders and the Convex overlay path.
 */

export function formatOraclePrice(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value >= 100) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (value >= 1) return `$${value.toFixed(4)}`
  return `$${value.toFixed(6)}`
}
