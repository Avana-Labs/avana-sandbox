"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { StickyDetailHeader, RiskLevelPill } from "@/app/borrow/_detail/ui"
import {
  PoolHero,
  PoolHeroIdentity,
  QuickStatsGrid,
  KeyMetricsCard,
  CashflowCard,
  RiskSection,
  AboutCard,
  RelatedPoolsRow,
} from "@/app/borrow/_detail/pool-sections"
import { PoolBorrowSidebar } from "@/app/borrow/_detail/sidebars"
import { cn } from "@/lib/utils"

function TokenAvatar({ visual, className }: { visual: any; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full border-2 border-background ring-1 ring-border/60",
        visual.bgClass,
        visual.textClass,
        className,
      )}
    >
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-full rounded-full" />
      ) : (
        <span className="text-[10px] font-semibold">{visual.shortLabel}</span>
      )}
    </span>
  )
}

type Props = { detail: PoolDetail }

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
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenAvatar visual={detail.hero.visuals[0]} />
              <TokenAvatar visual={detail.hero.visuals[1]} />
            </div>
            <span className="font-semibold text-foreground">{detail.hero.name}</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {detail.hero.feeTier || detail.hero.venue}
            </span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {detail.hero.chain}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-sm font-medium sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">TVL</span>
                <span>{detail.quickStats[0].value}</span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">APR</span>
                <span className="text-emerald-500">{detail.quickStats[3]?.value || "--"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/90 lg:hidden"
            >
              Borrow
            </button>
          </div>
        }
      />

      <main className="container mx-auto px-4 pb-24 pt-6 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link href="/borrow" className="transition-colors hover:text-foreground">
              Borrow
            </Link>
            <span aria-hidden className="text-border">/</span>
            <span className="font-medium text-foreground">{detail.hero.name}</span>
          </nav>

          <PoolHeroIdentity detail={detail} className="mb-6" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div ref={heroRef} className="flex min-w-0 flex-col space-y-10">
              <PoolHero detail={detail} hideIdentity />
              <QuickStatsGrid detail={detail} />
              <KeyMetricsCard detail={detail} />
              <CashflowCard detail={detail} />
              <RiskSection detail={detail} />
              <AboutCard about={detail.about} />
              <RelatedPoolsRow detail={detail} />
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-20">
                <PoolBorrowSidebar detail={detail} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileSupplyDock open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)}>
        <PoolBorrowSidebar detail={detail} />
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
          "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border/40 bg-card p-4 shadow-2xl transition-transform",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="mb-3 flex w-full items-center justify-center gap-2 text-xs font-medium text-muted-foreground"
        >
          Hide <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="fixed inset-x-4 bottom-4 z-30 h-12 rounded-full bg-foreground text-sm font-medium text-background shadow-lg"
      >
        Borrow against this pool
      </button>
    </div>
  )
}
