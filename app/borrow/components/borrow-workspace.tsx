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
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId } from "./tabs-bar"
import { CollateralPoolsList, CollateralPoolsTable } from "./collateral-pools-table"
import { useMediaQuery } from "@/app/lib/use-media-query"

const BTC_SYMBOLS = new Set(["WBTC", "CBBTC"])
const ETH_SYMBOLS = new Set(["ETH", "WETH", "STETH", "WSTETH", "RETH", "CBETH", "WEETH"])
const FOREX_SYMBOLS = new Set(["USDC", "USDT", "DAI", "CRVUSD", "GHO", "EURC", "USD+", "SDAI", "FRAX", "USDE", "USDS", "USDP", "LUSD", "TUSD", "MIM", "PYUSD", "EURS"])
const GOV_SYMBOLS = new Set(["AAVE", "UNI", "CRV", "LDO", "BAL", "AURA", "GNO"])
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

function poolHasAnySymbol(pool: BorrowPoolRow, symbols: Set<string>) {
  return pool.visuals.some((visual) => symbols.has(visual.symbol.toUpperCase()))
}

function poolIsStable(pool: BorrowPoolRow) {
  return pool.visuals.every((visual) => FOREX_SYMBOLS.has(visual.symbol.toUpperCase()))
}

function poolMatchesTab(pool: BorrowPoolRow, tab: PoolTabId) {
  if (tab === "all-markets") return true
  if (tab === "btc") return poolHasAnySymbol(pool, BTC_SYMBOLS)
  if (tab === "eth") return poolHasAnySymbol(pool, ETH_SYMBOLS)
  if (tab === "forex") return poolIsStable(pool)
  if (tab === "governance") return poolHasAnySymbol(pool, GOV_SYMBOLS)
  if (tab === "smart-pools") {
    if (SMART_SPOKES.has(pool.spoke)) return true
    return !poolMatchesAnyCoreTab(pool)
  }
  return false
}

function poolMatchesAnyCoreTab(pool: BorrowPoolRow) {
  return (
    poolHasAnySymbol(pool, BTC_SYMBOLS) ||
    poolHasAnySymbol(pool, ETH_SYMBOLS) ||
    poolIsStable(pool) ||
    poolHasAnySymbol(pool, GOV_SYMBOLS)
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
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
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
              assets.set(asset.id, asset)
            }
          }
          return [entry.spoke.id, Array.from(assets.values())]
        }),
      ),
    ) as Record<string, BorrowableAsset[]>
  }, [poolGroups, session])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

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
        {isPoolTab(currentTab) ? (
          <>
            {isDesktop ? (
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
            )}
          </>
        ) : null}
      </div>
    </section>
  )
}
