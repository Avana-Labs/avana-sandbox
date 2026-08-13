"use client"

import type { PoolDetail } from "@/app/lib/borrow-detail"
import type { PoolHeroPreloads } from "@/app/lib/borrow-detail/hero-preload"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
import { PoolDetailClient } from "@/app/borrow/pool/[poolId]/pool-detail-client"

export function BorrowMarketDetailClientShell({
  detail,
  heroPreloads,
  quickStatsPreload,
}: {
  detail: PoolDetail
  heroPreloads: PoolHeroPreloads | null
  quickStatsPreload: QuickStatsPreload | null
}) {
  return <PoolDetailClient detail={detail} heroPreloads={heroPreloads} quickStatsPreload={quickStatsPreload} />
}
