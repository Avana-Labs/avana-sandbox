import "server-only"
import { unstable_cache } from "next/cache"
import { applyLiveRates } from "@/app/lib/currency/rates"
import { pickSupportedFxRates } from "@/app/lib/currency/exchange-rates"
import type { CurrencyCode } from "@/app/components/display-preferences"

const ENDPOINT = "https://open.er-api.com/v6/latest/USD"
const REVALIDATE_SECONDS = 6 * 60 * 60

const getCachedFxRates = unstable_cache(
  async (): Promise<Partial<Record<CurrencyCode, number>>> => {
    const res = await fetch(ENDPOINT, { next: { revalidate: REVALIDATE_SECONDS } })
    if (!res.ok) return {}
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> }
    if (data.result !== "success" || !data.rates) return {}
    return pickSupportedFxRates(data.rates)
  },
  ["server-fx-rates"],
  { revalidate: REVALIDATE_SECONDS },
)

/**
 * Live FX seed for the root layout. Applies the overlay on the server (so SSR
 * amounts use today's rate) and returns the same map for the client provider so
 * hydration matches — no `/api/fx-rates` round trip on first paint. Fail-open.
 */
export async function loadServerFxRates(): Promise<Partial<Record<CurrencyCode, number>>> {
  try {
    const rates = await getCachedFxRates()
    if (Object.keys(rates).length > 0) {
      applyLiveRates(rates)
      return rates
    }
  } catch {
    // Baseline stays in place; the client may still refresh.
  }
  return {}
}
