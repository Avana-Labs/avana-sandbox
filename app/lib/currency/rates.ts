import type { CurrencyCode } from "@/app/components/display-preferences"

/**
 * Approximate FX rates expressed as "units of the currency per 1 USD". The app's
 * economy is computed and stored in USD (the oracle prices are USD); these rates
 * convert that USD figure for display when the user picks a non-USD currency.
 *
 * These are a static baseline so the switcher works deterministically offline.
 * `app/lib/currency/exchange-rates` can refresh them from a live source and
 * override at runtime; anything missing falls back to the baseline (USD = 1).
 */
export const USD_PER_UNIT_BASELINE: Record<CurrencyCode, number> = {
  USD: 1,
  ARS: 1015,
  AUD: 1.52,
  BRL: 5.6,
  CAD: 1.37,
  CNY: 7.18,
  COP: 4050,
  EUR: 0.92,
  GBP: 0.79,
  HKD: 7.8,
  IDR: 16100,
  INR: 83.4,
  JPY: 151,
  KRW: 1355,
}

/** Display symbol/prefix for each currency. */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  ARS: "AR$",
  AUD: "A$",
  BRL: "R$",
  CAD: "C$",
  CNY: "¥",
  COP: "CO$",
  EUR: "€",
  GBP: "£",
  HKD: "HK$",
  IDR: "Rp",
  INR: "₹",
  JPY: "¥",
  KRW: "₩",
}

/** Currencies conventionally shown with no decimal places. */
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<CurrencyCode> = new Set<CurrencyCode>([
  "JPY",
  "KRW",
  "IDR",
  "COP",
  "ARS",
])

export function exchangeRateFor(currency: CurrencyCode): number {
  const rate = USD_PER_UNIT_BASELINE[currency]
  return Number.isFinite(rate) && rate > 0 ? rate : 1
}

export function currencySymbolFor(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] ?? "$"
}
