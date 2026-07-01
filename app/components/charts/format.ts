import type { ChartValueFormat } from "./types"
import { getActiveCurrency, toActive } from "@/app/lib/currency/active-rate"

function formatCompactUsd(value: number): string {
  const { symbol } = getActiveCurrency()
  value = toActive(value)
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(2)}K`
  return `${symbol}${value.toFixed(2)}`
}

function formatCompactAxis(value: number): string {
  const { symbol } = getActiveCurrency()
  value = toActive(value)
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`
  return `${symbol}${Math.round(value)}`
}

/** Tooltip + headline value formatting. */
export function formatChartValue(format: ChartValueFormat, value: number): string {
  switch (format) {
    case "usdCompact":
      return formatCompactUsd(value)
    case "price":
    case "usd":
    default:
      return `${getActiveCurrency().symbol}${toActive(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/** Y-axis tick formatting (shorter than the headline). */
export function formatChartAxis(format: ChartValueFormat, value: number): string {
  switch (format) {
    case "usdCompact":
      return formatCompactAxis(value)
    case "price":
    case "usd":
    default:
      return `${getActiveCurrency().symbol}${Math.round(toActive(value))}`
  }
}
