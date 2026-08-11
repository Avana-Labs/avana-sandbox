"use client"

import { lazy, useMemo } from "react"
import { useAvanaIdentity, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardMultiplyLive } from "@/app/dashboard/use-dashboard-multiply-live"
import { buildMultiplyDashboardMetrics, type DashboardTabMetrics } from "@/app/dashboard/dashboard-tab-metrics"
import { DashboardOverviewSection } from "@/app/dashboard/dashboard-metric-section"
import { SuppliesHealthFactorCard } from "@/app/dashboard/borrow-tab/supplies-table"
import { CurrentLtvCard } from "@/app/dashboard/borrow-tab/debts-table"
import type { BorrowSnapshot } from "@/app/dashboard/borrow-hero-state"
import type { PortfolioMultiplyCollateral, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { AccountModuleBoundary } from "./account-sections-shared"

const MultiplyCollateralTable = lazy(async () => ({
  default: (await import("@/app/dashboard/multiply-collateral-table")).MultiplyCollateralTable,
}))

const EMPTY_MULTIPLY_TAB: PortfolioMultiplyTabData = {
  creditLines: {
    approvedUsd: 0,
    liquidationThresholdUsd: 0,
    averageHealthFactor: null,
    currentLtvPct: 0,
    totalBorrowedUsd: 0,
    totalCollateralUsd: 0,
  },
  lpCollaterals: [],
  positions: [],
  openOrders: [],
  twapOrders: [],
  history: [],
}

const UI_PREVIEW_MULTIPLY_COLLATERALS: PortfolioMultiplyCollateral[] = [
  {
    id: "preview-multiply-weth-usdc",
    marketId: "eth-usdc",
    label: "WETH / USDC",
    collateralToken: "WETH",
    borrowableToken: "USDC",
    multiplier: 2.8,
    protocol: "Avana Multiply",
    healthFactor: 2.42,
    collateralUsd: 36_400,
    borrowPowerUsd: 15_900,
    debtUsd: 23_400,
    ltvPct: 64.3,
    liquidationPriceUsd: 2_180,
    netApyPct: 7.62,
    status: "open",
  },
  {
    id: "preview-multiply-wbtc-usdt",
    marketId: "wbtc-usdt",
    label: "WBTC / USDT",
    collateralToken: "WBTC",
    borrowableToken: "USDT",
    multiplier: 2.35,
    protocol: "Avana Multiply",
    healthFactor: 2.08,
    collateralUsd: 28_750,
    borrowPowerUsd: 10_600,
    debtUsd: 16_520,
    ltvPct: 57.5,
    liquidationPriceUsd: 71_400,
    netApyPct: 5.14,
    status: "open",
  },
  {
    id: "preview-multiply-usdc-gho",
    marketId: "usdc-gho",
    label: "USDC / GHO",
    collateralToken: "USDC",
    borrowableToken: "GHO",
    multiplier: 1.85,
    protocol: "Avana Multiply",
    healthFactor: 3.16,
    collateralUsd: 18_900,
    borrowPowerUsd: 12_200,
    debtUsd: 8_680,
    ltvPct: 45.9,
    liquidationPriceUsd: null,
    netApyPct: 4.38,
    status: "open",
  },
]

/**
 * The multiply account overview + positions that used to live on the dashboard.
 * Self-contained: reads the live multiply session directly, no props.
 */
export function MultiplyAccountSection({ returnHref = "/dashboard" }: { returnHref?: string }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const hasMounted = useHasMounted()
  const { walletId } = useAvanaIdentity()
  const multiplySession = useMultiplySessionContext()

  const portfolioMultiply = useDashboardMultiplyLive(walletId, multiplySession)

  const multiplyTabData = useMemo(
    () => (hasMounted ? (portfolioMultiply ?? EMPTY_MULTIPLY_TAB) : EMPTY_MULTIPLY_TAB),
    [hasMounted, portfolioMultiply],
  )
  const displayMultiplyTabData = useMemo<PortfolioMultiplyTabData>(() => {
    if (multiplyTabData.lpCollaterals.length > 0) return multiplyTabData

    const totalCollateralUsd = UI_PREVIEW_MULTIPLY_COLLATERALS.reduce((sum, row) => sum + row.collateralUsd, 0)
    const totalBorrowedUsd = UI_PREVIEW_MULTIPLY_COLLATERALS.reduce((sum, row) => sum + row.debtUsd, 0)
    const averageHealthFactor = Math.min(...UI_PREVIEW_MULTIPLY_COLLATERALS.map((row) => row.healthFactor))

    return {
      ...multiplyTabData,
      creditLines: {
        approvedUsd: totalCollateralUsd,
        liquidationThresholdUsd: totalCollateralUsd * 0.78,
        averageHealthFactor,
        currentLtvPct: totalCollateralUsd > 0 ? (totalBorrowedUsd / totalCollateralUsd) * 100 : 0,
        totalBorrowedUsd,
        totalCollateralUsd,
      },
      lpCollaterals: UI_PREVIEW_MULTIPLY_COLLATERALS,
    }
  }, [multiplyTabData])

  const multiplySnapshot = useMemo<BorrowSnapshot>(() => {
    const credit = displayMultiplyTabData.creditLines
    return {
      approvedUsd: credit?.approvedUsd ?? 0,
      liquidationThresholdUsd: credit?.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: credit?.totalBorrowedUsd ?? 0,
      totalCollateralUsd: credit?.totalCollateralUsd ?? 0,
      averageHealthFactor: credit?.averageHealthFactor ?? null,
      currentLtvPct: credit?.currentLtvPct ?? 0,
    }
  }, [displayMultiplyTabData.creditLines])

  const multiplyDashboardMetrics = useMemo<DashboardTabMetrics>(
    () => buildMultiplyDashboardMetrics(multiplySession.state, walletId ?? "", displayMultiplyTabData),
    [multiplySession.state, displayMultiplyTabData, walletId],
  )

  return (
    <section id="dashboard-multiply-account" className="scroll-mt-24">
      <div className="space-y-6">
        <div className="space-y-6">
          <DashboardOverviewSection title={t("Multiply Balance")} metrics={multiplyDashboardMetrics.overview} />
          <div className="space-y-4">
            <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
              {t("Multiply Health")}
            </h3>
            <div className="grid gap-4 xl:grid-cols-2">
              <SuppliesHealthFactorCard
                averageHealthFactor={multiplySnapshot.averageHealthFactor}
                showBalance={showDollarAmounts}
              />
              <CurrentLtvCard
                borrowedUsd={multiplySnapshot.totalBorrowedUsd}
                collateralUsd={multiplySnapshot.totalCollateralUsd}
                showBalance={showDollarAmounts}
              />
            </div>
          </div>
        </div>
        <AccountModuleBoundary>
          <MultiplyCollateralTable rows={displayMultiplyTabData.lpCollaterals} returnHref={returnHref} />
        </AccountModuleBoundary>
      </div>
    </section>
  )
}
