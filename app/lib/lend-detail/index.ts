/**
 * Public data seam for the lend detail page — UI imports only from here. `./convex-detail.ts`
 * overlays seeded/live data over the `./mock.ts` baseline and stays OUT of this barrel so
 * client components don't pull in `server-only`.
 */

import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { buildLendMarketDetail, resolveLendMarket } from "./mock"
import type { LendMarketDetail } from "./types"

export type { LendMarketDetail, LendMarketHero, LendTokenVisual } from "./types"
export { buildLendMarketDetail, resolveLendMarket, getLendAboutCard } from "./mock"
export type { LendDetailOverrides } from "./mock"

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
