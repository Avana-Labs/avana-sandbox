import { formatCompactUsd } from "@/app/lib/data/borrow-domain"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { HeroMarketCard } from "./borrow-hero-market-card"
import { BorrowHeroLiveMetrics } from "./borrow-hero-live-metrics"

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

  return (
    <section className="mb-4 px-1 md:px-2">
      <BorrowHeroLiveMetrics fallback={pageData.heroMetrics} />

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
