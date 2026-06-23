export function formatActionInputAmount(value: number, maxDecimals = 6) {
  if (!Number.isFinite(value)) return "0"
  return String(Number(value.toFixed(maxDecimals)))
}

export function formatActionUsd(value: number, options?: { compact?: boolean }) {
  if (!Number.isFinite(value)) return "—"
  if (options?.compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

export function formatActionApproxUsd(value: number) {
  return `≈ ${formatActionUsd(value)}`
}

export function formatActionPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—"
  const factor = 10 ** digits
  return `${Math.round(value * factor) / factor}%`
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

export function formatActionAmount(assetAmount: number, symbol: string, digits = 6) {
  if (!Number.isFinite(assetAmount)) return `0 ${symbol}`
  const rounded = assetAmount >= 100 ? assetAmount.toFixed(2) : assetAmount.toFixed(Math.min(digits, 6)).replace(/\.?0+$/, "")
  return `${rounded} ${symbol}`
}

export function formatActionWalletConfirmMessage(symbol: string, amountLabel: string) {
  return `To continue, confirm ${amountLabel} in your wallet.`
}
