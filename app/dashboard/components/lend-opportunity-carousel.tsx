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
    .slice(0, 4)
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

function HotBadge() {
  const { t } = useTranslation()
  return (
    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
      {t("HOT")}
    </span>
  )
}

function ChangePill({ change }: { change: number }) {
  const positive = change >= 0
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        positive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {positive ? "+" : ""}
      {change.toFixed(2)}% 24h
    </span>
  )
}

export function LendOpportunityCarousel() {
  const { t } = useTranslation()
  const opportunities = buildOpportunities()

  return (
    <section aria-label={t("Lend Opportunity")} className="min-w-0">
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-foreground md:text-[17px]">
        {t("Lend Opportunity")}
      </h3>

      {/* Mobile: horizontal carousel of compact cards */}
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:hidden">
        {opportunities.map((opportunity) => {
          const positive = opportunity.change24hPct >= 0
          return (
            <article
              key={opportunity.marketId}
              className="flex w-[150px] shrink-0 flex-col gap-2.5 rounded-radius-lg border border-border bg-card p-3.5"
            >
              <div className="flex items-start justify-between">
                <TokenIcon symbol={opportunity.symbol} size="md" />
                {opportunity.hot ? <HotBadge /> : null}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-foreground">{opportunity.symbol}</div>
                <div className="truncate text-[12px] text-muted-foreground">{opportunity.name}</div>
              </div>
              <div
                className={cn(
                  "font-data text-[22px] font-semibold leading-none tracking-[-0.03em]",
                  positive ? "text-brand dark:text-[#7DDCFF]" : "text-rose-500",
                )}
              >
                {opportunity.apyPct.toFixed(2)}
                <span className="align-top text-[13px]">%</span>
              </div>
              <ChangePill change={opportunity.change24hPct} />
            </article>
          )
        })}
      </div>

      {/* Desktop: vertical stack of full-width rows */}
      <div className="hidden lg:flex lg:flex-col lg:gap-2.5">
        {opportunities.map((opportunity) => {
          const positive = opportunity.change24hPct >= 0
          return (
            <article
              key={opportunity.marketId}
              className="flex items-center gap-3 rounded-radius-lg border border-border bg-transparent px-3.5 py-3 transition-colors hover:bg-surface-hover"
            >
              <TokenIcon symbol={opportunity.symbol} size="table" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-foreground">{opportunity.symbol}</span>
                    {opportunity.hot ? <HotBadge /> : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[15px] font-semibold tracking-[-0.03em]",
                      positive ? "text-brand dark:text-[#7DDCFF]" : "text-rose-500",
                    )}
                  >
                    {opportunity.apyPct.toFixed(2)}
                    <span className="text-[12px]">%</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] text-muted-foreground">{opportunity.name}</span>
                  <ChangePill change={opportunity.change24hPct} />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
