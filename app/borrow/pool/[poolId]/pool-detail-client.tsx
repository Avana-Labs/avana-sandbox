"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection, DetailFaqSection, StickyDetailHeader, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import {
  PoolHero,
  PoolHeroIdentity,
  QuickStatsGrid,
  KeyMetricsCard,
  CashflowCard,
  RiskSection,
  CollateralHistoryCard,
  RelatedPoolsRow,
} from "@/app/borrow/_detail/pool-sections"
import { PoolBorrowActions, PoolBorrowSidebar } from "@/app/borrow/_detail/sidebars"
import { cn } from "@/lib/utils"

function TokenAvatar({
  visual,
  className,
}: {
  visual: PoolDetail["hero"]["visuals"][number]
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full border-2 border-background ring-1 ring-border",
        visual.bgClass,
        visual.textClass,
        className,
      )}
    >
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-full rounded-full" />
      ) : (
        <span className="text-[10px] font-medium">{visual.shortLabel}</span>
      )}
    </span>
  )
}

type Props = { detail: PoolDetail }

const PAGE_MAX_W = "max-w-[1152px]"

/**
 * Two-column detail page for a single LP collateral pool.
 *
 * Desktop: sections fill the left column; `PoolBorrowSidebar` (homepage
 * CompactBorrowCard reused) sticks on the right. Mobile: sections stack and
 * the sidebar collapses into a bottom sheet triggered by a fixed button.
 */
export function PoolDetailClient({ detail }: Props) {
  const heroRef = React.useRef<HTMLDivElement | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="bg-background">
      <StickyDetailHeader
        heroRef={heroRef}
        sparkline={{ series: detail.heroMetric.series[detail.heroMetric.metricId]["1M"] }}
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <TokenAvatar visual={detail.hero.visuals[0]} />
              <TokenAvatar visual={detail.hero.visuals[1]} />
            </div>
            <span className="text-[13px] font-medium text-foreground">{detail.hero.name}</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-1.5">
            <span className="rounded-xs border border-border bg-surface-inset px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              {detail.hero.feeTier || detail.hero.venue}
            </span>
            <span className="rounded-xs border border-border bg-surface-inset px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              {detail.hero.chain}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[12px] font-medium sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Total Supplied</span>
                <span className="font-data">{detail.quickStats[0].value}</span>
              </div>
              <div className="h-5 w-px bg-border" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Supply APY</span>
                <span className="font-data text-emerald-600 dark:text-emerald-400">{detail.quickStats[3]?.value || "--"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-8 items-center justify-center rounded-radius-sm bg-[hsl(var(--brand))] px-3 text-[12.5px] font-medium text-white shadow-elev-1 transition-colors hover:bg-[hsl(var(--brand))]/90 lg:hidden"
            >
              Borrow
            </button>
          </div>
        }
      />

      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
          <Link href="/borrow" className="transition-colors hover:text-foreground">
            Borrow
          </Link>
          <span aria-hidden className="text-border">›</span>
          <span className="font-normal text-foreground">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
            <PoolHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div ref={heroRef} className="min-w-0 lg:col-start-1 lg:row-start-2">
            <PoolHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Pool analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
              <QuickStatsGrid detail={detail} />
              <KeyMetricsCard detail={detail} />
              <div className="space-y-6">
                <CashflowCard detail={detail} />
                <EngagementTrendsCard
                  engagement={detail.engagement}
                  accentClassName={[detail.hero.visuals[0].textClass, detail.hero.visuals[1].textClass]}
                />
              </div>
              <RiskSection detail={detail} />
              <CollateralHistoryCard
                transactions={detail.transactions}
                tokenLabels={[detail.hero.visuals[0].symbol, detail.hero.visuals[1].symbol]}
              />
              <AboutNewsSection
                className="lg:hidden"
                about={detail.about}
                newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
                newsImageLabel={detail.hero.name}
                mediaVariant="icon"
              />
              <DetailFaqSection
                title="General FAQs"
                items={[
                  {
                    question: `What is ${detail.hero.name}?`,
                    answer: (
                      <p>
                        {detail.hero.name} is a liquidity pool. LPs deposit both sides of the pair so traders can swap
                        between them without a traditional order book, and the pool earns fees when it is used.
                      </p>
                    ),
                  },
                  {
                    question: "How do liquidity providers earn?",
                    answer: (
                      <p>
                        LPs earn a share of the swap fees generated by the pool. The higher the trading activity, the more
                        fee flow the position can capture, though returns still depend on market movement and range usage.
                      </p>
                    ),
                  },
                  {
                    question: "What is impermanent loss?",
                    answer: (
                      <p>
                        Impermanent loss is the gap between holding the two tokens outright and providing them in a pool while
                        the price moves. It is usually smaller in calmer pairs and larger when one side moves sharply.
                      </p>
                    ),
                  },
                  {
                    question: `Why do pools like ${detail.hero.name} matter?`,
                    answer: (
                      <p>
                        Pairs like ETH/USDT help route trading between a volatile asset and a dollar-denominated quote asset.
                        They tend to be useful when traders want price exposure, inventory balancing, or deep swap liquidity.
                      </p>
                    ),
                  },
                  {
                    question: "What happens if the price moves outside the active range?",
                    answer: (
                      <p>
                        In concentrated-liquidity pools, the position can stop earning fees until price comes back into range.
                        That tradeoff is the main reason tighter ranges can earn more, but also require more active management.
                      </p>
                    ),
                  },
                  {
                    question: "What should I watch before adding liquidity?",
                    answer: (
                      <p>
                        Check the fee tier, current depth, volatility, and how often the pool rebalances around the current
                        price. For pairs like ETH/USDT, rapid ETH price moves can increase divergence risk and reduce the time
                        a narrow range stays active.
                      </p>
                    ),
                  },
                ]}
              />
              <RelatedPoolsRow detail={detail} />
            </section>
          </div>

          <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
            <PoolBorrowSidebar detail={detail} />
          </aside>
        </div>
      </main>

      <MobileSupplyDock open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)}>
        <PoolBorrowActions detail={detail} />
      </MobileSupplyDock>
    </div>
  )
}

function MobileSupplyDock({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="lg:hidden">
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onToggle}
      />
      <div
        role="dialog"
        aria-label="Borrow"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-radius-md border-t border-border bg-surface-raised p-4 shadow-elev-3 transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="mb-3 flex w-full items-center justify-center gap-1.5 text-[11.5px] font-medium text-muted-foreground"
        >
          Hide <ChevronDown className="h-3 w-3" />
        </button>
        {children}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="fixed inset-x-4 bottom-4 z-30 h-10 rounded-radius-sm bg-[hsl(var(--brand))] text-[13px] font-medium text-white shadow-elev-3 hover:bg-[hsl(var(--brand))]/90"
      >
        Borrow against this pool
      </button>
    </div>
  )
}
