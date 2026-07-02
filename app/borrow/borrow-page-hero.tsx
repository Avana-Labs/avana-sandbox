"use client"

import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { HeroMarketCard } from "./borrow-hero-market-card"
import { BorrowHeroLiveMetrics } from "./borrow-hero-live-metrics"

function buildHeroCards(pageData: BorrowPageData, compact: (usd: number) => string) {
  return [
    {
      title: "Trending Collateral",
      rows: pageData.explore.trendingCollateral.map((pool) => ({
        id: `trending-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${compact(pool.tvlUsd)} TVL`,
        value: compact(pool.availableUsd),
        delta: `${formatApy((pool.aprMin + pool.aprMax) / 2)} APY`,
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
        subtitle: `${compact(pool.tvlUsd)} TVL`,
        value: compact(pool.tvlUsd),
        delta: `${formatApy((pool.aprMin + pool.aprMax) / 2)} APY`,
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
        subtitle: `${compact(pool.tvlUsd)} TVL`,
        value: compact(pool.tvlUsd),
        delta: `${formatApy((pool.aprMin + pool.aprMax) / 2)} APY`,
        deltaClassName: "text-apy-positive",
      })),
    },
  ]
}

export function BorrowPageHero({ pageData }: { pageData: BorrowPageData }) {
  const { compact } = useCurrency()
  const heroCards = buildHeroCards(pageData, compact)

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
