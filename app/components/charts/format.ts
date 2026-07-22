import type { ChartValueFormat } from "./types"
import { getActiveCurrency, toActive } from "@/app/lib/currency/active-rate"

/** Sign prefix that belongs BEFORE the currency symbol ("-$1.50K", not "$-1.50K"). */
function signOf(value: number): string {
  return value < 0 ? "-" : ""
}

function formatCompactUsd(value: number): string {
  const { symbol } = getActiveCurrency()
  value = toActive(value)
  const sign = signOf(value)
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(2)}K`
  return `${sign}${symbol}${abs.toFixed(2)}`
}

function formatCompactAxis(value: number): string {
  const { symbol } = getActiveCurrency()
  value = toActive(value)
  const sign = signOf(value)
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}K`
  return `${sign}${symbol}${Math.round(abs)}`
}

/** Tooltip + headline value formatting. */
export function formatChartValue(format: ChartValueFormat, value: number): string {
  switch (format) {
    case "usdCompact":
      return formatCompactUsd(value)
    case "price":
    case "usd":
    default: {
      const active = toActive(value)
      return `${signOf(active)}${getActiveCurrency().symbol}${Math.abs(active).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }
}

/** Y-axis tick formatting (shorter than the headline). */
export function formatChartAxis(format: ChartValueFormat, value: number): string {
  switch (format) {
    case "usdCompact":
      return formatCompactAxis(value)
    case "price":
    case "usd":
    default: {
      const active = toActive(value)
      return `${signOf(active)}${getActiveCurrency().symbol}${Math.round(Math.abs(active))}`
    }
  }
}
