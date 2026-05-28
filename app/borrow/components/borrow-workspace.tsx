"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  filterPools,
  groupByDex,
  sortPools,
  type BorrowDexId,
  type BorrowPoolRow,
  type BorrowableAsset,
  type PoolSortKey,
} from "@/app/lib/borrow-sim"
import {
  HOME_COLLATERAL_POOLS,
  HOME_INITIAL_DEBTS,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId, type SortOption } from "./tabs-bar"
import { PoolsList, PoolsTable } from "./pools-table"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "./borrow-modal"
import { SupplyCollateralModal, type SupplyCollateralContext, type SupplyCollateralResult } from "./supply-collateral-modal"
import { type SupplyRowContext } from "./supplies-table"
import { useLiveBorrowMarket } from "./use-live-borrow-market"

type DebtsState = Record<string, number>

const POOL_SORT_OPTIONS: SortOption[] = [
  { key: "apr", label: "APY" },
  { key: "ltv", label: "Max LTV" },
  { key: "available", label: "Supplied" },
  { key: "riskPremium", label: "Risk premium" },
]

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
  onTabChange?: (tab: BorrowTabId) => void
}

export function BorrowWorkspace({ onTabChange }: BorrowWorkspaceProps = {}) {
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
  const filterText = ""
  const [selectedDexes, setSelectedDexes] = useState<Set<BorrowDexId>>(() => new Set())
  const [debts, setDebts] = useState<DebtsState>({ ...HOME_INITIAL_DEBTS })

  const [poolSortKey, setPoolSortKey] = useState<PoolSortKey>("apr")
  const [poolSortDirection, setPoolSortDirection] = useState<"asc" | "desc">("desc")

  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })
  const { livePools, liveSupplyMetrics } = useLiveBorrowMarket(debts)
  const livePoolById = useMemo(() => new Map(livePools.map((pool) => [pool.id, pool])), [livePools])

  const toggleDex = useCallback((dex: BorrowDexId) => {
    setSelectedDexes((previous) => {
      const next = new Set(previous)
      if (next.has(dex)) next.delete(dex)
      else next.add(dex)
      return next
    })
  }, [])

  // Data for each tab
  const supplies = useMemo<SupplyRowContext[]>(() => {
    return HOME_COLLATERAL_POOLS.map((pool) => ({
      pool,
      borrowedUsd: debts[pool.id] ?? 0,
      healthFactor: liveSupplyMetrics[pool.id]?.healthFactor ?? computeHealthFactor(pool, debts[pool.id] ?? 0),
      pairApr: liveSupplyMetrics[pool.id]?.pairApr ?? pool.pairApr,
      feesUsd: liveSupplyMetrics[pool.id]?.feesUsd ?? 0,
      feesLabel: liveSupplyMetrics[pool.id]?.feesLabel ?? "$0.00",
    }))
  }, [debts, liveSupplyMetrics])

  const filteredPools = useMemo(() => {
    const filtered = filterPools(BORROW_POOL_CATALOG, { text: filterText, dexes: selectedDexes })
    return filtered.map((pool) => livePoolById.get(pool.id) ?? pool)
  }, [filterText, livePoolById, selectedDexes])

  const sortedPools = useMemo(() => sortPools(filteredPools, poolSortKey, poolSortDirection), [filteredPools, poolSortKey, poolSortDirection])

  const visiblePools = useMemo(() => {
    if (!isPoolTab(currentTab)) return []
    return sortedPools.filter((pool) => poolMatchesTab(pool, currentTab))
  }, [currentTab, sortedPools])

  const poolGroups = useMemo(() => groupByDex(visiblePools), [visiblePools])

  const poolTabCounts = useMemo(() => {
    const count = (tab: PoolTabId) => sortedPools.filter((pool) => poolMatchesTab(pool, tab)).length
    return {
      "all-markets": count("all-markets"),
      btc: count("btc"),
      eth: count("eth"),
      forex: count("forex"),
      governance: count("governance"),
      "smart-pools": count("smart-pools"),
    }
  }, [sortedPools])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

  const handlePoolsSupply = useCallback((pool: BorrowPoolRow) => {
    setSupplyModal({ open: true, context: { pool } })
  }, [])

  const handleAssetBorrow = useCallback(
    (asset: BorrowableAsset) => {
      // Pick best-HF supply (highest HF = safest)
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

  // Sort options per tab
  const activeSortOptions =
    POOL_SORT_OPTIONS

  const activeSortKey = poolSortKey

  const activeSortDirection = poolSortDirection

  const onSortKeyChange = (key: string) => {
    setPoolSortKey(key as PoolSortKey)
  }

  const onSortDirectionChange = (direction: "asc" | "desc") => {
    setPoolSortDirection(direction)
  }

  const counts: Record<BorrowTabId, number> = {
    "all-markets": poolTabCounts["all-markets"],
    btc: poolTabCounts.btc,
    eth: poolTabCounts.eth,
    forex: poolTabCounts.forex,
    governance: poolTabCounts.governance,
    "smart-pools": poolTabCounts["smart-pools"],
  }

  return (
    <section className="pb-16">
      <TabsBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        counts={counts}
        selectedDexes={selectedDexes}
        onToggleDex={toggleDex}
        sortKey={activeSortKey}
        sortOptions={activeSortOptions}
        sortDirection={activeSortDirection}
        onSortKeyChange={onSortKeyChange}
        onSortDirectionChange={onSortDirectionChange}
      />

      <div className="pt-3 pb-6">
        {isPoolTab(currentTab) ? (
          <>
            <PoolsTable
              groups={poolGroups}
              pending={BORROW_PENDING_ROWS}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAsset={handleAssetBorrow}
            />
            <PoolsList
              groups={poolGroups}
              pending={BORROW_PENDING_ROWS}
              onUseAsCollateral={handlePoolsSupply}
              onBorrowAsset={handleAssetBorrow}
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
