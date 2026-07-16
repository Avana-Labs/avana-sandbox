"use client"

import { useState } from "react"
import { useAvanaIdentity, useLendSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { usePortfolioLendLive } from "@/app/portfolio/use-portfolio-lend-live"
import { buildLendDashboardMetrics } from "@/app/portfolio/dashboard-tab-metrics"
import { DashboardLendPerformanceSection } from "@/app/portfolio/dashboard-metric-section"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const EMPTY_LEND_TAB: PortfolioLendTabData = { investments: [], positions: [], strategyBuckets: [], history: [] }

/**
 * The lend account overview (performance metrics + supplied-asset table) that used
 * to live on the dashboard. Self-contained: it reads the live lend session directly
 * so it can be dropped onto the rewards Lend tab with no prop wiring.
 */
export function LendAccountSection() {
  const { t } = useTranslation()
  const { walletId } = useAvanaIdentity()
  const lendSession = useLendSessionContext()
  const portfolioLend = usePortfolioLendLive(walletId, lendSession)
  const lendTabData = portfolioLend ?? EMPTY_LEND_TAB
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
    <section className="space-y-5">
      <DashboardLendPerformanceSection title={t("Lending Performance")} metrics={metrics} hideHeading />
      <PortfolioInvestments
        investments={lendTabData.investments}
        rewardsSummary={lendTabData.rewardsSummary}
        onClaimRewards={handleClaimRewards}
        isClaimingRewards={isClaiming}
        showHeading={false}
        returnHref="/rewards"
      />
      <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">{t("Lend Rewards")}</h2>
    </section>
  )
}
