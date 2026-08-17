import "server-only"
import { fetchTokenPrices } from "@/app/lib/borrow-system/market-hydration-server"
import { setCanonicalPrices } from "./canonical"

/**
 * Seed the canonical price store with the live Convex oracle prices during SSR.
 *
 * The store (canonical.ts) is a module singleton seeded with the deterministic
 * PRICE_FIXTURE. On the client it is overlaid by the live-prices provider, but the
 * SERVER render had no such overlay — so every server-computed price surface (the
 * lend/borrow/multiply detail "Price" quick-stat tile, the pool pair spot price)
 * rendered the fixture (e.g. AAVE $105, WETH $1934) instead of the refreshed oracle
 * value (~$88 / ~$1906). Awaiting this in the root layout before the page segment
 * renders makes those SSR values reflect the live oracle.
 *
 * `fetchTokenPrices` returns `{ lowercaseSymbol: priceUsd }` (or null when no
 * deployment is configured / it is unreachable); `setCanonicalPrices` uppercases and
 * keeps the fixture underneath, so a partial oracle response still resolves the
 * covered majors. Never throws — prices are a decorative fallback and a failed hydrate
 * must never break SSR.
 */
export async function hydrateCanonicalPricesFromConvex(): Promise<void> {
  try {
    const prices = await fetchTokenPrices()
    if (prices) setCanonicalPrices(prices)
  } catch {
    // Leave the fixture in place; the client overlay still refreshes once mounted.
  }
}
