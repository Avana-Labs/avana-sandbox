"use client"

import { lazy, useMemo } from "react"
import { detailSectionStackClass } from "@/app/components/detail-page-primitives"
import { useAvanaIdentity, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardBorrowLive } from "@/app/dashboard/use-dashboard-borrow-live"
import { buildPortfolioBorrowData } from "@/app/lib/borrow-system/read-model"
import type { PortfolioBorrowTabData } from "@/app/lib/data/providers/portfolio"
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

const DashboardBorrowTab = lazy(async () => ({
  default: (await import("@/app/dashboard/dashboard-borrow-tab")).DashboardBorrowTab,
}))

function creditLinesToSnapshot(creditLines: PortfolioBorrowTabData["creditLines"]): BorrowSnapshot {
  return {
    approvedUsd: creditLines.approvedUsd,
    liquidationThresholdUsd: creditLines.liquidationThresholdUsd,
    totalBorrowedUsd: creditLines.totalBorrowedUsd,
    totalCollateralUsd: creditLines.totalCollateralUsd,
    averageHealthFactor: creditLines.averageHealthFactor,
    currentLtvPct: creditLines.currentLtvPct,
  }
}

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
    if (!liveBorrowTab) {
      return {
        approvedUsd: 0,
        liquidationThresholdUsd: 0,
        totalBorrowedUsd: 0,
        totalCollateralUsd: 0,
        averageHealthFactor: null,
        currentLtvPct: 0,
      }
    }
    return creditLinesToSnapshot(liveBorrowTab.creditLines)
  }, [liveBorrowTab])

  const collateralPositions = liveBorrowTab?.collateralPositions ?? []
  const debtPositions = liveBorrowTab?.debtPositions ?? []

  const borrowDashboardMetrics = useMemo<DashboardTabMetrics>(() => {
    if (hasMounted && walletId && borrowSession.state.accounts[walletId]) {
      return buildBorrowDashboardMetrics(borrowSession.state, walletId)
    }
    return buildBorrowDashboardMetricsFromSnapshot(borrowSnapshot, collateralPositions, debtPositions)
  }, [borrowSession.state, borrowSnapshot, collateralPositions, debtPositions, hasMounted, walletId])

  return (
    <section id="dashboard-borrow-account" className={`scroll-mt-24 ${detailSectionStackClass}`}>
      <DashboardCreditOverviewSection
        title={t("Borrow Balance")}
        netValueUsd={borrowSnapshot.totalCollateralUsd - borrowSnapshot.totalBorrowedUsd}
        totalBorrowedUsd={borrowSnapshot.totalBorrowedUsd}
        netApyPct={borrowDashboardMetrics.performance.netApyPct}
        totalCollateralUsd={borrowSnapshot.totalCollateralUsd}
      />

      <AccountModuleBoundary>
        <DashboardBorrowTab
          collateralPositions={collateralPositions}
          debtPositions={debtPositions}
          showSummary={false}
          returnHref={returnHref}
        />
      </AccountModuleBoundary>

      <div className="space-y-4">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{t("Borrow Health")}</h3>
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
    </section>
  )
}
