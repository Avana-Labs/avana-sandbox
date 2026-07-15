"use client"

import { useMemo } from "react"
import { BorrowPageHero } from "./borrow-page-hero"
import { BorrowWorkspaceShell } from "./borrow-workspace-shell"
import { useBorrowPageLive } from "./use-borrow-page-live"
import { useAvanaIdentity, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { BorrowPageData, BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"

export function BorrowPageClient({ pageData }: { pageData: BorrowPageData }) {
  const { walletId } = useAvanaIdentity()
  const session = useBorrowSessionContext()
  const livePageData = useBorrowPageLive(walletId, session)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])

  const workspaceData: BorrowWorkspaceData = {
    walletId,
    borrowSessionSeed: resolvedPageData.borrowSessionSeed,
    poolCatalog: resolvedPageData.poolCatalog,
    borrowableAssets: resolvedPageData.borrowableAssets,
    pendingRows: resolvedPageData.pendingRows,
    dexes: resolvedPageData.dexes,
    collateralPools: resolvedPageData.collateralPools,
    initialDebts: resolvedPageData.initialDebts,
    borrowSnapshot: resolvedPageData.borrowSnapshot,
  }

  return (
    <>
      <BorrowPageHero pageData={resolvedPageData} />
      <BorrowWorkspaceShell pageData={workspaceData} />
    </>
  )
}

export { HeroMarketCard, type HeroMarketCardProps } from "./borrow-hero-market-card"
