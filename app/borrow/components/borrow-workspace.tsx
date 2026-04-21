"use client"

import { useCallback, useMemo, useState } from "react"
import {
  BORROWABLE_ASSETS,
  BORROW_PENDING_ROWS,
  BORROW_POOL_CATALOG,
  BORROW_SUPPLY_META,
  filterAssets,
  filterPools,
  formatUsdExact,
  groupBySpoke,
  sortAssets,
  sortPools,
  type AssetSortKey,
  type BorrowSpokeId,
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
import { TabsBar, type BorrowTabId, type SortOption } from "./tabs-bar"
import { PoolsList, PoolsTable } from "./pools-table"
import { SuppliesPanel, type SupplyRowContext } from "./supplies-table"
import { AssetsPanel } from "./assets-table"
import { DebtsPanel, type DebtRowContext } from "./debts-table"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "./borrow-modal"
import { RepayRemoveModal, type RepayRemoveContext, type RepayRemoveResult } from "./repay-remove-modal"
import { SuccessOverlay, type SuccessOverlayProps } from "./success-overlay"

type DebtsState = Record<string, number>

const POOL_SORT_OPTIONS: SortOption[] = [
  { key: "apr", label: "APR" },
  { key: "ltv", label: "Max LTV" },
  { key: "available", label: "Available" },
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

function averageHealthFactor(rows: Array<{ pool: HomeCollateralPool; borrowedUsd: number }>): number | null {
  const finite = rows
    .map((row) => computeHealthFactor(row.pool, row.borrowedUsd))
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (finite.length === 0) return null
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function getUsdcToken(): HomeBorrowToken {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[1]
}

export function BorrowWorkspace() {
  const [currentTab, setCurrentTab] = useState<BorrowTabId>("pools")
  const [filterText, setFilterText] = useState("")
  const [selectedSpokes, setSelectedSpokes] = useState<Set<BorrowSpokeId>>(() => new Set())
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
  const [repayRemoveModal, setRepayRemoveModal] = useState<{ open: boolean; context: RepayRemoveContext | null }>({
    open: false,
    context: null,
  })
  const [successState, setSuccessState] = useState<{ open: boolean; payload: Omit<SuccessOverlayProps, "open" | "onClose"> | null }>({
    open: false,
    payload: null,
  })

  const toggleSpoke = useCallback((spoke: BorrowSpokeId) => {
    setSelectedSpokes((previous) => {
      const next = new Set(previous)
      if (next.has(spoke)) next.delete(spoke)
      else next.add(spoke)
      return next
    })
  }, [])

  // Data for each tab
  const supplies = useMemo<SupplyRowContext[]>(() => {
    return HOME_COLLATERAL_POOLS.map((pool) => ({
      pool,
      borrowedUsd: debts[pool.id] ?? 0,
      healthFactor: computeHealthFactor(pool, debts[pool.id] ?? 0),
    }))
  }, [debts])

  const debtsRows = useMemo<DebtRowContext[]>(() => {
    const usdc = getUsdcToken()
    return HOME_COLLATERAL_POOLS.map((pool) => ({
      pool,
      borrowedUsd: debts[pool.id] ?? 0,
      healthFactor: computeHealthFactor(pool, debts[pool.id] ?? 0),
      borrowApr: usdc.borrowApr,
    })).filter((row) => row.borrowedUsd > 0)
  }, [debts])

  const sortedPools = useMemo(() => {
    const filtered = filterPools(BORROW_POOL_CATALOG, { text: filterText, spokes: selectedSpokes })
    return sortPools(filtered, poolSortKey, poolSortDirection)
  }, [filterText, selectedSpokes, poolSortKey, poolSortDirection])

  const poolGroups = useMemo(() => groupBySpoke(sortedPools), [sortedPools])

  const sortedAssets = useMemo<BorrowableAsset[]>(() => {
    const filtered = filterAssets(BORROWABLE_ASSETS, filterText)
    return sortAssets(filtered, assetSortKey, assetSortDirection)
  }, [filterText, assetSortKey, assetSortDirection])

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
            return row.pool.pairApr
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

  // Totals
  const supplyTotals = useMemo(() => {
    const collateral = supplies.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const borrowed = supplies.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const available = supplies.reduce((sum, row) => sum + Math.max(0, row.pool.borrowPowerUsd - row.borrowedUsd), 0)
    const fees = Object.values(BORROW_SUPPLY_META).reduce((sum, meta) => sum + meta.feesUsd, 0)
    const averageHf = averageHealthFactor(supplies.filter((row) => row.borrowedUsd > 0))
    return { collateral, borrowed, available, fees, averageHf }
  }, [supplies])

  const debtTotals = useMemo(() => {
    const totalBorrowed = debtsRows.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const totalCollateral = debtsRows.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const accruedInterest = debtsRows.reduce((sum, row) => sum + (BORROW_SUPPLY_META[row.pool.id]?.accruedInterestUsd ?? 0), 0)
    const averageHf = averageHealthFactor(debtsRows)
    const dailyInterest = debtsRows.reduce((sum, row) => sum + (row.borrowedUsd * (row.borrowApr / 100)) / 365, 0)
    return { totalBorrowed, totalCollateral, accruedInterest, averageHf, dailyInterest }
  }, [debtsRows])

  const handlePoolsBorrow = useCallback(
    (poolId: string) => {
      const matchingHomePool = HOME_COLLATERAL_POOLS.find((pool) => pool.id === poolId)
      if (matchingHomePool) {
        setBorrowModal({
          open: true,
          context: {
            pool: matchingHomePool,
            currentDebtUsd: debts[matchingHomePool.id] ?? 0,
            defaultTokenId: "usdc",
          },
        })
        return
      }

      const catalogRow = BORROW_POOL_CATALOG.find((row) => row.id === poolId)
      if (!catalogRow) return

      const collateralUsd = catalogRow.collateralExampleUsd
      const borrowPower = collateralUsd * (catalogRow.ltv / 100)
      const spokeCategory =
        catalogRow.spoke === "stable" ? "Stable Spoke" : catalogRow.spoke === "bluechip" ? "Bluechip Spoke" : "Open Spoke"
      const syntheticPool: HomeCollateralPool = {
        id: `catalog-${catalogRow.id}`,
        name: catalogRow.name,
        venue: catalogRow.venue,
        category: spokeCategory,
        collateralUsd,
        maxLtv: catalogRow.ltv,
        borrowPowerUsd: borrowPower,
        liquidationUsd: collateralUsd * 0.85,
        pairApr: (catalogRow.aprMin + catalogRow.aprMax) / 2,
        visuals: [
          {
            symbol: catalogRow.visuals[0].symbol,
            shortLabel: catalogRow.visuals[0].shortLabel,
            bgClassName: catalogRow.visuals[0].bgClass,
            textClassName: catalogRow.visuals[0].textClass,
          },
          {
            symbol: catalogRow.visuals[1].symbol,
            shortLabel: catalogRow.visuals[1].shortLabel,
            bgClassName: catalogRow.visuals[1].bgClass,
            textClassName: catalogRow.visuals[1].textClass,
          },
        ],
      }
      setBorrowModal({
        open: true,
        context: {
          pool: syntheticPool,
          currentDebtUsd: 0,
          defaultTokenId: catalogRow.borrowableTokens[0]?.symbol.toLowerCase() ?? "usdc",
        },
      })
    },
    [debts],
  )

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
    currentTab === "pools"
      ? POOL_SORT_OPTIONS
      : currentTab === "assets"
        ? ASSET_SORT_OPTIONS
        : currentTab === "supplies"
          ? SUPPLY_SORT_OPTIONS
          : DEBT_SORT_OPTIONS

  const activeSortKey =
    currentTab === "pools"
      ? poolSortKey
      : currentTab === "assets"
        ? assetSortKey
        : currentTab === "supplies"
          ? supplySortKey
          : debtSortKey

  const activeSortDirection =
    currentTab === "pools"
      ? poolSortDirection
      : currentTab === "assets"
        ? assetSortDirection
        : currentTab === "supplies"
          ? supplySortDirection
          : debtSortDirection

  const onSortKeyChange = (key: string) => {
    if (currentTab === "pools") setPoolSortKey(key as PoolSortKey)
    else if (currentTab === "assets") setAssetSortKey(key as AssetSortKey)
    else if (currentTab === "supplies") setSupplySortKey(key)
    else setDebtSortKey(key)
  }

  const onSortDirectionChange = (direction: "asc" | "desc") => {
    if (currentTab === "pools") setPoolSortDirection(direction)
    else if (currentTab === "assets") setAssetSortDirection(direction)
    else if (currentTab === "supplies") setSupplySortDirection(direction)
    else setDebtSortDirection(direction)
  }

  const counts: Record<BorrowTabId, number> = {
    pools: sortedPools.length,
    supplies: supplies.length,
    assets: sortedAssets.length,
    debts: debtsRows.length,
  }

  return (
    <section className="px-4 pb-16 md:px-6">
      <TabsBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        counts={counts}
        filterText={filterText}
        onFilterChange={setFilterText}
        selectedSpokes={selectedSpokes}
        onToggleSpoke={toggleSpoke}
        sortKey={activeSortKey}
        sortOptions={activeSortOptions}
        sortDirection={activeSortDirection}
        onSortKeyChange={onSortKeyChange}
        onSortDirectionChange={onSortDirectionChange}
      />

      <div className="py-6">
        {currentTab === "pools" ? (
          <>
            <PoolsTable
              groups={poolGroups}
              pending={BORROW_PENDING_ROWS}
              onUseAsCollateral={(pool) => handlePoolsBorrow(pool.id)}
            />
            <PoolsList
              groups={poolGroups}
              pending={BORROW_PENDING_ROWS}
              onUseAsCollateral={(pool) => handlePoolsBorrow(pool.id)}
            />
          </>
        ) : null}

        {currentTab === "supplies" ? (
          <SuppliesPanel
            rows={sortedSupplies}
            totals={supplyTotals}
            onBorrowMore={handleSupplyBorrowMore}
            onRemove={handleSupplyRemove}
          />
        ) : null}

        {currentTab === "assets" ? <AssetsPanel rows={sortedAssets} onBorrow={handleAssetBorrow} /> : null}

        {currentTab === "debts" ? (
          <DebtsPanel rows={sortedDebts} totals={debtTotals} onRepay={handleDebtRepay} onManage={handleDebtManage} />
        ) : null}
      </div>

      <BorrowModal
        open={borrowModal.open}
        context={borrowModal.context}
        onClose={() => setBorrowModal({ open: false, context: null })}
        onConfirm={handleBorrowConfirm}
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
