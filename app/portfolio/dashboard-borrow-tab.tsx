"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { CurrentLtvCard, DebtsPanel } from "@/app/dashboard/components/borrow-tab/debts-table"
import { SuppliesHealthFactorCard, SuppliesPanel } from "@/app/dashboard/components/borrow-tab/supplies-table"

// Aggregate wallet-wide health factor: total liquidation value / total debt — the same
// definition used by the hero (map-portfolio-page / selectWalletBorrowSnapshot), rather
// than averaging per-row ratios, so the summary cards agree with the hero.
function aggregateHealthFactor(rows: Array<{ liquidationThresholdUsd: number; borrowedUsd: number }>): number | null {
  const totalDebt = rows.reduce((sum, row) => sum + row.borrowedUsd, 0)
  if (totalDebt <= 0) return null
  const totalLiquidation = rows.reduce((sum, row) => sum + row.liquidationThresholdUsd, 0)
  return totalLiquidation / totalDebt
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
  showSummary = true,
  returnHref,
}: {
  section?: "all" | "supplies" | "debts"
  collateralPositions?: SupplyRowContext[]
  debtPositions?: DebtRowContext[]
  showSummary?: boolean
  returnHref?: string
}) {
  const router = useRouter()
  const { showDollarAmounts } = useDisplayPreferences()
  const { t } = useTranslation()
  const [marketsTab, setMarketsTab] = useState<"supplies" | "debts">(section === "debts" ? "debts" : "supplies")
  const supplies = collateralPositions
  const debtsRows = useMemo(() => debtPositions.filter((row) => row.borrowedUsd > 0), [debtPositions])
  const returnParams = returnHref ? { return: returnHref } : undefined

  const sortedSupplies = useMemo(() => sortByCollateralDesc(supplies), [supplies])
  const sortedDebts = useMemo(() => sortByBorrowedDesc(debtsRows), [debtsRows])

  const supplyTotals = useMemo(() => {
    const collateral = supplies.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const borrowed = supplies.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const available = supplies.reduce((sum, row) => sum + row.remainingBorrowPowerUsd, 0)
    const fees = supplies.reduce((sum, row) => sum + row.feesUsd, 0)
    const averageHf = aggregateHealthFactor(supplies.filter((row) => row.borrowedUsd > 0))
    return { collateral, borrowed, available, fees, averageHf }
  }, [supplies])

  const debtTotals = useMemo(() => {
    const totalBorrowed = debtsRows.reduce((sum, row) => sum + row.borrowedUsd, 0)
    const totalCollateral = debtsRows.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
    const accruedInterest = debtsRows.reduce((sum, row) => sum + row.accruedInterestUsd, 0)
    const averageHf = aggregateHealthFactor(debtsRows)
    const dailyInterest = debtsRows.reduce((sum, row) => sum + row.dailyInterestUsd, 0)
    return { totalBorrowed, totalCollateral, accruedInterest, averageHf, dailyInterest }
  }, [debtsRows])

  const handleSupplyBorrowMore = useCallback(
    (context: SupplyRowContext) => {
      router.push(actionPagePath("borrow", "borrow", { market: context.pool.id, ...returnParams }))
    },
    [returnParams, router],
  )

  const handleSupplyAddCollateral = useCallback(
    (context: SupplyRowContext) => {
      router.push(actionPagePath("borrow", "supply", { market: context.pool.id, ...returnParams }))
    },
    [returnParams, router],
  )

  const handleSupplyRemove = useCallback(
    (context: SupplyRowContext) => {
      router.push(actionPagePath("borrow", "remove", { market: context.pool.id, ...returnParams }))
    },
    [returnParams, router],
  )

  const handleDebtRepay = useCallback(
    (context: DebtRowContext) => {
      router.push(actionPagePath("borrow", "repay", { market: context.pool.id, ...returnParams }))
    },
    [returnParams, router],
  )

  const handleDebtManage = useCallback(
    (context: DebtRowContext) => {
      router.push(actionPagePath("borrow", "borrow", { market: context.pool.id, ...returnParams }))
    },
    [returnParams, router],
  )

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
                {t("Collateral Positions")}
              </TabsTrigger>
              <TabsTrigger value="debts" className="shrink-0 text-[14px] font-normal">
                {t("Debt Positions")}
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
        <>
          {section === "supplies" ? (
            <SuppliesPanel
              rows={sortedSupplies}
              totals={supplyTotals}
              onBorrowMore={handleSupplyBorrowMore}
              onAddCollateral={handleSupplyAddCollateral}
              onRemove={handleSupplyRemove}
              showBalance={showDollarAmounts}
              showSummary={showSummary}
            />
          ) : null}
          {section === "debts" ? (
            <DebtsPanel
              rows={sortedDebts}
              totals={debtTotals}
              onRepay={handleDebtRepay}
              onManage={handleDebtManage}
              showBalance={showDollarAmounts}
              showSummary={showSummary}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
