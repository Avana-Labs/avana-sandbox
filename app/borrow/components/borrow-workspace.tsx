"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BORROWABLE_ASSETS,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  filterAssets,
  filterPools,
  formatUsdExact,
  groupByDex,
  homePoolSpoke,
  homeVisualToBorrowVisual,
  sortAssets,
  sortPools,
  type AssetSortKey,
  type BorrowDexId,
  type BorrowPoolRow,
  type BorrowableAsset,
  type PoolSortKey,
} from "@/app/lib/borrow-sim"
import {
  HOME_BORROW_TOKENS,
  HOME_COLLATERAL_POOLS,
  HOME_INITIAL_DEBTS,
  formatHealthFactor,
  type HomeBorrowToken,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { TabsBar, isPoolTab, type BorrowTabId, type PoolTabId, type SortOption } from "./tabs-bar"
import { PoolsList, PoolsTable } from "./pools-table"
import { SuppliesPanel, type SupplyRowContext } from "./supplies-table"
import { AssetsPanel } from "./assets-table"
import { DebtsPanel, type DebtRowContext } from "./debts-table"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "./borrow-modal"
import { RepayRemoveModal, type RepayRemoveContext, type RepayRemoveResult } from "./repay-remove-modal"
import { SupplyCollateralModal, type SupplyCollateralContext, type SupplyCollateralResult } from "./supply-collateral-modal"
import { SuccessOverlay, type SuccessOverlayProps } from "./success-overlay"
import { useLiveBorrowMarket } from "./use-live-borrow-market"

type DebtsState = Record<string, number>

const POOL_SORT_OPTIONS: SortOption[] = [
  { key: "apr", label: "APY" },
  { key: "ltv", label: "Max LTV" },
  { key: "available", label: "Supplied" },
  { key: "riskPremium", label: "Risk premium" },
]

const ASSET_SORT_OPTIONS: SortOption[] = [
  { key: "apr", label: "Borrow APR" },
  { key: "utilization", label: "Utilization" },
  { key: "available", label: "Available" },
  { key: "totalBorrowed", label: "Total borrowed" },
]

const SUPPLY_SORT_OPTIONS: SortOption[] = [
  { key: "collateral", label: "Collateral" },
  { key: "borrowed", label: "Borrowed" },
  { key: "hf", label: "Health factor" },
  { key: "apr", label: "LP APR" },
]

const DEBT_SORT_OPTIONS: SortOption[] = [
  { key: "borrowed", label: "Borrowed" },
  { key: "hf", label: "Health factor" },
  { key: "apr", label: "Borrow APR" },
]

function computeHealthFactor(pool: HomeCollateralPool, debt: number): number | null {
  if (debt <= 0) return Number.POSITIVE_INFINITY
  return (pool.collateralUsd * (pool.maxLtv / 100)) / debt
}

function averageHealthFactor(rows: Array<{ borrowedUsd: number; healthFactor: number | null }>): number | null {
  const finite = rows
    .map((row) => row.healthFactor)
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (finite.length === 0) return null
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function getUsdcToken(): HomeBorrowToken {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[1]
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

export type BorrowSupplyHeroStats = {
  collateral: number
  borrowed: number
  available: number
  fees: number
  averageHf: number | null
}

export type BorrowDebtsHeroStats = {
  totalBorrowed: number
  totalCollateral: number
  accruedInterest: number
  averageHf: number | null
  dailyInterest: number
}

export type BorrowWorkspaceProps = {
  onTabChange?: (tab: BorrowTabId) => void
  onSupplyStatsChange?: (stats: BorrowSupplyHeroStats) => void
  onDebtsStatsChange?: (stats: BorrowDebtsHeroStats) => void
  showBalance?: boolean
}

export function BorrowWorkspace({ onTabChange, onSupplyStatsChange, onDebtsStatsChange, showBalance = true }: BorrowWorkspaceProps = {}) {
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
  const [filterText, setFilterText] = useState("")
  const [selectedDexes, setSelectedDexes] = useState<Set<BorrowDexId>>(() => new Set())
  const [debts, setDebts] = useState<DebtsState>({ ...HOME_INITIAL_DEBTS })

  const [poolSortKey, setPoolSortKey] = useState<PoolSortKey>("apr")
  const [poolSortDirection, setPoolSortDirection] = useState<"asc" | "desc">("desc")
  const [assetSortKey, setAssetSortKey] = useState<AssetSortKey>("apr")
  const [assetSortDirection, setAssetSortDirection] = useState<"asc" | "desc">("asc")
  const [supplySortKey, setSupplySortKey] = useState<string>("collateral")
  const [supplySortDirection, setSupplySortDirection] = useState<"asc" | "desc">("desc")
  const [debtSortKey, setDebtSortKey] = useState<string>("borrowed")
  const [debtSortDirection, setDebtSortDirection] = useState<"asc" | "desc">("desc")

  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })
  const [repayRemoveModal, setRepayRemoveModal] = useState<{ open: boolean; context: RepayRemoveContext | null }>({
    open: false,
    context: null,
  })
  const [successState, setSuccessState] = useState<{ open: boolean; payload: Omit<SuccessOverlayProps, "open" | "onClose"> | null }>({
    open: false,
    payload: null,
  })

  const { livePools, liveAssets, liveSupplyMetrics, liveDebtMetrics } = useLiveBorrowMarket(debts)
  const livePoolById = useMemo(() => new Map(livePools.map((pool) => [pool.id, pool])), [livePools])
  const liveAssetById = useMemo(() => new Map(liveAssets.map((asset) => [asset.id, asset])), [liveAssets])

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

  const debtsRows = useMemo<DebtRowContext[]>(() => {
    return HOME_COLLATERAL_POOLS.map((pool) => ({
      pool,
      borrowedUsd: debts[pool.id] ?? 0,
      healthFactor: liveDebtMetrics[pool.id]?.healthFactor ?? computeHealthFactor(pool, debts[pool.id] ?? 0),
      borrowApr: liveDebtMetrics[pool.id]?.borrowApr ?? getUsdcToken().borrowApr,
      accruedInterestUsd: liveDebtMetrics[pool.id]?.accruedInterestUsd ?? 0,
      dailyInterestUsd: liveDebtMetrics[pool.id]?.dailyInterestUsd ?? 0,
    })).filter((row) => row.borrowedUsd > 0)
  }, [debts, liveDebtMetrics])

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

  const sortedAssets = useMemo<BorrowableAsset[]>(() => {
    const filtered = filterAssets(BORROWABLE_ASSETS, filterText)
    const baseSorted = sortAssets(filtered, assetSortKey, assetSortDirection)
    return baseSorted.map((asset) => liveAssetById.get(asset.id) ?? asset)
  }, [filterText, liveAssetById, assetSortKey, assetSortDirection])

  const sortedSupplies = useMemo(() => {
    const copy = [...supplies]
    copy.sort((left, right) => {
      const value = (row: SupplyRowContext) => {
        switch (supplySortKey) {
          case "borrowed":
            return row.borrowedUsd
          case "hf":
            return Number.isFinite(row.healthFactor ?? NaN) ? (row.healthFactor as number) : 99
          case "apr":
            return row.pairApr
          case "collateral":
          default:
            return row.pool.collateralUsd
        }
      }
      const a = value(left)
      const b = value(right)
      return supplySortDirection === "asc" ? a - b : b - a
    })
    return copy
  }, [supplies, supplySortKey, supplySortDirection])

  const sortedDebts = useMemo(() => {
    const copy = [...debtsRows]
    copy.sort((left, right) => {
      const value = (row: DebtRowContext) => {
        switch (debtSortKey) {
          case "hf":
            return Number.isFinite(row.healthFactor ?? NaN) ? (row.healthFactor as number) : 99
          case "apr":
            return row.borrowApr
          case "borrowed":
          default:
            return row.borrowedUsd
        }
      }
      const a = value(left)
      const b = value(right)
      return debtSortDirection === "asc" ? a - b : b - a
    })
    return copy
  }, [debtsRows, debtSortKey, debtSortDirection])

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

  // Totals
  const supplyTotals = useMemo(() => {
    const collateral = supplies.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const borrowed = supplies.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const available = supplies.reduce((sum, row) => sum + Math.max(0, row.pool.borrowPowerUsd - row.borrowedUsd), 0)
    const fees = supplies.reduce((sum, row) => sum + row.feesUsd, 0)
    const averageHf = averageHealthFactor(supplies.filter((row) => row.borrowedUsd > 0))
    return { collateral, borrowed, available, fees, averageHf }
  }, [supplies])

  const debtTotals = useMemo(() => {
    const totalBorrowed = debtsRows.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const totalCollateral = debtsRows.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const accruedInterest = debtsRows.reduce((sum, row) => sum + row.accruedInterestUsd, 0)
    const averageHf = averageHealthFactor(debtsRows)
    const dailyInterest = debtsRows.reduce((sum, row) => sum + row.dailyInterestUsd, 0)
    return { totalBorrowed, totalCollateral, accruedInterest, averageHf, dailyInterest }
  }, [debtsRows])

  useEffect(() => {
    onTabChange?.(currentTab)
  }, [currentTab, onTabChange])

  useEffect(() => {
    onSupplyStatsChange?.(supplyTotals)
  }, [supplyTotals, onSupplyStatsChange])

  useEffect(() => {
    onDebtsStatsChange?.(debtTotals)
  }, [debtTotals, onDebtsStatsChange])

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

  const handleSupplyBorrowMore = useCallback((context: SupplyRowContext) => {
    setBorrowModal({
      open: true,
      context: {
        pool: context.pool,
        currentDebtUsd: context.borrowedUsd,
        defaultTokenId: "usdc",
      },
    })
  }, [])

  const handleSupplyAddCollateral = useCallback((context: SupplyRowContext) => {
    const { pool } = context
    const spokeId = homePoolSpoke(pool.category)
    const feesApy = context.pairApr
    const borrowPoolRow: BorrowPoolRow = {
      id: pool.id,
      name: pool.name,
      venue: pool.venue,
      spoke: spokeId,
      ltv: pool.maxLtv,
      dexes: [],
      borrowableTokens: [],
      aprMin: feesApy,
      aprMax: feesApy,
      availableUsd: Math.max(0, pool.borrowPowerUsd - context.borrowedUsd),
      riskPremiumBps: 0,
      visuals: pool.visuals.map(homeVisualToBorrowVisual) as BorrowPoolRow["visuals"],
      collateralExampleUsd: pool.collateralUsd,
      trendUp: true,
    }
    setSupplyModal({ open: true, context: { pool: borrowPoolRow } })
  }, [])

  const handleSupplyRemove = useCallback((context: SupplyRowContext) => {
    setRepayRemoveModal({
      open: true,
      context: { pool: context.pool, currentDebtUsd: context.borrowedUsd, mode: "remove" },
    })
  }, [])

  const handleDebtRepay = useCallback((context: DebtRowContext) => {
    setRepayRemoveModal({
      open: true,
      context: { pool: context.pool, currentDebtUsd: context.borrowedUsd, mode: "repay", borrowApr: context.borrowApr },
    })
  }, [])

  const handleDebtManage = useCallback((context: DebtRowContext) => {
    setBorrowModal({
      open: true,
      context: { pool: context.pool, currentDebtUsd: context.borrowedUsd, defaultTokenId: "usdc" },
    })
  }, [])

  const handleSupplyConfirm = useCallback((result: SupplyCollateralResult) => {
    setSupplyModal({ open: false, context: null })
    setSuccessState({
      open: true,
      payload: {
        title: "Posted as collateral",
        subtitle: `${result.pool.name} LP · ${result.pool.venue}`,
        amountLabel: formatUsdExact(result.amountUsd),
        ringEmoji: "✓",
        ringBgClass: "bg-emerald-100 text-emerald-700",
        rows: [
          { label: "Position", value: `${result.pool.name} LP · ${result.pool.venue}` },
          { label: "Max LTV", value: `${result.pool.ltv}%`, tone: "text-emerald-600" },
          { label: "Borrow power", value: formatUsdExact(result.borrowPowerUsd), tone: "text-emerald-600" },
          { label: "APY", value: `${result.feesApy.toFixed(1)}% · LP keeps earning`, tone: "text-emerald-600" },
        ],
        primaryLabel: "Done",
      },
    })
  }, [])

  const handleBorrowConfirm = useCallback((result: BorrowModalResult) => {
    setDebts((previous) => ({ ...previous, [result.pool.id]: (previous[result.pool.id] ?? 0) + result.amountUsd }))
    setBorrowModal({ open: false, context: null })
    setSuccessState({
      open: true,
      payload: {
        title: "Borrow successful",
        subtitle: `${result.pool.name} collateral`,
        amountLabel: `${result.amountUsd.toFixed(0)} ${result.token.symbol}`,
        ringEmoji: "✓",
        ringBgClass: "bg-emerald-100 text-emerald-700",
        rows: [
          { label: "Against", value: `${result.pool.name} · ${formatUsdExact(result.pool.collateralUsd)}` },
          { label: "Rate", value: `${result.token.borrowApr.toFixed(1)}% APR`, tone: "text-rose-600" },
          {
            label: "Health factor",
            value: formatHealthFactor(result.healthFactorAfter),
          },
          { label: "Remaining power", value: formatUsdExact(result.remainingBorrowPowerUsd) },
        ],
        primaryLabel: "Done",
      },
    })
  }, [])

  const handleRepayRemoveConfirm = useCallback((result: RepayRemoveResult) => {
    if (result.mode === "repay") {
      setDebts((previous) => ({
        ...previous,
        [result.pool.id]: Math.max(0, (previous[result.pool.id] ?? 0) - result.amountUsd),
      }))
    }
    setRepayRemoveModal({ open: false, context: null })
    setSuccessState({
      open: true,
      payload: {
        title: result.mode === "repay" ? "Repay successful" : "Removed liquidity",
        subtitle: `${result.pool.name}`,
        amountLabel:
          result.mode === "repay"
            ? `-${formatUsdExact(result.amountUsd)}`
            : `${(result.percent ?? 0).toFixed(0)}% · ${formatUsdExact(result.amountUsd)}`,
        ringEmoji: result.mode === "repay" ? "↓" : "−",
        ringBgClass: result.mode === "repay" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
        rows: [
          { label: "Position", value: result.pool.name },
          { label: "Health factor", value: formatHealthFactor(result.healthFactorAfter) },
        ],
        primaryLabel: "Done",
      },
    })
  }, [])

  // Sort options per tab
  const activeSortOptions =
    isPoolTab(currentTab)
      ? POOL_SORT_OPTIONS
      : currentTab === "assets"
        ? ASSET_SORT_OPTIONS
        : []

  const activeSortKey =
    isPoolTab(currentTab)
      ? poolSortKey
      : currentTab === "assets"
        ? assetSortKey
        : ""

  const activeSortDirection =
    isPoolTab(currentTab)
      ? poolSortDirection
      : currentTab === "assets"
        ? assetSortDirection
        : "desc"

  const onSortKeyChange = (key: string) => {
    if (isPoolTab(currentTab)) setPoolSortKey(key as PoolSortKey)
    else if (currentTab === "assets") setAssetSortKey(key as AssetSortKey)
  }

  const onSortDirectionChange = (direction: "asc" | "desc") => {
    if (isPoolTab(currentTab)) setPoolSortDirection(direction)
    else if (currentTab === "assets") setAssetSortDirection(direction)
  }

  const counts: Record<BorrowTabId, number> = {
    "all-markets": poolTabCounts["all-markets"],
    btc: poolTabCounts.btc,
    eth: poolTabCounts.eth,
    forex: poolTabCounts.forex,
    governance: poolTabCounts.governance,
    "smart-pools": poolTabCounts["smart-pools"],
    assets: sortedAssets.length,
    positions: supplies.length + debtsRows.length,
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
            />
            <PoolsList
              groups={poolGroups}
              pending={BORROW_PENDING_ROWS}
              onUseAsCollateral={handlePoolsSupply}
            />
          </>
        ) : null}

        {currentTab === "assets" ? (
            <AssetsPanel
              rows={sortedAssets}
              onBorrow={handleAssetBorrow}
              onViewMarket={(asset) => {
                setFilterText(asset.symbol)
                setCurrentTab("all-markets")
              }}
            />
          ) : null}

        {currentTab === "positions" ? (
          <div className="flex flex-col gap-8">
            <SuppliesPanel
              rows={sortedSupplies}
              totals={supplyTotals}
              onBorrowMore={handleSupplyBorrowMore}
              onAddCollateral={handleSupplyAddCollateral}
              onRemove={handleSupplyRemove}
              showBalance={showBalance}
            />
            <DebtsPanel rows={sortedDebts} totals={debtTotals} onRepay={handleDebtRepay} onManage={handleDebtManage} showBalance={showBalance} />
          </div>
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

      <RepayRemoveModal
        open={repayRemoveModal.open}
        context={repayRemoveModal.context}
        onClose={() => setRepayRemoveModal({ open: false, context: null })}
        onConfirm={handleRepayRemoveConfirm}
      />

      <SuccessOverlay
        open={successState.open}
        onClose={() => setSuccessState({ open: false, payload: null })}
        title={successState.payload?.title ?? ""}
        subtitle={successState.payload?.subtitle}
        amountLabel={successState.payload?.amountLabel ?? ""}
        ringEmoji={successState.payload?.ringEmoji}
        ringBgClass={successState.payload?.ringBgClass}
        rows={successState.payload?.rows ?? []}
        primaryLabel={successState.payload?.primaryLabel}
      />
    </section>
  )
}
