const DECIMAL_INPUT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/

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
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return parsed
}

export function parseActionPercentBps(value: string): number | null {
  const parsed = parsePositiveActionAmount(value)
  if (parsed == null || parsed > 100) return null

  return Math.round(parsed * 100)
}
