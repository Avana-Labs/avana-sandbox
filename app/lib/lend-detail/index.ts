/**
 * Public data seam for the lend (single-asset supply) detail page.
 *
 * UI imports from this module only. The deterministic mock implementation lives
 * in `./mock.ts`; the server-only Convex builder (`./convex-detail.ts`, kept out
 * of this barrel so client components don't pull in `server-only`) overlays
 * seeded/live data per section and falls back to the mock when Convex is
 * unreachable — so the swap from mock → Convex is invisible to the UI.
 *
 * Contract test: `./__tests__/contract.test.ts`.
 */

import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { buildLendMarketDetail, resolveLendMarket } from "./mock"
import type { LendMarketDetail } from "./types"

export type { LendMarketDetail, LendMarketHero, LendMarketRelatedSummary, LendTokenVisual } from "./types"
export { buildLendMarketDetail, resolveLendMarket, getLendAboutCard } from "./mock"
export type { LendDetailOverrides } from "./mock"

/** Detail path for a lend market id. */
export function lendMarketDetailPath(marketId: string): string {
  return `/lend/markets/${marketId}`
}

/**
 * Returns the (mock) detail view-model for a lend market route id.
 * Accepts a market id (`usdc`, `wsteth`) or an asset symbol; `null` on miss.
 */
export function getLendMarketDetail(id: string): LendMarketDetail | null {
  const market = resolveLendMarket(id)
  if (!market) return null
  return buildLendMarketDetail(market)
}

/** Every lend market detail — used for warm-up / tests. */
export function listAllLendMarketDetails(): LendMarketDetail[] {
  return LEND_MARKET_CATALOG.map((market) => buildLendMarketDetail(market))
}
