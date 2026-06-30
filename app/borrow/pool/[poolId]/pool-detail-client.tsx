"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection, DetailFaqSection, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import {
  PoolHero,
  PoolHeroIdentity,
  QuickStatsGrid,
  CashflowCard,
  RiskSection,
  CollateralHistoryCard,
  RelatedPoolsRow,
} from "@/app/borrow/_detail/pool-sections"
import { PoolBorrowActions, PoolBorrowSidebar } from "@/app/borrow/_detail/sidebars"
import { cn } from "@/lib/utils"

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
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="bg-background">
      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
          <Link href="/borrow" className="transition-colors hover:text-foreground">
            Borrow
          </Link>
          <span aria-hidden className="text-border">›</span>
          <span className="font-normal text-foreground">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
            <PoolHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <PoolHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Pool analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
              <QuickStatsGrid detail={detail} />
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
                items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
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
