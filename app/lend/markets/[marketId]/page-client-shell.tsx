"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { LendHeroPreloads } from "@/app/lib/lend-detail/hero-preload"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
import { LendMarketDetailClient } from "./market-detail-client"

export function LendMarketDetailClientShell({
  detail,
  heroPreloads,
  quickStatsPreload,
}: {
  detail: LendMarketDetail
  heroPreloads: LendHeroPreloads | null
  quickStatsPreload: QuickStatsPreload | null
}) {
  return <LendMarketDetailClient detail={detail} heroPreloads={heroPreloads} quickStatsPreload={quickStatsPreload} />
}
