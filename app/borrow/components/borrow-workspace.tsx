"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  filterPools,
  groupByDex,
  type BorrowDexId,
  type BorrowPoolRow,
  type BorrowableAsset,
} from "@/app/lib/borrow-sim"
import { type HomeCollateralPool } from "@/app/lib/home-sim"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId } from "./tabs-bar"
import { PoolsList, PoolsTable } from "./pools-table"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "./borrow-modal"
import { SupplyCollateralModal, type SupplyCollateralContext, type SupplyCollateralResult } from "./supply-collateral-modal"
import { type SupplyRowContext } from "./supplies-table"
import { useLiveBorrowMarket } from "./use-live-borrow-market"

type DebtsState = Record<string, number>

function computeHealthFactor(pool: HomeCollateralPool, debt: number): number | null {
  if (debt <= 0) return Number.POSITIVE_INFINITY
  return (pool.collateralUsd * (pool.maxLtv / 100)) / debt
}

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
  pageData: BorrowPageData
  onTabChange?: (tab: BorrowTabId) => void
}

export function BorrowWorkspace({ pageData, onTabChange }: BorrowWorkspaceProps) {
  const router = useRouter()
  const { poolCatalog, pendingRows, dexes, collateralPools, initialDebts } = pageData
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
  const [search, setSearch] = useState("")
  const [selectedDexes, setSelectedDexes] = useState<Set<BorrowDexId>>(() => new Set())
  const [debts, setDebts] = useState<DebtsState>({ ...initialDebts })

  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })
  const { livePools, liveSupplyMetrics } = useLiveBorrowMarket({
    debts,
    poolCatalog,
    collateralPools,
  })
  const livePoolById = useMemo(() => new Map(livePools.map((pool) => [pool.id, pool])), [livePools])

  // Data for each tab
  const supplies = useMemo<SupplyRowContext[]>(() => {
    return collateralPools.map((pool) => ({
      pool,
      borrowedUsd: debts[pool.id] ?? 0,
      healthFactor: liveSupplyMetrics[pool.id]?.healthFactor ?? computeHealthFactor(pool, debts[pool.id] ?? 0),
      pairApr: liveSupplyMetrics[pool.id]?.pairApr ?? pool.pairApr,
      feesUsd: liveSupplyMetrics[pool.id]?.feesUsd ?? 0,
      feesLabel: liveSupplyMetrics[pool.id]?.feesLabel ?? "$0.00",
    }))
  }, [collateralPools, debts, liveSupplyMetrics])

  const filteredPools = useMemo(() => {
    const filtered = filterPools(poolCatalog, { text: search, dexes: selectedDexes })
    return filtered.map((pool) => livePoolById.get(pool.id) ?? pool)
  }, [livePoolById, poolCatalog, search, selectedDexes])

  const visiblePools = useMemo(() => {
    if (!isPoolTab(currentTab)) return []
    return filteredPools.filter((pool) => poolMatchesTab(pool, currentTab))
  }, [currentTab, filteredPools])

  const poolGroups = useMemo(() => groupByDex(visiblePools), [visiblePools])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

  const handlePoolsSupply = useCallback((pool: BorrowPoolRow) => {
    setSupplyModal({ open: true, context: { pool } })
  }, [])

  const handleAssetBorrowDesktop = useCallback(
    (asset: BorrowableAsset) => {
      triggerPageLoading()
      router.push(`/borrow/asset/${asset.id}`)
    },
    [router],
  )

  const handleAssetBorrowMobile = useCallback(
    (asset: BorrowableAsset) => {
      const best = supplies
        .filter((row) => Number.isFinite(row.healthFactor ?? NaN) || row.borrowedUsd === 0)
        .reduce<SupplyRowContext | null>((acc, row) => {
          if (!acc) return row
          const rowScore = Number.isFinite(row.healthFactor ?? NaN) ? (row.healthFactor as number) : 99
          const accScore = Number.isFinite(acc.healthFactor ?? NaN) ? (acc.healthFactor as number) : 99
          return rowScore >= accScore ? row : acc
        }, null)
      const fallback = best ?? supplies[0]
      if (!fallback) return
      setBorrowModal({
        open: true,
        context: {
          pool: fallback.pool,
          currentDebtUsd: fallback.borrowedUsd,
          defaultTokenId: asset.id,
        },
      })
    },
    [supplies],
  )

  const handleSupplyConfirm = useCallback((result: SupplyCollateralResult) => {
    void result
  }, [])

  const handleBorrowConfirm = useCallback((result: BorrowModalResult) => {
    setDebts((previous) => ({ ...previous, [result.pool.id]: (previous[result.pool.id] ?? 0) + result.amountUsd }))
  }, [])

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
            <PoolsTable
              groups={poolGroups}
              pending={pendingRows}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAssetDesktop={handleAssetBorrowDesktop}
              onBorrowAssetMobile={handleAssetBorrowMobile}
            />
            <PoolsList
              groups={poolGroups}
              pending={pendingRows}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAssetDesktop={handleAssetBorrowDesktop}
              onBorrowAssetMobile={handleAssetBorrowMobile}
            />
          </>
        ) : null}
      </div>

      <BorrowModal
        open={borrowModal.open}
        context={borrowModal.context}
        onClose={() => setBorrowModal({ open: false, context: null })}
        onConfirm={handleBorrowConfirm}
      />

      <SupplyCollateralModal
        open={supplyModal.open}
        context={supplyModal.context}
        onClose={() => setSupplyModal({ open: false, context: null })}
        onConfirm={handleSupplyConfirm}
      />
    </section>
  )
}
