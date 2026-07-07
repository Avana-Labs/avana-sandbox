"use client"

import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { formatApy } from "@/app/lib/format"
import { HeroMarketCard } from "./borrow-hero-market-card"
import { BorrowHeroLiveMetrics } from "./borrow-hero-live-metrics"

type ExplorePool = BorrowPageData["poolCatalog"][number]

const averageApr = (pool: ExplorePool) => (pool.aprMin + pool.aprMax) / 2

function buildHeroCards(pageData: BorrowPageData, compact: (usd: number) => string) {
  // Draw each card's two markets from the FULL pool catalog (re-sorted per ranking)
  // rather than the pre-sliced 3-item explore lists — those three lists overlap so
  // heavily that they only yield ~5 distinct names, leaving a card short. Sourcing
  // from the catalog guarantees six distinct markets across the three cards.
  const catalog = pageData.poolCatalog
  const byAvailable = [...catalog].sort((a, b) => b.availableUsd - a.availableUsd)
  const byTvl = [...catalog].sort((a, b) => b.tvlUsd - a.tvlUsd)
  const byApr = [...catalog].sort((a, b) => averageApr(b) - averageApr(a))

  const used = new Set<string>()
  const pick = (ranked: ReadonlyArray<ExplorePool>, count: number) => {
    const chosen: ExplorePool[] = []
    const take = (list: ReadonlyArray<ExplorePool>) => {
      for (const pool of list) {
        if (chosen.length === count) break
        if (used.has(pool.name)) continue
        used.add(pool.name)
        chosen.push(pool)
      }
    }
    take(ranked)
    // Fallback so every card fills to `count` even if this ranking's leaders were
    // already claimed by an earlier card.
    if (chosen.length < count) take(byTvl)
    return chosen
  }

  const toRows = (pools: ReadonlyArray<ExplorePool>, prefix: string) =>
    pools.map((pool) => ({
      id: `${prefix}-${pool.id}`,
      href: borrowMarketDetailPath(pool.id),
      pool,
      title: pool.name,
      subtitle: `${compact(pool.tvlUsd)} TVL`,
      // LTV is the headline (more important than availability); the line below is the
      // pool's own trading-fee APR — label it "Fees", not "APY" (it isn't our yield).
      value: `${pool.ltv}% LTV`,
      delta: `${formatApy(averageApr(pool))} Fees`,
      deltaClassName: "text-apy-positive",
    }))

  return [
    { id: "trending", rows: toRows(pick(byAvailable, 2), "trending") },
    { id: "top", rows: toRows(pick(byTvl, 2), "top") },
    { id: "apy", rows: toRows(pick(byApr, 2), "apy") },
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
