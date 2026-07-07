"use client"

import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { HeroMarketCard } from "./borrow-hero-market-card"
import { BorrowHeroLiveMetrics } from "./borrow-hero-live-metrics"

type ExplorePool = BorrowPageData["explore"]["trendingCollateral"][number]

function buildHeroCards(pageData: BorrowPageData, compact: (usd: number) => string) {
  // Each card shows two markets, and no market repeats across the three cards, so the
  // Explore row reads as six distinct pools rather than the same top markets echoed back.
  const used = new Set<string>()
  const pick = (pools: ReadonlyArray<ExplorePool>, count: number) => {
    const chosen: ExplorePool[] = []
    for (const pool of pools) {
      if (used.has(pool.name)) continue
      used.add(pool.name)
      chosen.push(pool)
      if (chosen.length === count) break
    }
    return chosen
  }

  const toRows = (pools: ReadonlyArray<ExplorePool>, prefix: string) =>
    pools.map((pool) => ({
      id: `${prefix}-${pool.id}`,
      href: borrowMarketDetailPath(pool.id),
      pool,
      title: pool.name,
      subtitle: `${compact(pool.tvlUsd)} TVL`,
      value: `Avail. ${compact(pool.availableUsd)}`,
      delta: `${formatApy((pool.aprMin + pool.aprMax) / 2)} APY`,
      deltaClassName: "text-apy-positive",
    }))

  return [
    { id: "trending", rows: toRows(pick(pageData.explore.trendingCollateral, 2), "trending") },
    { id: "top", rows: toRows(pick(pageData.explore.topMarkets, 2), "top") },
    { id: "apy", rows: toRows(pick(pageData.explore.highApyPools, 2), "apy") },
  ]
}

export function BorrowPageHero({ pageData }: { pageData: BorrowPageData }) {
  const { compact } = useCurrency()
  const heroCards = buildHeroCards(pageData, compact)

  return (
    <section className="mb-4 px-1 md:px-2">
      <BorrowHeroLiveMetrics metrics={pageData.heroMetrics} />

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Explore</h2>
          </div>
        </div>

        <div className="overflow-x-auto pb-1 md:overflow-visible">
          <div className="flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-3 md:gap-4">
            {heroCards.map((card) => (
              <HeroMarketCard key={card.id} rows={card.rows} className="md:min-w-0 md:max-w-none md:w-full" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
