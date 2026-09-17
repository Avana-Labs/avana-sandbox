import { getActiveCurrency, withCurrencySymbol } from "@/app/lib/currency/active-rate"
import { formatHealthFactor } from "@/app/lib/home-sim"

export function formatActionInputAmount(value: number, maxDecimals = 6) {
  if (!Number.isFinite(value)) return "0"
  return String(Number(value.toFixed(maxDecimals)))
}

export function formatActionUsd(usdValue: number, options?: { compact?: boolean; exact?: boolean }) {
  if (!Number.isFinite(usdValue)) return "—"
  // Action amounts are computed in USD; convert into the active display currency.
  const { rate, zeroDecimal } = getActiveCurrency()
  const value = usdValue * rate
  // Compact thresholds/negatives are handled on the magnitude; the sign is
  // reattached (outside the symbol) by withCurrencySymbol.
  const abs = Math.abs(value)
  if (options?.compact) {
    if (abs >= 1_000_000_000) return withCurrencySymbol(value, `${(abs / 1_000_000_000).toFixed(1)}B`)
    if (abs >= 1_000_000) return withCurrencySymbol(value, `${(abs / 1_000_000).toFixed(1)}M`)
    if (abs >= 1_000) return withCurrencySymbol(value, `${(abs / 1_000).toFixed(1)}K`)
  }
  const fractionDigits = zeroDecimal ? 0 : options?.exact || abs < 100 ? 2 : 0
  return withCurrencySymbol(
    value,
    abs.toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
  )
}

export function formatActionApproxUsd(value: number) {
  return formatActionUsd(value)
}

export function formatActionPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—"
  // Fixed decimals, matching formatActionRatioPercent, so a given LTV/APY reads identically on
  // every surface (80 -> "80.00%", not "80%").
  return `${value.toFixed(digits)}%`
}

export function formatActionRatioPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

export function formatActionHealthFactor(value: number | null) {
  return formatHealthFactor(value)
}

export function formatActionBeforeAfter(before: string, after: string) {
  return `${before} → ${after}`
}

export function formatActionUsdBeforeAfter(beforeUsd: number, afterUsd: number) {
  return formatActionBeforeAfter(formatActionUsd(beforeUsd), formatActionUsd(afterUsd))
}

export function formatActionPercentBeforeAfter(beforePct: number, afterPct: number, digits = 2) {
  return formatActionBeforeAfter(formatActionPercent(beforePct, digits), formatActionPercent(afterPct, digits))
}

export function formatActionNetworkFee(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "~ $0.00"
  return `~ ${formatActionUsd(value)}`
}

/**
 * The single canonical sandbox network-fee estimate (USD). Preview and receipt must both read
 * this one number, or the estimate and the recorded fee drift apart.
 */
export const SANDBOX_NETWORK_FEE_USD = 0.03

/**
 * The sandbox engines deduct no protocol fee, so the network fee is the only cost. Params are
 * kept for call-site compatibility but unused.
 */
export function formatActionFeeSummary(_amountUsd: number, _networkFeeUsd = SANDBOX_NETWORK_FEE_USD, _bps = 30) {
  return formatActionNetworkFee(SANDBOX_NETWORK_FEE_USD)
}

export function formatActionAmount(assetAmount: number, symbol: string, digits = 6) {
  if (!Number.isFinite(assetAmount)) return `0 ${symbol}`
  // Strip trailing zeros in both branches so whole amounts read "12500" not
  // "12500.00" while fractional amounts keep their significant digits.
  const rounded =
    assetAmount >= 100
      ? assetAmount.toFixed(2).replace(/\.?0+$/, "")
      : assetAmount.toFixed(Math.min(digits, 6)).replace(/\.?0+$/, "")
  return `${rounded} ${symbol}`
}
