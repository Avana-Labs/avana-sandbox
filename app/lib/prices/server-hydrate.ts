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
  await loadServerTokenPrices()
}

/**
 * Fetch the live oracle prices ONCE on the server: hydrate the server-side canonical store
 * (so server-rendered surfaces are live) AND return the price map (keys = lowercase symbol,
 * i.e. `priceKey` form) so the root layout can seed the client `TokenPricesContext` with it.
 *
 * This seed is what makes CLIENT-rendered prices (the lend list, borrow table, action pages)
 * live even though the realtime Convex subscription only mounts on authenticated product
 * routes — the client no longer depends on that subscription to escape the fixture. Returns an
 * empty map when no deployment is configured / it is unreachable (client falls back to fixture).
 */
export async function loadServerTokenPrices(): Promise<Record<string, number>> {
  try {
    const prices = await fetchTokenPrices()
    if (prices) {
      setCanonicalPrices(prices)
      return prices
    }
  } catch {
    // Leave the fixture in place; the client overlay still refreshes once mounted.
  }
  return {}
}
