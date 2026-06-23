import { formatCompactUsd } from "@/app/lib/data/borrow-domain"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { cn } from "@/lib/utils"
import { HeroMarketCard } from "./borrow-hero-market-card"

function formatUsd(value: number) {
  return formatCompactUsd(value)
}

function buildHeroCards(pageData: BorrowPageData) {
  return [
    {
      title: "Trending Collateral",
      rows: pageData.explore.trendingCollateral.map((pool) => ({
        id: `trending-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.availableUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-apy-positive",
      })),
    },
    {
      title: "Top Markets",
      rows: pageData.explore.topMarkets.map((pool) => ({
        id: `top-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.tvlUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-apy-positive",
      })),
    },
    {
      title: "High APY Pools",
      rows: pageData.explore.highApyPools.map((pool) => ({
        id: `apy-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.tvlUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-apy-positive",
      })),
    },
  ]
}

/** Server-rendered borrow hero so LCP paints in the initial HTML. */
export function BorrowPageHero({ pageData }: { pageData: BorrowPageData }) {
  const heroCards = buildHeroCards(pageData)
  const totalTvlChange = pageData.heroMetrics.totalTvlChangePct
  const totalTvlChangeIsUp = totalTvlChange >= 0
  const totalTvlChangeLabel = `${totalTvlChangeIsUp ? "+" : ""}${totalTvlChange.toFixed(2)}%`

  return (
    <section className="mb-4 px-1 md:px-2">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
              <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
                {formatUsd(pageData.heroMetrics.totalTvlUsd)}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums",
                  totalTvlChangeIsUp ? "text-apy-positive" : "text-rose-700",
                )}
              >
                <span aria-hidden className="text-[10px] leading-none">
                  {totalTvlChangeIsUp ? "▲" : "▼"}
                </span>
                {totalTvlChangeLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-emerald md:justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
              Total Collateral
            </div>
            <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
              {formatUsd(pageData.heroMetrics.totalCollateralUsd)}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-violet md:justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
              Available Credit
            </div>
            <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
              {formatUsd(pageData.heroMetrics.availableCreditUsd)}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-amber md:justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
              Outstanding Loans
            </div>
            <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
              {formatUsd(pageData.heroMetrics.outstandingLoansUsd)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Explore</h2>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {heroCards.map((card) => (
              <HeroMarketCard key={card.title} title={card.title} rows={card.rows} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
