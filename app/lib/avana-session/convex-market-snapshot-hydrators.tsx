"use client"

/**
 * Public market-reference hydrate only (no wallet / swap / rewards queries).
 * Used by DEV_OPEN_GATE where SIWE is skipped but list/detail must still share
 * Convex snapshot TVLs instead of catalog ~$99M figures.
 */
import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { LendConvexSnapshot } from "@/app/lib/lend-system/market-hydration"
import type { MultiplyConvexSnapshot } from "@/app/lib/multiply-system/market-hydration"
import { useBorrowSessionContext, useLendSessionContext, useMultiplySessionContext } from "./avana-sessions-provider"

export function ConvexMarketSnapshotHydrators() {
  const borrow = useBorrowSessionContext()
  const lend = useLendSessionContext()
  const multiply = useMultiplySessionContext()
  const borrowSnapshots = useQuery(api.markets.listBorrowMarketSnapshots)
  const lendSnapshots = useQuery(api.markets.listLendMarketSnapshots)
  const multiplySnapshots = useQuery(api.markets.listMultiplyMarketSnapshots)

  useEffect(() => {
    if (borrowSnapshots && borrowSnapshots.length > 0) {
      borrow.hydrateMarketData(borrowSnapshots as ConvexMarketSnapshot[])
    }
  }, [borrow.hydrateMarketData, borrowSnapshots])

  useEffect(() => {
    if (lendSnapshots && lendSnapshots.length > 0) {
      lend.hydrateMarketData(lendSnapshots as LendConvexSnapshot[])
    }
  }, [lend.hydrateMarketData, lendSnapshots])

  useEffect(() => {
    if (multiplySnapshots && multiplySnapshots.length > 0) {
      multiply.hydrateMarketData(multiplySnapshots as MultiplyConvexSnapshot[])
    }
  }, [multiply.hydrateMarketData, multiplySnapshots])

  return null
}
