"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { LendHeroPreloads } from "@/app/lib/lend-detail/hero-preload"
import { LendMarketDetailClient } from "./market-detail-client"

export function LendMarketDetailClientShell({
  detail,
  heroPreloads,
}: {
  detail: LendMarketDetail
  heroPreloads: LendHeroPreloads | null
}) {
  return <LendMarketDetailClient detail={detail} heroPreloads={heroPreloads} />
}
