import { getActiveCurrency, withCurrencySymbol } from "@/app/lib/currency/active-rate"

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
  // Fixed decimals (matching formatActionRatioPercent) so a given LTV/APY reads identically on
  // every surface. The old round-then-stringify dropped trailing zeros (80 -> "80%", 5.3 ->
  // "5.3%") while the ratio formatter emitted "80.00%"/"5.30%" for the same value.
  return `${value.toFixed(digits)}%`
}

export function formatActionRatioPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

export function formatActionHealthFactor(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—"
  if (!Number.isFinite(value)) return "∞"
  return value.toFixed(value >= 10 ? 1 : 2)
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

/** Avana protocol fee (bps) plus estimated network gas for action summaries. */
export function formatActionFeeSummary(amountUsd: number, networkFeeUsd: number, bps = 10) {
  const avanaUsd = amountUsd > 0 ? amountUsd * (bps / 10_000) : 0
  const avanaPart = amountUsd > 0 ? `~ ${formatActionUsd(avanaUsd)}` : "10 bps"
  const networkPart = formatActionNetworkFee(networkFeeUsd)
  return `${avanaPart} · ${networkPart} network`
}

export function formatActionAmount(assetAmount: number, symbol: string, digits = 6) {
  if (!Number.isFinite(assetAmount)) return `0 ${symbol}`
  const rounded =
    assetAmount >= 100 ? assetAmount.toFixed(2) : assetAmount.toFixed(Math.min(digits, 6)).replace(/\.?0+$/, "")
  return `${rounded} ${symbol}`
}

export function formatActionWalletConfirmMessage(symbol: string, amountLabel: string) {
  return `To continue, confirm ${amountLabel} in your wallet.`
}
