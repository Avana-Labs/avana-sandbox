"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  filterPools,
  groupByDex,
  type BorrowDexId,
  type BorrowPoolRow,
  type BorrowableAsset,
} from "@/app/lib/data/borrow-domain"
import type { BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"
import type { SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { selectPortfolioSupplyRows } from "@/app/lib/borrow-system/dashboard-selectors"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { borrowAssetDetailPath, borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useMarketLiquidity } from "@/app/lib/convex/market-liquidity-provider"
import { applyBorrowableAssetDelta } from "@/app/lib/market-liquidity/apply"
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId } from "./tabs-bar"
import { CollateralPoolsList, CollateralPoolsTable } from "./collateral-pools-table"
import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { categorizeMarket, type MarketCategory } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// Curated (protocol-strategy) spokes that belong in "smart" regardless of their tokens.
const SMART_SPOKES = new Set<string>([
  "uni-v2",
  "uni-v3-stable",
  "uni-v3-bluechip",
  "curve-crypto",
  "bal-weighted",
  "bal-boosted",
  "bal-reclamm",
  "aero-slipstream-bluechip",
])

// Borrow pools carry multiple token visuals; categorise via the shared taxonomy so
// filtering stays consistent with Lend / Multiply. A pool matches btc/eth/utility
// if ANY leg is in that family; forex if EVERY leg is fiat-pegged.
function poolHasCategory(pool: BorrowPoolRow, category: MarketCategory) {
  return pool.visuals.some((visual) => categorizeMarket(visual.symbol) === category)
}

function poolIsStable(pool: BorrowPoolRow) {
  return pool.visuals.every((visual) => categorizeMarket(visual.symbol) === "forex")
}

function poolMatchesTab(pool: BorrowPoolRow, tab: PoolTabId) {
  if (tab === "all") return true
  if (tab === "btc") return poolHasCategory(pool, "btc")
  if (tab === "eth") return poolHasCategory(pool, "eth")
  if (tab === "forex") return poolIsStable(pool)
  if (tab === "utility") return poolHasCategory(pool, "utility")
  if (tab === "smart") {
    if (SMART_SPOKES.has(pool.spoke)) return true
    return !poolMatchesAnyCoreTab(pool)
  }
  return false
}

function poolMatchesAnyCoreTab(pool: BorrowPoolRow) {
  return (
    poolHasCategory(pool, "btc") ||
    poolHasCategory(pool, "eth") ||
    poolIsStable(pool) ||
    poolHasCategory(pool, "utility")
  )
}


export type BorrowWorkspaceProps = {
  pageData: BorrowWorkspaceData
  onTabChange?: (tab: BorrowTabId) => void
}

export function BorrowWorkspace({ pageData, onTabChange }: BorrowWorkspaceProps) {
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)", true)
  const { pendingRows, dexes } = pageData
  const session = useBorrowSessionContext()
  const { deltas: liquidityDeltas } = useMarketLiquidity()
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all")
  const [search, setSearch] = useState("")
  const [selectedDexes, setSelectedDexes] = useState<Set<BorrowDexId>>(() => new Set())
  const marketSpokeById = useMemo(
    () => new Map(session.marketSummaries.map((market) => [market.id, market.spoke])),
    [session.marketSummaries],
  )

  // Data for each tab
  const supplies = useMemo<SupplyRowContext[]>(() => {
    return selectPortfolioSupplyRows(session.state, pageData.walletId)
  }, [pageData.walletId, session.state])

  const filteredPools = useMemo(() => {
    return filterPools([...session.marketSummaries], { text: search, dexes: selectedDexes })
  }, [search, selectedDexes, session.marketSummaries])

  const visiblePools = useMemo(() => {
    if (!isPoolTab(currentTab)) return []
    return filteredPools.filter((pool) => poolMatchesTab(pool, currentTab))
  }, [currentTab, filteredPools])

  const poolGroups = useMemo(() => groupByDex(visiblePools), [visiblePools])
  const borrowAssetsBySpoke = useMemo(() => {
    return Object.fromEntries(
      poolGroups.flatMap((group) =>
        group.spokes.map((entry) => {
          const assets = new Map<string, BorrowableAsset>()
          for (const row of entry.rows) {
            for (const asset of session.getBorrowableAssetsForMarket(row.id)) {
              assets.set(asset.id, applyBorrowableAssetDelta(asset, liquidityDeltas))
            }
          }
          return [entry.spoke.id, Array.from(assets.values())]
        }),
      ),
    ) as Record<string, BorrowableAsset[]>
  }, [poolGroups, session, liquidityDeltas])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

  const hasActiveFilters = search.trim().length > 0 || selectedDexes.size > 0
  const clearFilters = useCallback(() => {
    setSearch("")
    setSelectedDexes(new Set())
  }, [])

  const handlePoolsSupply = useCallback(
    (pool: BorrowPoolRow) => {
      triggerPageLoading()
      router.push(actionPagePath("borrow", "supply", { market: pool.id }))
    },
    [router],
  )

  const handleMarketDetail = useCallback(
    (pool: BorrowPoolRow) => {
      triggerPageLoading()
      router.push(borrowMarketDetailPath(pool.id))
    },
    [router],
  )

  const handleAssetBorrowDesktop = useCallback(
    (asset: BorrowableAsset) => {
      triggerPageLoading()
      router.push(borrowAssetDetailPath(asset.id))
    },
    [router],
  )

  const handleAssetBorrowMobile = useCallback(
    (asset: BorrowableAsset) => {
      const assetSpokeId = asset.id.includes(":") ? asset.id.split(":")[0] : null
      const sameSpokeSupplies = supplies.filter((row) => {
        if (!assetSpokeId) return false
        if (marketSpokeById.get(row.pool.id) !== assetSpokeId) return false
        return Number.isFinite(row.healthFactor ?? NaN) || row.borrowedUsd === 0
      })
      const best = sameSpokeSupplies.reduce<SupplyRowContext | null>((acc, row) => {
          if (!acc) return row
          const rowScore = Number.isFinite(row.healthFactor ?? NaN) ? (row.healthFactor as number) : 99
          const accScore = Number.isFinite(acc.healthFactor ?? NaN) ? (acc.healthFactor as number) : 99
          return rowScore >= accScore ? row : acc
        }, null)
      if (!best) {
        triggerPageLoading()
        router.push(borrowAssetDetailPath(asset.id))
        return
      }
      triggerPageLoading()
      router.push(
        actionPagePath("borrow", "borrow", {
          market: best.pool.id,
          asset: asset.id,
        }),
      )
    },
    [marketSpokeById, router, supplies],
  )

  return (
    <section className="pb-16">
      <TabsBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        search={search}
        onSearchChange={setSearch}
        dexes={dexes}
        selectedDexes={selectedDexes}
        onDexChange={(dex) => setSelectedDexes(dex ? new Set([dex]) : new Set())}
      />

      <div className="pt-3 pb-6">
        <TokenPricesProvider>
        {isPoolTab(currentTab) ? (
          visiblePools.length === 0 ? (
            <NoMarketsState query={search.trim()} hasFilters={hasActiveFilters} onClear={clearFilters} />
          ) : isDesktop ? (
            <CollateralPoolsTable
              groups={poolGroups}
              borrowAssetsBySpoke={borrowAssetsBySpoke}
              pending={pendingRows}
              onViewMarket={handleMarketDetail}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAssetDesktop={handleAssetBorrowDesktop}
              onBorrowAssetMobile={handleAssetBorrowMobile}
            />
          ) : (
            <CollateralPoolsList
              groups={poolGroups}
              borrowAssetsBySpoke={borrowAssetsBySpoke}
              pending={pendingRows}
              onViewMarket={handleMarketDetail}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAssetDesktop={handleAssetBorrowDesktop}
              onBorrowAssetMobile={handleAssetBorrowMobile}
            />
          )
        ) : null}
        </TokenPricesProvider>
      </div>
    </section>
  )
}

function NoMarketsState({
  query,
  hasFilters,
  onClear,
}: {
  query: string
  hasFilters: boolean
  onClear: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-radius-md border border-dashed border-border px-6 py-16 text-center"
    >
      <p className="text-[15px] font-medium text-foreground">
        {query ? t("No markets match “{query}”").replace("{query}", query) : t("No markets match your filters")}
      </p>
      <p className="max-w-sm text-[13px] leading-6 text-muted-foreground">
        {t("Try a different token, venue, or clear the search to see every market.")}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-full border border-border px-4 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-raised/60"
        >
          {t("Clear search")}
        </button>
      ) : null}
    </div>
  )
}
