const DECIMAL_INPUT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/

// Cap the accepted magnitude far below 1e21, the point where Number.toFixed
// switches to exponential notation ("1e+30") that downstream fixed-point
// parsing rejects and throws on. Any amount past this is treated as invalid
// rather than crashing the preview.
const MAX_ACTION_AMOUNT = 1e15

/** Keep only digits and a single decimal point while the user types. */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "")
  const [whole = "", ...fraction] = cleaned.split(".")
  if (fraction.length === 0) return whole
  return `${whole}.${fraction.join("")}`
}

export function parsePositiveActionAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!DECIMAL_INPUT_PATTERN.test(trimmed)) return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_ACTION_AMOUNT) return null

  return parsed
}

export function parseActionPercentBps(value: string): number | null {
  const parsed = parsePositiveActionAmount(value)
  if (parsed == null || parsed > 100) return null

  return Math.round(parsed * 100)
}
