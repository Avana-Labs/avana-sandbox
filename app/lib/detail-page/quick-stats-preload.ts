import "server-only"
import { preloadQuery } from "convex/nextjs"
import type { Preloaded } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * Server-side `getQuickStats` preload handed to `QuickStatsGrid` via `usePreloadedQuery`
 * (hydrate + subscribe, no client re-fetch). `null` with no deployment URL (CI/Lighthouse),
 * so the grid falls back to the server-built static stats.
 */
type QuickStatsScope = "asset" | "pool" | "lend" | "multiply"
export type QuickStatsPreload = Preloaded<typeof api.markets.getQuickStats>

export async function preloadDetailQuickStats(scope: QuickStatsScope, slug: string): Promise<QuickStatsPreload | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    return await preloadQuery(api.markets.getQuickStats, { scope, slug })
  } catch {
    return null
  }
}
