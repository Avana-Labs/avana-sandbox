import type { CurrencyCode } from "@/app/components/display-preferences"
import { currencySymbolFor, exchangeRateFor, ZERO_DECIMAL_CURRENCIES } from "@/app/lib/currency/rates"

export type CurrencyContext = {
  currency: CurrencyCode
  /** Units of `currency` per 1 USD. */
  rate: number
  symbol: string
}

export function currencyContext(currency: CurrencyCode, rateOverride?: number): CurrencyContext {
  return {
    currency,
    rate: rateOverride && rateOverride > 0 ? rateOverride : exchangeRateFor(currency),
    symbol: currencySymbolFor(currency),
  }
}

/** Convert a USD value into the active currency. */
export function convertFromUsd(usd: number, ctx: CurrencyContext): number {
  return usd * ctx.rate
}

/** Compact currency formatting (e.g. $1.6M / ¥11.5M / €1.5M) from a USD value. */
export function formatCompactCurrency(usd: number, ctx: CurrencyContext): string {
  const value = convertFromUsd(usd, ctx)
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1_000_000_000) return `${sign}${ctx.symbol}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${ctx.symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${ctx.symbol}${(abs / 1_000).toFixed(1)}K`
  const decimals = ZERO_DECIMAL_CURRENCIES.has(ctx.currency) ? 0 : 0
  return `${sign}${ctx.symbol}${abs.toLocaleString("en-US", { maximumFractionDigits: decimals })}`
}

/** Exact currency formatting from a USD value, with currency-appropriate decimals. */
export function formatExactCurrency(usd: number, ctx: CurrencyContext): string {
  const value = convertFromUsd(usd, ctx)
  const decimals = ZERO_DECIMAL_CURRENCIES.has(ctx.currency) ? 0 : 2
  return `${value < 0 ? "-" : ""}${ctx.symbol}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}
