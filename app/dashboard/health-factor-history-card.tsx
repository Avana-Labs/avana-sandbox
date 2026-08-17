"use client"

import { Component, type ReactNode } from "react"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useHealthFactorHistory } from "@/app/dashboard/use-dashboard-history-feeds"

/**
 * Isolated boundary: Convex's useQuery throws on a server error (e.g. the
 * getRiskSeries function not yet on the deployment). We hide the card rather
 * than let it take down the surrounding account section.
 */
class RiskQueryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function HealthFactorHistoryInner({ walletId }: { walletId: string | undefined }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { feed, pointCount } = useHealthFactorHistory(walletId)

  // Nothing to plot until the wallet has real risk history (written on each
  // borrow/multiply action). Render nothing rather than an empty frame.
  if (pointCount < 2) return null

  return (
    <div className="rounded-radius-md border border-border bg-card px-4 py-4 dark:bg-white/[0.04]">
      <h4 className="mb-2 text-[13px] font-medium text-muted-foreground">{t("Health factor over time")}</h4>
      <MarketHeroChart
        feed={feed}
        defaultRange="1M"
        gradientId="healthFactorHistoryFill"
        height={180}
        showMeta={false}
        showRangeSelector
        hideValue={!showDollarAmounts}
        balanceVariant="quiet"
      />
    </div>
  )
}

/**
 * Wave-4 E-M2: a small "Health factor over time" chart for the borrow account
 * health section, sourced from riskSnapshots via getRiskSeries. Read-only,
 * error-silent, and self-hiding until there's data — so it never clutters a
 * fresh account or errors the page.
 */
export function HealthFactorHistoryCard({ walletId }: { walletId: string | undefined }) {
  return (
    <RiskQueryBoundary>
      <HealthFactorHistoryInner walletId={walletId} />
    </RiskQueryBoundary>
  )
}
