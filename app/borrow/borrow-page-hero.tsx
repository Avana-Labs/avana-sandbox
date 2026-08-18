"use client"

import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { HowItWorks } from "@/app/components/how-it-works"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { formatBorrowPairLabel, formatLtvPct } from "@/app/lib/borrow-sim"
import { formatApy } from "@/app/lib/format"
import { HeroMarketCard } from "./borrow-hero-market-card"
import { BorrowHeroLiveMetrics } from "./borrow-hero-live-metrics"

type ExplorePool = BorrowPageData["poolCatalog"][number]

const averageApr = (pool: ExplorePool) => (pool.aprMin + pool.aprMax) / 2

function buildHeroCards(pageData: BorrowPageData, compact: (usd: number) => string) {
  // Draw each card's two markets from the FULL pool catalog (re-sorted per ranking)
  // rather than the pre-sliced 3-item explore lists. Extra cards are filled from
  // leftover pools so the desktop carousel has enough unique markets to scroll.
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
      title: formatBorrowPairLabel(pool),
      // Lead the subtitle with the DEX/tier (venue) so two pools that share a pair
      // label (e.g. WBTC/USDC on Uniswap v2 vs v3 Blue-Chip) are distinguishable —
      // the same context the global search palette shows.
      subtitle: `${pool.venue} · ${compact(pool.tvlUsd)} TVL`,
      // LTV is the headline (more important than availability); the line below is the
      // pool's own trading-fee APR — label it "Fees", not "APY" (it isn't our yield).
      value: `${formatLtvPct(pool.ltv)} LTV`,
      delta: `${formatApy(averageApr(pool))} Fees`,
      deltaClassName: "text-apy-positive",
    }))

  const cards = [
    { id: "trending", rows: toRows(pick(byAvailable, 2), "trending") },
    { id: "top", rows: toRows(pick(byTvl, 2), "top") },
    { id: "apy", rows: toRows(pick(byApr, 2), "apy") },
  ]

  let extra = 0
  while (cards.length < 8) {
    const next = pick(byTvl, 2)
    if (next.length < 2) break
    cards.push({ id: `more-${extra}`, rows: toRows(next, `more-${extra}`) })
    extra += 1
  }

  return cards
}

export function BorrowPageHero({ pageData }: { pageData: BorrowPageData }) {
  const { compact } = useCurrency()
  const heroCards = buildHeroCards(pageData, compact)
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()

  return (
    <section className="mb-4">
      <BorrowHeroLiveMetrics metrics={pageData.heroMetrics} />

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Explore</h2>
          <div className="flex items-center gap-2.5">
            <HowItWorks topic="borrow" className="hidden md:inline-flex" />
            <CarouselArrowButtons
              canPrev={canPrev}
              canNext={canNext}
              onPrev={() => scrollByCard(-1)}
              onNext={() => scrollByCard(1)}
              prevLabel="Previous explore"
              nextLabel="Next explore"
            />
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max gap-3">
            {heroCards.map((card) => (
              <HeroMarketCard key={card.id} rows={card.rows} className="snap-start" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
