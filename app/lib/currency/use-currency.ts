"use client"

import { useMemo } from "react"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import {
  convertFromUsd,
  currencyContext,
  formatCompactCurrency,
  formatExactCurrency,
  type CurrencyContext,
} from "@/app/lib/currency/format"

export type CurrencyFormatter = {
  ctx: CurrencyContext
  /** USD → active currency, compact (e.g. ¥11.5M). */
  compact: (usd: number) => string
  /** USD → active currency, exact with decimals. */
  exact: (usd: number) => string
  /** Raw converted number, if a caller needs to format itself. */
  convert: (usd: number) => number
  isUsd: boolean
}

/**
 * Currency formatter bound to the header switcher. The app computes everything in
 * USD (oracle prices are USD); this converts at the display layer so switching to,
 * say, CNY re-renders amounts in ¥ using the active FX rate.
 */
export function useCurrency(): CurrencyFormatter {
  const { currency } = useDisplayPreferences()
  return useMemo(() => {
    const ctx = currencyContext(currency)
    return {
      ctx,
      compact: (usd: number) => formatCompactCurrency(usd, ctx),
      exact: (usd: number) => formatExactCurrency(usd, ctx),
      convert: (usd: number) => convertFromUsd(usd, ctx),
      isUsd: currency === "USD",
    }
  }, [currency])
}
