"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { AboutNewsSection, DetailFaqSection, EngagementTrendsCard, StickyDetailHeader } from "@/app/borrow/_detail/ui"
import { QuickStatsGrid, RiskSection } from "@/app/borrow/_detail/pool-sections"
import { mapMultiplyHistoryToDetailRows } from "@/app/lib/multiply-system/read-model"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { cn } from "@/lib/utils"
import {
  MarketHero,
  MarketHeroIdentity,
  RelatedMarketsRow,
  MarketSidebar,
  SupplyBorrowCard,
  TransactionHistoryCard,
} from "@/app/multiply/_detail"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"

type Props = { detail: MultiplyMarketDetail }

const PAGE_MAX_W = "max-w-[1152px]"

export function MarketDetailClient({ detail }: Props) {
  const heroRef = React.useRef<HTMLDivElement | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const session = useMultiplySessionContext()
  const marketId = detail.id.toLowerCase().replaceAll("_", "-")

  const transactions = React.useMemo(() => {
    const sessionRows = mapMultiplyHistoryToDetailRows(
      session.transactionHistory.filter((item) => item.marketId === marketId),
      detail.row.protocol,
      detail.row.asset,
    )
    return sessionRows.length > 0 ? sessionRows : detail.transactions
  }, [detail.row.asset, detail.row.protocol, detail.transactions, marketId, session.transactionHistory])

  return (
    <div className="bg-background">
      <StickyDetailHeader
        heroRef={heroRef}
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
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-8 items-center justify-center rounded-radius-sm bg-[hsl(var(--brand))] px-3 text-[12.5px] font-medium text-white shadow-elev-1 transition-colors hover:bg-[hsl(var(--brand))]/90 lg:hidden"
          >
            Open position
          </button>
        }
      />

      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
          <Link href="/multiply" className="transition-colors hover:text-foreground">
            Multiply
          </Link>
          <span aria-hidden className="text-border">
            ›
          </span>
          <span className="font-normal text-foreground">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
            <MarketHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div ref={heroRef} className="min-w-0 lg:col-start-1 lg:row-start-2">
            <MarketHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Multiply market analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">Market data</h2>
              <QuickStatsGrid detail={detail} />
              <SupplyBorrowCard detail={detail} />
              <EngagementTrendsCard
                engagement={detail.engagement}
                accentClassName={[detail.hero.visuals[0].textClass, detail.hero.visuals[1].textClass]}
              />
              <RiskSection detail={detail} />
              <AboutNewsSection
                className="lg:hidden"
                about={detail.about}
                newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
                newsImageLabel={detail.hero.name}
                mediaVariant="icon"
              />
              <DetailFaqSection
                title="Multiply FAQs"
                items={[
                  {
                    question: `What is ${detail.hero.name}?`,
                    answer: (
                      <p>
                        It is a multiply market that pairs {detail.row.protocol} collateral with {detail.row.asset} exposure.
                        The route is separate from borrow pools and is meant for leveraged positioning.
                      </p>
                    ),
                  },
                  {
                    question: "How does max APY work here?",
                    answer: (
                      <p>
                        Max APY reflects the combination of collateral carry and borrow cost at the current leverage ceiling.
                        It is the ceiling shown in the table, not a fixed return.
                      </p>
                    ),
                  },
                  {
                    question: "Why is leverage capped?",
                    answer: (
                      <p>
                        The cap keeps liquidation risk within the available liquidity and collateral threshold for the pair.
                        Higher leverage increases both capital efficiency and unwind speed.
                      </p>
                    ),
                  },
                  {
                    question: `Why use ${detail.row.protocol} as collateral?`,
                    answer: (
                      <p>
                        The market is tuned for this collateral / borrowable combination because its liquidity profile and
                        factor settings leave enough room to multiply exposure without making the position unstable.
                      </p>
                    ),
                  },
                ]}
              />
              <TransactionHistoryCard
                transactions={transactions}
                collateralSymbol={detail.row.protocol}
                borrowableSymbol={detail.row.asset}
              />
              <RelatedMarketsRow detail={detail} />
            </section>
          </div>

          <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
            <MarketSidebar detail={detail} />
          </aside>
        </div>
      </main>

      <MobileMultiplyDock open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)}>
        <MarketSidebar detail={detail} />
      </MobileMultiplyDock>
    </div>
  )
}

function TokenAvatar({ visual }: { visual: MultiplyMarketDetail["hero"]["visuals"][number] }) {
  return (
    <span
      className={cn("inline-flex size-6 items-center justify-center rounded-full border-2 border-background ring-1 ring-border", visual.bgClass, visual.textClass)}
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

function MobileMultiplyDock({
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
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onToggle}
      />
      <div
        role="dialog"
        aria-label="Multiply"
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
        Open position
      </button>
    </div>
  )
}
