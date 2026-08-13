"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { LendHeroPreloads } from "@/app/lib/lend-detail/hero-preload"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
import type { CashflowPreload } from "@/app/lib/detail-page/cashflow-preload"
import { LendMarketDetailClient } from "./market-detail-client"

export function LendMarketDetailClientShell({
  detail,
  heroPreloads,
  quickStatsPreload,
  cashflowPreload,
}: {
  detail: LendMarketDetail
  heroPreloads: LendHeroPreloads | null
  quickStatsPreload: QuickStatsPreload | null
  cashflowPreload: CashflowPreload | null
}) {
  return (
    <LendMarketDetailClient
      detail={detail}
      heroPreloads={heroPreloads}
      quickStatsPreload={quickStatsPreload}
      cashflowPreload={cashflowPreload}
    />
  )
}
