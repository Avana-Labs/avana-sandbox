"use client"

import type { PoolDetail } from "@/app/lib/borrow-detail"
import type { PoolHeroPreloads } from "@/app/lib/borrow-detail/hero-preload"
import { PoolDetailClient } from "@/app/borrow/pool/[poolId]/pool-detail-client"

export function BorrowMarketDetailClientShell({
  detail,
  heroPreloads,
}: {
  detail: PoolDetail
  heroPreloads: PoolHeroPreloads | null
}) {
  return <PoolDetailClient detail={detail} heroPreloads={heroPreloads} />
}
