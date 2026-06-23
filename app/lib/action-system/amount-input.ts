const DECIMAL_INPUT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/

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
