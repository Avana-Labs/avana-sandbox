"use client"

import { useMemo } from "react"
import type { BorrowPageData, BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { BorrowWorkspaceShell } from "./borrow-workspace-shell"
import { useBorrowPageLive } from "./use-borrow-page-live"

export function BorrowWorkspaceClient({ pageData }: { pageData: BorrowPageData }) {
  const session = useBorrowSessionContext()
  const livePageData = useBorrowPageLive(pageData.walletId, session)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])

  const workspaceData: BorrowWorkspaceData = {
    walletId: resolvedPageData.walletId,
    borrowSessionSeed: resolvedPageData.borrowSessionSeed,
    poolCatalog: resolvedPageData.poolCatalog,
    borrowableAssets: resolvedPageData.borrowableAssets,
    pendingRows: resolvedPageData.pendingRows,
    dexes: resolvedPageData.dexes,
    collateralPools: resolvedPageData.collateralPools,
    initialDebts: resolvedPageData.initialDebts,
    borrowSnapshot: resolvedPageData.borrowSnapshot,
  }

  return <BorrowWorkspaceShell pageData={workspaceData} />
}
