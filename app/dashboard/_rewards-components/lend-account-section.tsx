"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { detailSectionStackClass } from "@/app/components/detail-page-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { useAvanaIdentity, useLendSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardLendLive } from "@/app/dashboard/use-dashboard-lend-live"
import { buildLendDashboardMetrics } from "@/app/dashboard/dashboard-tab-metrics"
import { DashboardLendPerformanceSection } from "@/app/dashboard/dashboard-metric-section"
import { DashboardInvestments } from "@/app/dashboard/dashboard-investments"
import type {
  PortfolioLendTabData,
  PortfolioStrategyBucket,
  PortfolioSupplyPosition,
} from "@/app/lib/data/providers/portfolio"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { Button } from "@/components/ui/button"

const EMPTY_LEND_TAB: PortfolioLendTabData = { investments: [], positions: [], strategyBuckets: [], history: [] }

function symbolFromPoolName(name: string) {
  return name.replace(/^Aave\s+/i, "").trim()
}

function marketIdFromSymbol(symbol: string) {
  return symbol.toLowerCase()
}

function buildLendOpportunities(buckets: PortfolioStrategyBucket[], investments: PortfolioSupplyPosition[]) {
  const suppliedSymbols = new Set(investments.map((position) => position.symbol.toUpperCase()))
  return buckets
    .flatMap((bucket) =>
      bucket.pools.map((pool) => {
        const symbol = symbolFromPoolName(pool.name)
        return {
          ...pool,
          symbol,
          marketId: marketIdFromSymbol(symbol),
          bucketTitle: bucket.title,
          bucketDescription: bucket.description,
        }
      }),
    )
    .filter((pool) => !suppliedSymbols.has(pool.symbol.toUpperCase()))
    .sort((a, b) => b.apyPct - a.apyPct)
    .slice(0, 5)
}

function LendOpportunitySection({
  buckets,
  investments,
  returnHref,
}: {
  buckets: PortfolioStrategyBucket[]
  investments: PortfolioSupplyPosition[]
  returnHref: string
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const opportunities = buildLendOpportunities(buckets, investments)

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
          {t("Lend Opportunity")}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("{count} assets").replace("{count}", String(opportunities.length))}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No curated opportunities right now. Browse markets on the lend page to supply assets.")}
        </div>
      ) : (
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className="bg-table-header px-5 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Asset")}
                </th>
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("APY")}
                </th>
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("TVL")}
                </th>
                <SilentActionHeader className="!rounded-none pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {opportunities.map((pool) => {
                const detailHref = `/lend/markets/${pool.marketId}`
                return (
                  <tr
                    key={`${pool.bucketTitle}-${pool.symbol}`}
                    className="group cursor-pointer transition-colors"
                    onClick={() => router.push(detailHref)}
                  >
                    <td className={`py-3.5 pl-5 ${TABLE_ROW_HOVER_LEFT}`}>
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={pool.symbol} size="table" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                            {pool.name}
                          </span>
                          <span className="mt-0.5 text-[13px] text-muted-foreground">{pool.bucketDescription}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3.5 text-right ${TABLE_ROW_HOVER_BG}`}>
                      <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                        {pool.apyPct.toFixed(2)}%
                      </div>
                      <div className="text-[13px] text-muted-foreground">{pool.bucketTitle}</div>
                    </td>
                    <td
                      className={`py-3.5 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
                    >
                      {formatUsdExact(pool.tvlUsd)}
                    </td>
                    <td className={`py-3.5 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
                      <HoverActionGroup className="justify-end">
                        <Button
                          type="button"
                          size="table"
                          variant="table-primary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(
                              actionPagePath("lend", "deposit", {
                                market: pool.marketId,
                                return: returnHref,
                              }),
                            )
                          }}
                        >
                          <ActionIcon label="Deposit" />
                          {t("Deposit")}
                        </Button>
                      </HoverActionGroup>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DesktopTableSurface>
      )}
    </section>
  )
}

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
    <section id="dashboard-lend-account" className={`scroll-mt-24 ${detailSectionStackClass}`}>
      <DashboardLendPerformanceSection title={t("Lend Balance")} metrics={metrics} />
      <DashboardInvestments
        investments={lendTabData.investments}
        rewardsSummary={lendTabData.rewardsSummary}
        onClaimRewards={handleClaimRewards}
        isClaimingRewards={isClaiming}
        showHeading
        title={t("Lend Assets")}
        countLabel={t("{count} assets").replace("{count}", String(lendTabData.investments.length))}
        returnHref={returnHref}
      />
      <LendOpportunitySection
        buckets={lendTabData.strategyBuckets}
        investments={lendTabData.investments}
        returnHref={returnHref}
      />
    </section>
  )
}
