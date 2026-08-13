"use client"

import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import type { MultiplyHeroPreloads } from "@/app/lib/multiply-detail/hero-preload"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
import { MarketDetailClient } from "./market-detail-client"

export function MultiplyMarketDetailClientShell({
  detail,
  heroPreloads,
  quickStatsPreload,
}: {
  detail: MultiplyMarketDetail
  heroPreloads: MultiplyHeroPreloads | null
  quickStatsPreload: QuickStatsPreload | null
}) {
  return <MarketDetailClient detail={detail} heroPreloads={heroPreloads} quickStatsPreload={quickStatsPreload} />
}
