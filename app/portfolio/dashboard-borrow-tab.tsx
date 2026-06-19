"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { homePoolSpoke, homeVisualToBorrowVisual, type BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import type { BorrowSnapshot } from "./borrow-hero-state"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "@/app/borrow/components/borrow-modal"
import { RepayRemoveModal, type RepayRemoveContext, type RepayRemoveResult } from "@/app/borrow/components/repay-remove-modal"
import {
  SupplyCollateralModal,
  type SupplyCollateralContext,
  type SupplyCollateralResult,
} from "@/app/borrow/components/supply-collateral-modal"
import { CurrentLtvCard, DebtsPanel } from "@/app/dashboard/components/borrow-tab/debts-table"
import { SuppliesHealthFactorCard, SuppliesPanel } from "@/app/dashboard/components/borrow-tab/supplies-table"

type DebtsState = Record<string, number>

function computeHealthFactor(pool: SupplyRowContext["pool"], debt: number): number | null {
  if (debt <= 0) return Number.POSITIVE_INFINITY
  return (pool.collateralUsd * (pool.maxLtv / 100)) / debt
}

function averageHealthFactor(rows: Array<{ healthFactor: number | null }>): number | null {
  const finite = rows
    .map((row) => row.healthFactor)
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (finite.length === 0) return null
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function sortByCollateralDesc(rows: SupplyRowContext[]) {
  return [...rows].sort((left, right) => right.pool.collateralUsd - left.pool.collateralUsd)
}

function sortByBorrowedDesc(rows: DebtRowContext[]) {
  return [...rows].sort((left, right) => right.borrowedUsd - left.borrowedUsd)
}

export function DashboardBorrowTab({
  section = "all",
  collateralPositions = [],
  debtPositions = [],
  onSnapshotChange,
  showSummary = true,
}: {
  section?: "all" | "supplies" | "debts"
  collateralPositions?: SupplyRowContext[]
  debtPositions?: DebtRowContext[]
  onSnapshotChange?: (snapshot: BorrowSnapshot) => void
  showSummary?: boolean
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const [marketsTab, setMarketsTab] = useState<"supplies" | "debts">(section === "debts" ? "debts" : "supplies")
  const [collateralState, setCollateralState] = useState<SupplyRowContext[]>(() => collateralPositions)
  const [debtState, setDebtState] = useState<DebtsState>(() =>
    Object.fromEntries(debtPositions.map((row) => [row.pool.id, row.borrowedUsd])),
  )
  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })
  const [repayRemoveModal, setRepayRemoveModal] = useState<{ open: boolean; context: RepayRemoveContext | null }>({
    open: false,
    context: null,
  })

  useEffect(() => {
    setCollateralState(collateralPositions)
  }, [collateralPositions])

  useEffect(() => {
    setDebtState(Object.fromEntries(debtPositions.map((row) => [row.pool.id, row.borrowedUsd])))
  }, [debtPositions])

  const supplies = useMemo<SupplyRowContext[]>(() => {
    return collateralState.map((row) => ({
      ...row,
      borrowedUsd: debtState[row.pool.id] ?? row.borrowedUsd,
      remainingBorrowPowerUsd: Math.max(
        0,
        row.remainingBorrowPowerUsd + row.borrowedUsd - (debtState[row.pool.id] ?? row.borrowedUsd),
      ),
      liquidationThresholdUsd:
        row.borrowedUsd > 0 ? (row.liquidationThresholdUsd / row.borrowedUsd) * (debtState[row.pool.id] ?? row.borrowedUsd) : 0,
      healthFactor: computeHealthFactor(row.pool, debtState[row.pool.id] ?? row.borrowedUsd),
    }))
  }, [collateralState, debtState])

  const debtsRows = useMemo<DebtRowContext[]>(() => {
    return debtPositions
      .map((row) => ({
        ...row,
        borrowedUsd: debtState[row.pool.id] ?? row.borrowedUsd,
        liquidationThresholdUsd:
          row.borrowedUsd > 0 ? (row.liquidationThresholdUsd / row.borrowedUsd) * (debtState[row.pool.id] ?? row.borrowedUsd) : 0,
        healthFactor: computeHealthFactor(row.pool, debtState[row.pool.id] ?? row.borrowedUsd),
      }))
      .filter((row) => row.borrowedUsd > 0)
  }, [debtPositions, debtState])

  const sortedSupplies = useMemo(() => sortByCollateralDesc(supplies), [supplies])
  const sortedDebts = useMemo(() => sortByBorrowedDesc(debtsRows), [debtsRows])

  const supplyTotals = useMemo(() => {
    const collateral = supplies.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const borrowed = supplies.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const available = supplies.reduce((sum, row) => sum + row.remainingBorrowPowerUsd, 0)
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
    const pool = context.pool
    const borrowPoolRow: BorrowPoolRow = {
      id: pool.id,
      name: pool.name,
      venue: pool.venue,
      feeTier: pool.category,
      tvlUsd: pool.collateralUsd,
      spoke: homePoolSpoke(pool.category),
      ltv: pool.maxLtv,
      dexes: [],
      borrowableTokens: [],
      aprMin: context.pairApr,
      aprMax: context.pairApr,
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
    setCollateralState((previous) =>
      previous.map((row) =>
        row.pool.id === result.pool.id
          ? {
              ...row,
              pool: {
                ...row.pool,
                collateralUsd: row.pool.collateralUsd + result.amountUsd,
                borrowPowerUsd: row.pool.borrowPowerUsd + result.borrowPowerUsd,
              },
            }
          : row,
      ),
    )
  }, [])

  const handleBorrowConfirm = useCallback((result: BorrowModalResult) => {
    setDebtState((previous) => ({ ...previous, [result.pool.id]: (previous[result.pool.id] ?? 0) + result.amountUsd }))
  }, [])

  const handleRepayRemoveConfirm = useCallback((result: RepayRemoveResult) => {
    if (result.mode === "repay") {
      setDebtState((previous) => ({
        ...previous,
        [result.pool.id]: Math.max(0, (previous[result.pool.id] ?? 0) - result.amountUsd),
      }))
      return
    }

    setCollateralState((previous) =>
      previous.map((row) =>
        row.pool.id === result.pool.id
          ? {
              ...row,
              pool: {
                ...row.pool,
                collateralUsd: Math.max(0, row.pool.collateralUsd - result.amountUsd),
                borrowPowerUsd: Math.max(0, row.pool.borrowPowerUsd - result.amountUsd * (row.pool.maxLtv / 100)),
              },
            }
          : row,
      ),
    )
  }, [])

  const borrowSnapshot = useMemo<BorrowSnapshot>(() => {
    const totalCollateralUsd = supplies.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const totalBorrowedUsd = debtTotals.totalBorrowed
    const approvedUsd = supplies.reduce((sum, row) => sum + row.remainingBorrowPowerUsd, 0)
    const liquidationThresholdUsd = debtsRows.reduce((sum, row) => sum + row.liquidationThresholdUsd, 0)
    const currentLtvPct = totalCollateralUsd > 0 ? (totalBorrowedUsd / totalCollateralUsd) * 100 : 0

    return {
      approvedUsd,
      liquidationThresholdUsd,
      totalBorrowedUsd,
      totalCollateralUsd,
      averageHealthFactor: debtTotals.averageHf ?? supplyTotals.averageHf,
      currentLtvPct,
    }
  }, [debtTotals.averageHf, debtTotals.totalBorrowed, debtsRows, supplies, supplyTotals.averageHf])

  useEffect(() => {
    onSnapshotChange?.(borrowSnapshot)
  }, [borrowSnapshot, onSnapshotChange])

  return (
    <section className="space-y-8">
      {section === "all" ? (
        <>
          {showSummary ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <SuppliesHealthFactorCard averageHealthFactor={supplyTotals.averageHf} showBalance={showDollarAmounts} />
              <CurrentLtvCard borrowedUsd={debtTotals.totalBorrowed} collateralUsd={debtTotals.totalCollateral} showBalance={showDollarAmounts} />
            </div>
          ) : null}

          <Tabs value={marketsTab} onValueChange={(value) => setMarketsTab(value as "supplies" | "debts")}>
            <TabsList className="inline-flex w-max min-w-max justify-start">
              <TabsTrigger value="supplies" className="shrink-0 text-[14px] font-normal">
                Collateral
              </TabsTrigger>
              <TabsTrigger value="debts" className="shrink-0 text-[14px] font-normal">
                Borrowable
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            {marketsTab === "supplies" ? (
              <SuppliesPanel
                rows={sortedSupplies}
                totals={supplyTotals}
                onBorrowMore={handleSupplyBorrowMore}
                onAddCollateral={handleSupplyAddCollateral}
                onRemove={handleSupplyRemove}
                showBalance={showDollarAmounts}
                showSummary={false}
                showHeading={false}
              />
            ) : null}
            {marketsTab === "debts" ? (
              <DebtsPanel
                rows={sortedDebts}
                totals={debtTotals}
                onRepay={handleDebtRepay}
                onManage={handleDebtManage}
                showBalance={showDollarAmounts}
                showSummary={false}
                showHeading={false}
              />
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-8">
          {section !== "debts" ? (
            <SuppliesPanel
              rows={sortedSupplies}
              totals={supplyTotals}
              onBorrowMore={handleSupplyBorrowMore}
              onAddCollateral={handleSupplyAddCollateral}
              onRemove={handleSupplyRemove}
              showBalance={showDollarAmounts}
            />
          ) : null}
          {section !== "supplies" ? (
            <DebtsPanel
              rows={sortedDebts}
              totals={debtTotals}
              onRepay={handleDebtRepay}
              onManage={handleDebtManage}
              showBalance={showDollarAmounts}
            />
          ) : null}
        </div>
      )}

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
    </section>
  )
}
