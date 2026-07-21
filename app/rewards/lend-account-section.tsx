"use client"

import { useState } from "react"
import { useAvanaIdentity, useLendSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardLendLive } from "@/app/dashboard/use-dashboard-lend-live"
import { buildLendDashboardMetrics } from "@/app/dashboard/dashboard-tab-metrics"
import { DashboardLendPerformanceSection } from "@/app/dashboard/dashboard-metric-section"
import { DashboardInvestments } from "@/app/dashboard/dashboard-investments"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const EMPTY_LEND_TAB: PortfolioLendTabData = { investments: [], positions: [], strategyBuckets: [], history: [] }

/**
 * The lend account overview (performance metrics + supplied-asset table) that used
 * to live on the dashboard. Self-contained: it reads the live lend session directly
 * so it can be dropped onto the rewards Lend tab with no prop wiring.
 */
export function LendAccountSection({ returnHref = "/dashboard" }: { returnHref?: string }) {
  const { t } = useTranslation()
  const { walletId } = useAvanaIdentity()
  const lendSession = useLendSessionContext()
  const dashboardLend = useDashboardLendLive(walletId, lendSession)
  const lendTabData = dashboardLend ?? EMPTY_LEND_TAB
  const metrics = buildLendDashboardMetrics(lendTabData)
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaimRewards = async () => {
    if (isClaiming) return
    setIsClaiming(true)
    try {
      await lendSession.claimRewards()
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <section id="dashboard-lend-account" className="scroll-mt-24 space-y-6">
      <DashboardLendPerformanceSection title={t("Lend Balance")} metrics={metrics} />
      <DashboardInvestments
        investments={lendTabData.investments}
        rewardsSummary={lendTabData.rewardsSummary}
        onClaimRewards={handleClaimRewards}
        isClaimingRewards={isClaiming}
        showHeading
        title={t("Lend Assets")}
        countLabel={t("{count} assets")
          .replace("{count}", String(lendTabData.investments.length))}
        returnHref={returnHref}
      />
    </section>
  )
}
