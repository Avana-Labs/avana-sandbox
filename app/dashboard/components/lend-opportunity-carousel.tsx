"use client"

import { TokenIcon } from "@/app/components/token-icon"
import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type Opportunity = {
  marketId: string
  symbol: string
  name: string
  apyPct: number
  change24hPct: number
  hot: boolean
}

// Stable pseudo 24h drift derived from the market id so cards don't reshuffle
// between renders. Sandbox/demo data — the catalog carries no real 24h history.
function stableChange(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000
  }
  return Math.round(((hash / 1000) * 0.5 - 0.22) * 100) / 100
}

function buildOpportunities(): Opportunity[] {
  return [...LEND_MARKET_CATALOG]
    .sort((a, b) => b.totalApy - a.totalApy)
    .slice(0, 6)
    .map((market, index) => ({
      marketId: market.marketId,
      symbol: market.asset.symbol,
      name: market.asset.name,
      apyPct: market.totalApy * 100,
      change24hPct: stableChange(market.marketId),
      // Flag the highest-yield market as the standout opportunity.
      hot: index === 0,
    }))
}

export function LendOpportunityCarousel() {
  const { t } = useTranslation()
  const opportunities = buildOpportunities()

  return (
    <section aria-label={t("Lend Opportunity")} className="min-w-0">
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-foreground md:text-[17px]">
        {t("Lend Opportunity")}
      </h3>
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {opportunities.map((opportunity) => {
          const positive = opportunity.change24hPct >= 0
          return (
            <article
              key={opportunity.marketId}
              className="flex w-[190px] shrink-0 flex-col gap-3 rounded-radius-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <TokenIcon symbol={opportunity.symbol} size="xl" />
                {opportunity.hot ? (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    {t("HOT")}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-foreground">{opportunity.symbol}</div>
                <div className="truncate text-[13px] text-muted-foreground">{opportunity.name}</div>
              </div>
              <div
                className={cn(
                  "font-data text-[28px] font-semibold leading-none tracking-[-0.03em]",
                  positive ? "text-brand dark:text-[#7DDCFF]" : "text-rose-500",
                )}
              >
                {opportunity.apyPct.toFixed(2)}
                <span className="align-top text-[16px]">%</span>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums",
                  positive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                )}
              >
                {positive ? "+" : ""}
                {opportunity.change24hPct.toFixed(2)}% 24h
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
