"use client"

import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import type { MultiplyHeroPreloads } from "@/app/lib/multiply-detail/hero-preload"
import { MarketDetailClient } from "./market-detail-client"

export function MultiplyMarketDetailClientShell({
  detail,
  heroPreloads,
}: {
  detail: MultiplyMarketDetail
  heroPreloads: MultiplyHeroPreloads | null
}) {
  return <MarketDetailClient detail={detail} heroPreloads={heroPreloads} />
}
