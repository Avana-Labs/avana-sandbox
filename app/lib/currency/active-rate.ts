import type { CurrencyCode } from "@/app/components/display-preferences"
import { currencySymbolFor, exchangeRateFor, ZERO_DECIMAL_CURRENCIES } from "@/app/lib/currency/rates"

/**
 * Module-level "active currency" that the shared USD formatters read so a single
 * switch in the header re-denominates amounts across the app without threading a
 * currency arg through hundreds of call sites.
 *
 * SSR safety: this is NEVER mutated on the server (only the client provider calls
 * setActiveCurrency, in an effect/handler), so server renders always emit USD and
 * the first client render matches before converting post-hydration.
 */
type ActiveCurrency = { currency: CurrencyCode; rate: number; symbol: string; zeroDecimal: boolean }

let active: ActiveCurrency = { currency: "USD", rate: 1, symbol: "$", zeroDecimal: false }

export function setActiveCurrency(currency: CurrencyCode): void {
  active = {
    currency,
    rate: exchangeRateFor(currency),
    symbol: currencySymbolFor(currency),
    zeroDecimal: ZERO_DECIMAL_CURRENCIES.has(currency),
  }
}

export function getActiveCurrency(): ActiveCurrency {
  return active
}

/** Convert a USD amount to the active currency (identity when USD). */
export function toActive(usdValue: number): number {
  return usdValue * active.rate
}
