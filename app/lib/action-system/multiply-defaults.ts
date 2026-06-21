export const MULTIPLY_PREFERRED_DEFAULT_MULTIPLIER = 1.5
export const MULTIPLY_UI_MAX_MULTIPLIER = 20

export function clampMultiplyDefaultMultiplier(publicMaxMultiplier?: number | null) {
  const max = publicMaxMultiplier ?? MULTIPLY_UI_MAX_MULTIPLIER
  const value = Math.min(MULTIPLY_PREFERRED_DEFAULT_MULTIPLIER, max)
  return String(Math.round(value * 10) / 10)
}

export function isMultiplyLiquidationRiskMessage(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("health factor") ||
    normalized.includes("ltv") ||
    normalized.includes("liquidation")
  )
}

export function hasMultiplyLiquidationRisk(errors: string[]) {
  return errors.some(isMultiplyLiquidationRiskMessage)
}
