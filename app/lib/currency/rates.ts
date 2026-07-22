import type { CurrencyCode } from "@/app/components/display-preferences"

/**
 * Approximate FX rates expressed as "units of the currency per 1 USD". The app's
 * economy is computed and stored in USD (the oracle prices are USD); these rates
 * convert that USD figure for display when the user picks a non-USD currency.
 *
 * These are a static baseline so the switcher works deterministically offline and
 * on the server (where no live fetch runs). `app/lib/currency/exchange-rates`
 * refreshes them from a live source on the client and overrides at runtime via
 * `applyLiveRates`; anything not covered by a live rate falls back to the
 * baseline (and USD is always 1).
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
  CNY: "CN¥",
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

/**
 * Live FX overlay: "units of currency per 1 USD" fetched from a live source at
 * runtime. Empty until a live fetch populates it (see
 * `app/lib/currency/exchange-rates`). NEVER mutated on the server, so server
 * renders stay on the baseline and match the first client render.
 */
const liveRates: Partial<Record<CurrencyCode, number>> = {}

/** Overlay live rates on top of the baseline. Ignores non-positive/NaN values. */
export function applyLiveRates(rates: Partial<Record<CurrencyCode, number>>): void {
  for (const code of Object.keys(rates) as CurrencyCode[]) {
    const rate = rates[code]
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      liveRates[code] = rate
    }
  }
}

/** True once at least one live rate has been applied this session. */
export function hasLiveRates(): boolean {
  return Object.keys(liveRates).length > 0
}

export function exchangeRateFor(currency: CurrencyCode): number {
  const live = liveRates[currency]
  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    return live
  }
  const rate = USD_PER_UNIT_BASELINE[currency]
  return Number.isFinite(rate) && rate > 0 ? rate : 1
}

export function currencySymbolFor(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] ?? "$"
}
