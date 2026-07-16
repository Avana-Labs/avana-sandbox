"use client"

import { lazy, useMemo, useState } from "react"
import { useAvanaIdentity, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { buildMultiplyDashboardMetrics, type DashboardTabMetrics } from "@/app/portfolio/dashboard-tab-metrics"
import { DashboardOverviewSection } from "@/app/portfolio/dashboard-metric-section"
import { SuppliesHealthFactorCard } from "@/app/dashboard/components/borrow-tab/supplies-table"
import { CurrentLtvCard } from "@/app/dashboard/components/borrow-tab/debts-table"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import type { PortfolioMultiplyCollateral, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { shouldUseOpenGateSession } from "@/app/lib/test-mode"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { SectionTabStrip, AccountModuleBoundary } from "./account-sections-shared"

const MultiplyCollateralTable = lazy(async () => ({
  default: (await import("@/app/portfolio/multiply-collateral-table")).MultiplyCollateralTable,
}))

const RETURN_HREF = "/portfolio"

type LoopingSubTab = "overview" | "positions"
const LOOPING_SUB_TABS: readonly { id: LoopingSubTab; label: string }[] = [
  { id: "overview", label: "Multiply Overview" },
  { id: "positions", label: "Multiply Positions" },
]

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

// Dev-only fixture so the table + action flow are exercisable before a real
// multiply position exists on the test wallet.
const DEV_MULTIPLY_FIXTURE: PortfolioMultiplyCollateral = {
  id: "dev-fixture-wsteth-eth",
  marketId: "wstETH-ETH",
  label: "wstETH / ETH Loop",
  collateralToken: "wstETH",
  borrowableToken: "ETH",
  multiplier: 4.2,
  protocol: "Aave v4",
  healthFactor: 1.85,
  collateralUsd: 42_000,
  borrowPowerUsd: 31_500,
  debtUsd: 31_800,
  ltvPct: 75.7,
  liquidationPriceUsd: null,
  netApyPct: 6.42,
  status: "open",
}

function withDevMultiplyFixtures(data: PortfolioMultiplyTabData): PortfolioMultiplyTabData {
  if (!shouldUseOpenGateSession()) return data
  if (data.lpCollaterals.length > 0) return data
  return { ...data, lpCollaterals: [DEV_MULTIPLY_FIXTURE] }
}

/**
 * The multiply account overview + positions that used to live on the dashboard.
 * Self-contained: reads the live multiply session directly, no props.
 */
export function MultiplyAccountSection() {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const hasMounted = useHasMounted()
  const { walletId } = useAvanaIdentity()
  const multiplySession = useMultiplySessionContext()
  const [loopingSubTab, setLoopingSubTab] = useState<LoopingSubTab>("overview")

  const portfolioMultiply = usePortfolioMultiplyLive(walletId, multiplySession)

  const multiplyTabData = useMemo(
    () => withDevMultiplyFixtures(hasMounted ? (portfolioMultiply ?? EMPTY_MULTIPLY_TAB) : EMPTY_MULTIPLY_TAB),
    [hasMounted, portfolioMultiply],
  )

  const multiplySnapshot = useMemo<BorrowSnapshot>(() => {
    const credit = hasMounted ? portfolioMultiply?.creditLines : null
    return {
      approvedUsd: credit?.approvedUsd ?? 0,
      liquidationThresholdUsd: credit?.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: credit?.totalBorrowedUsd ?? 0,
      totalCollateralUsd: credit?.totalCollateralUsd ?? 0,
      averageHealthFactor: credit?.averageHealthFactor ?? null,
      currentLtvPct: credit?.currentLtvPct ?? 0,
    }
  }, [hasMounted, portfolioMultiply])

  const multiplyDashboardMetrics = useMemo<DashboardTabMetrics>(
    () => buildMultiplyDashboardMetrics(multiplySession.state, walletId ?? "", multiplyTabData),
    [multiplySession.state, multiplyTabData, walletId],
  )

  if (multiplyTabData.lpCollaterals.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
        {t("No multiply positions yet. Open a loop to leverage your collateral.")}
      </div>
    )
  }

  return (
    <section>
      <div className="flex flex-col gap-3 border-b border-border/50 pb-px md:flex-row md:items-end md:justify-between md:border-b-0 md:pb-0">
        <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
          {t("Multiply Account")}
        </h2>
        <SectionTabStrip
          items={LOOPING_SUB_TABS}
          value={loopingSubTab}
          onChange={setLoopingSubTab}
          ariaLabel={t("Multiply sections")}
        />
      </div>
      <div className="mt-8">
        {loopingSubTab === "overview" ? (
          <div className="space-y-8">
            <DashboardOverviewSection
              hideHeading
              title={t("Multiply Overview")}
              metrics={multiplyDashboardMetrics.overview}
            />
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
        ) : (
          <AccountModuleBoundary>
            <MultiplyCollateralTable rows={multiplyTabData.lpCollaterals} returnHref={RETURN_HREF} />
          </AccountModuleBoundary>
        )}
      </div>
    </section>
  )
}
