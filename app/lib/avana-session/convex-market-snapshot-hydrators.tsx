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
  // One reactive subscription for all products instead of three. The rows carry
  // `scope`, so we partition client-side. Previously this component opened three
  // separate subscriptions (borrow / lend / multiply) on EVERY route — each reading
  // the same snapshot cache and filtering server-side — so visiting /borrow still
  // subscribed to lend + multiply and re-rendered three times.
  const snapshots = useQuery(api.markets.listMarketSnapshots)

  useEffect(() => {
    if (!snapshots) return
    const rows = snapshots.filter((row) => row.scope === "pool" || row.scope === "asset")
    if (rows.length > 0) borrow.hydrateMarketData(rows as ConvexMarketSnapshot[])
  }, [borrow.hydrateMarketData, snapshots])

  useEffect(() => {
    if (!snapshots) return
    const rows = snapshots.filter((row) => row.scope === "lend")
    if (rows.length > 0) lend.hydrateMarketData(rows as LendConvexSnapshot[])
  }, [lend.hydrateMarketData, snapshots])

  useEffect(() => {
    if (!snapshots) return
    const rows = snapshots.filter((row) => row.scope === "multiply")
    if (rows.length > 0) multiply.hydrateMarketData(rows as MultiplyConvexSnapshot[])
  }, [multiply.hydrateMarketData, snapshots])

  return null
}
