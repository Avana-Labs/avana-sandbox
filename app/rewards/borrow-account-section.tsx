"use client"

import { lazy, useMemo } from "react"
import { useAvanaIdentity, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardBorrowLive } from "@/app/dashboard/use-dashboard-borrow-live"
import { selectBorrowSnapshot } from "@/app/lib/borrow-system/dashboard-selectors"
import { buildPortfolioBorrowData } from "@/app/lib/borrow-system/read-model"
import {
  buildBorrowDashboardMetrics,
  buildBorrowDashboardMetricsFromSnapshot,
  type DashboardTabMetrics,
} from "@/app/dashboard/dashboard-tab-metrics"
import { DashboardCreditOverviewSection } from "@/app/dashboard/dashboard-metric-section"
import { SuppliesHealthFactorCard } from "@/app/dashboard/borrow-tab/supplies-table"
import { CurrentLtvCard } from "@/app/dashboard/borrow-tab/debts-table"
import type { BorrowSnapshot } from "@/app/dashboard/borrow-hero-state"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { AccountModuleBoundary } from "./account-sections-shared"

const CollateralPositionsPanel = lazy(async () => ({
  default: (await import("@/app/dashboard/borrow-tab/collateral-positions-panel")).CollateralPositionsPanel,
}))
const DebtPositionsPanel = lazy(async () => ({
  default: (await import("@/app/dashboard/borrow-tab/debt-positions-panel")).DebtPositionsPanel,
}))
const TradingFeesPanel = lazy(async () => ({
  default: (await import("@/app/dashboard/borrow-tab/trading-fees-panel")).TradingFeesPanel,
}))

/**
 * The borrow account overview + positions that used to live on the dashboard.
 * Self-contained: reads the live borrow session directly, no props.
 */
export function BorrowAccountSection({ returnHref = "/dashboard" }: { returnHref?: string }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const hasMounted = useHasMounted()
  const { walletId } = useAvanaIdentity()
  const borrowSession = useBorrowSessionContext()

  const dashboardBorrow = useDashboardBorrowLive(walletId, borrowSession)
  const sessionBorrowTab = useMemo(() => {
    if (!hasMounted || !walletId || !borrowSession.state.accounts[walletId]) return null
    return buildPortfolioBorrowData(borrowSession.state, walletId)
  }, [borrowSession.state, hasMounted, walletId])
  const liveBorrowTab = hasMounted ? (sessionBorrowTab ?? dashboardBorrow) : null

  const borrowSnapshot = useMemo<BorrowSnapshot>(() => {
    const sessionSnapshot =
      hasMounted && walletId && borrowSession.state.accounts[walletId]
        ? selectBorrowSnapshot(borrowSession.state, walletId)
        : null
    if (sessionSnapshot) return sessionSnapshot

    const fallback = hasMounted ? liveBorrowTab?.creditLines : null
    return {
      approvedUsd: fallback?.approvedUsd ?? 0,
      liquidationThresholdUsd: fallback?.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: fallback?.totalBorrowedUsd ?? 0,
      totalCollateralUsd: fallback?.totalCollateralUsd ?? 0,
      averageHealthFactor: fallback?.averageHealthFactor ?? null,
      currentLtvPct: fallback?.currentLtvPct ?? 0,
    }
  }, [borrowSession.state, hasMounted, liveBorrowTab, walletId])

  const collateralPositions = liveBorrowTab?.collateralPositions ?? []
  const debtPositions = liveBorrowTab?.debtPositions ?? []

  const borrowDashboardMetrics = useMemo<DashboardTabMetrics>(() => {
    if (hasMounted && walletId && borrowSession.state.accounts[walletId]) {
      return buildBorrowDashboardMetrics(borrowSession.state, walletId)
    }
    return buildBorrowDashboardMetricsFromSnapshot(borrowSnapshot, collateralPositions, debtPositions)
  }, [borrowSession.state, borrowSnapshot, collateralPositions, debtPositions, hasMounted, walletId])

  return (
    <section id="dashboard-borrow-account" className="scroll-mt-24">
      <div className="space-y-8">
        <div className="space-y-8">
          <DashboardCreditOverviewSection
            title={t("Borrow Balance")}
            approvedCreditUsd={borrowSnapshot.approvedUsd}
            totalBorrowedUsd={borrowDashboardMetrics.overview.totalBorrowedUsd}
            netApyPct={borrowDashboardMetrics.performance.netApyPct}
            totalCollateralUsd={borrowDashboardMetrics.performance.poolCollateralUsd}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <SuppliesHealthFactorCard
              averageHealthFactor={borrowSnapshot.averageHealthFactor}
              showBalance={showDollarAmounts}
            />
            <CurrentLtvCard
              borrowedUsd={borrowSnapshot.totalBorrowedUsd}
              collateralUsd={borrowSnapshot.totalCollateralUsd}
              showBalance={showDollarAmounts}
            />
          </div>
        </div>

        <AccountModuleBoundary>
          <CollateralPositionsPanel showBalance={showDollarAmounts} returnHref={returnHref} />
        </AccountModuleBoundary>
        <AccountModuleBoundary>
          <DebtPositionsPanel showBalance={showDollarAmounts} returnHref={returnHref} />
        </AccountModuleBoundary>
        <AccountModuleBoundary>
          <TradingFeesPanel showBalance={showDollarAmounts} returnHref={returnHref} />
        </AccountModuleBoundary>
      </div>
    </section>
  )
}
