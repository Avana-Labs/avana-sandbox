import "server-only"
import { preloadQuery, preloadedQueryResult } from "convex/nextjs"
import type { Preloaded } from "convex/react"
import { api } from "@/convex/_generated/api"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import type { ChartFeed } from "@/app/components/charts"

/**
 * Server-side hero-series handoff for borrow pool/asset detail pages.
 *
 * Previously the composite detail builder fetched the three hero series (to build the
 * `heroFeed` props) AND the live hero re-subscribed the same series on the client — a
 * redundant fetch. Here we `preloadQuery` each series exactly once on the server, build
 * the initial `heroFeed` props from the preloaded value via `preloadedQueryResult` (no
 * second fetch), and hand the `Preloaded` tokens to the client so the live hero uses
 * `usePreloadedQuery` (hydrates from the preload, subscribes for updates, never re-fetches).
 *
 * Returns `preloads: null` when no Convex deployment URL is configured (CI/Lighthouse),
 * so the hero falls back to its client-side deterministic feed and nothing throws.
 */
type PoolMetric = "tvl" | "borrowed" | "utilization"
type AssetMetric = "supply" | "borrow" | "utilization"

export type PoolHeroPreloads = Record<PoolMetric, Preloaded<typeof api.markets.getPoolHeroSeries>>
export type AssetHeroPreloads = Record<AssetMetric, Preloaded<typeof api.markets.getAssetHeroSeries>>

type HeroFeeds = { heroFeed?: ChartFeed; heroBorrowedFeed?: ChartFeed; heroUtilizationFeed?: ChartFeed }

function hasConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  return Boolean(url && /^https?:\/\//.test(url))
}

function feedFrom(
  preloaded: { points?: ReadonlyArray<{ t: string; v: number }> } | null,
  format: "usdCompact" | "percent",
) {
  return buildHeroFeedFromConvexSeries(preloaded?.points ?? [], format) ?? undefined
}

/** Preload the three pool hero series (tvl/borrowed/utilization) and build initial feeds. */
export async function preloadPoolHero(slug: string): Promise<{ preloads: PoolHeroPreloads | null; feeds: HeroFeeds }> {
  if (!hasConvexUrl()) return { preloads: null, feeds: {} }
  try {
    const [tvl, borrowed, utilization] = await Promise.all([
      preloadQuery(api.markets.getPoolHeroSeries, { slug, metric: "tvl", range: "ALL" }),
      preloadQuery(api.markets.getPoolHeroSeries, { slug, metric: "borrowed", range: "ALL" }),
      preloadQuery(api.markets.getPoolHeroSeries, { slug, metric: "utilization", range: "ALL" }),
    ])
    return {
      preloads: { tvl, borrowed, utilization },
      feeds: {
        heroFeed: feedFrom(preloadedQueryResult(tvl), "usdCompact"),
        heroBorrowedFeed: feedFrom(preloadedQueryResult(borrowed), "usdCompact"),
        heroUtilizationFeed: feedFrom(preloadedQueryResult(utilization), "percent"),
      },
    }
  } catch {
    return { preloads: null, feeds: {} }
  }
}

/** Preload the three asset hero series (supply/borrow/utilization) and build initial feeds. */
export async function preloadAssetHero(
  slug: string,
): Promise<{ preloads: AssetHeroPreloads | null; feeds: HeroFeeds }> {
  if (!hasConvexUrl()) return { preloads: null, feeds: {} }
  try {
    const [supply, borrow, utilization] = await Promise.all([
      preloadQuery(api.markets.getAssetHeroSeries, { slug, metric: "supply", range: "ALL" }),
      preloadQuery(api.markets.getAssetHeroSeries, { slug, metric: "borrow", range: "ALL" }),
      preloadQuery(api.markets.getAssetHeroSeries, { slug, metric: "utilization", range: "ALL" }),
    ])
    return {
      preloads: { supply, borrow, utilization },
      feeds: {
        heroFeed: feedFrom(preloadedQueryResult(supply), "usdCompact"),
        heroBorrowedFeed: feedFrom(preloadedQueryResult(borrow), "usdCompact"),
        heroUtilizationFeed: feedFrom(preloadedQueryResult(utilization), "percent"),
      },
    }
  } catch {
    return { preloads: null, feeds: {} }
  }
}
