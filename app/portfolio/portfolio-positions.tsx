"use client"

import { useCallback, useMemo, useState } from "react"
import { parseFixed, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import type { SandboxActionResult, TransactionIntent, TransactionPreview } from "@/app/lib/borrow-system/contracts"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { homePoolSpoke, homeVisualToBorrowVisual, type BorrowPoolRow, type BorrowableAsset, type HomeBorrowToken } from "@/app/lib/data/borrow-domain"
import { BorrowModal, type BorrowModalContext, type BorrowModalResult } from "@/app/borrow/components/borrow-modal"
import { RepayRemoveModal, type RepayRemoveContext, type RepayRemoveResult } from "@/app/borrow/components/repay-remove-modal"
import {
  SupplyCollateralModal,
  type SupplyCollateralContext,
  type SupplyCollateralResult,
} from "@/app/borrow/components/supply-collateral-modal"
import { CurrentLtvCard, DebtsPanel, type DebtRowContext } from "@/app/borrow/components/debts-table"
import { SuppliesHealthFactorCard, SuppliesPanel, type SupplyRowContext } from "@/app/borrow/components/supplies-table"

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

function toBorrowToken(asset: BorrowableAsset): HomeBorrowToken {
  return {
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    subtitle: asset.subtitle,
    borrowApr: asset.borrowApr,
    visual: {
      symbol: asset.visual.symbol,
      shortLabel: asset.visual.shortLabel,
      bgClassName: asset.visual.bgClass,
      textClassName: asset.visual.textClass,
    },
  }
}

type BorrowSessionAdapter = {
  state: BorrowSystemState
  getBorrowableAssetsForMarket: (marketId?: string) => BorrowableAsset[]
  createIntent: (action: BorrowAction) => TransactionIntent
  previewTransaction: (intent: TransactionIntent) => Promise<TransactionPreview>
  executeTransaction: (intent: TransactionIntent) => Promise<SandboxActionResult>
}

export function PortfolioPositions({
  section = "all",
  collateralPositions = [],
  debtPositions = [],
  showSummary = true,
  walletId,
  borrowSession,
}: {
  section?: "all" | "supplies" | "debts"
  collateralPositions?: SupplyRowContext[]
  debtPositions?: DebtRowContext[]
  showSummary?: boolean
  walletId?: string
  borrowSession?: BorrowSessionAdapter
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const [marketsTab, setMarketsTab] = useState<"supplies" | "debts">(section === "debts" ? "debts" : "supplies")
  const [borrowModal, setBorrowModal] = useState<{ open: boolean; context: BorrowModalContext | null }>({ open: false, context: null })
  const [supplyModal, setSupplyModal] = useState<{ open: boolean; context: SupplyCollateralContext | null }>({
    open: false,
    context: null,
  })
  const [repayRemoveModal, setRepayRemoveModal] = useState<{ open: boolean; context: RepayRemoveContext | null }>({
    open: false,
    context: null,
  })
  const supplies = collateralPositions
  const debtsRows = useMemo(() => debtPositions.filter((row) => row.borrowedUsd > 0), [debtPositions])

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

  const executeAction = useCallback(
    async (action: BorrowAction) => {
      if (!borrowSession) return
      const intent = borrowSession.createIntent(action)
      const preview = await borrowSession.previewTransaction(intent)
      if (!preview.allowed) return
      await borrowSession.executeTransaction(preview.intent)
    },
    [borrowSession],
  )

  const handleSupplyBorrowMore = useCallback((context: SupplyRowContext) => {
    const tokenOptions = borrowSession?.getBorrowableAssetsForMarket(context.pool.id).map(toBorrowToken) ?? []
    setBorrowModal({
      open: true,
      context: {
        pool: context.pool,
        currentDebtUsd: context.borrowedUsd,
        defaultTokenId: tokenOptions[0]?.id,
        tokenOptions,
      },
    })
  }, [borrowSession])

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
    const tokenOptions = borrowSession?.getBorrowableAssetsForMarket(context.pool.id).map(toBorrowToken) ?? []
    const defaultTokenId =
      borrowSession?.state.accounts[walletId ?? ""]?.debtPositions.find((position) => position.id === context.id)?.assetId ??
      tokenOptions[0]?.id
    setBorrowModal({
      open: true,
      context: {
        pool: context.pool,
        currentDebtUsd: context.borrowedUsd,
        defaultTokenId,
        tokenOptions,
      },
    })
  }, [borrowSession, walletId])

  const handleSupplyConfirm = useCallback((result: SupplyCollateralResult) => {
    if (!borrowSession || !walletId) return
    void executeAction({
      type: "supplyCollateral",
      walletId,
      marketId: result.pool.id,
      amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
    })
  }, [borrowSession, executeAction, walletId])

  const handleBorrowConfirm = useCallback((result: BorrowModalResult) => {
    if (!borrowSession || !walletId) return
    void executeAction({
      type: "borrow",
      walletId,
      marketId: result.pool.id,
      assetId: result.token.id,
      amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
    })
  }, [borrowSession, executeAction, walletId])

  const handleRepayRemoveConfirm = useCallback((result: RepayRemoveResult) => {
    if (!borrowSession || !walletId) return
    if (result.mode === "repay") {
      const debtRow = debtPositions.find((row) => row.pool.id === result.pool.id)
      if (!debtRow?.id) return
      void executeAction({
        type: "repay",
        walletId,
        debtPositionId: debtRow.id,
        amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
      })
      return
    }

    const position = borrowSession.state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === result.pool.id)
    if (!position) return
    void executeAction({
      type: "removeCollateral",
      walletId,
      positionId: position.id,
      amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
    })
  }, [borrowSession, debtPositions, executeAction, walletId])

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
                Collateral Positions
              </TabsTrigger>
              <TabsTrigger value="debts" className="shrink-0 text-[14px] font-normal">
                Debt Positions
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
