"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { StickyDetailHeader, RiskLevelPill, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import {
  AssetHero,
  AssetHeroIdentity,
  SupplyBorrowCard,
  HistoricalUtilizationCard,
  CashflowTrendCard,
  AllocationBreakdownCard,
  AssetCashflowCard,
  TransactionHistoryCard,
  RelatedAssetsRow,
} from "@/app/borrow/_detail/asset-sections"
import { RiskSection, AboutCard, QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { AssetDepositSidebar } from "@/app/borrow/_detail/sidebars"
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

type Props = { detail: AssetDetail }

export function AssetDetailClient({ detail }: Props) {
  const heroRef = React.useRef<HTMLDivElement | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="bg-background">
      <StickyDetailHeader
        heroRef={heroRef}
        sparkline={{ series: detail.heroMetric.series[detail.heroMetric.metricId]["1M"] }}
        title={
          <div className="flex items-center gap-3">
            <TokenAvatar visual={detail.hero.visual} />
            <span className="font-semibold text-foreground">{detail.hero.symbol}</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {detail.hero.name}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-sm font-medium sm:flex">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SUPPLY APY</span>
                <span className="text-emerald-500">{detail.quickStats[1]?.value || "--"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 lg:hidden"
            >
              Deposit
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

          <AssetHeroIdentity detail={detail} className="mb-6" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div ref={heroRef} className="flex min-w-0 flex-col space-y-10">
              <AssetHero detail={detail} hideIdentity />
              <QuickStatsGrid detail={detail} />
              <SupplyBorrowCard detail={detail} />
              <HistoricalUtilizationCard detail={detail} />
              <CashflowTrendCard detail={detail} />
              <EngagementTrendsCard
                engagement={detail.engagement}
                accentClassName={detail.hero.visual.textClass}
              />
              <AllocationBreakdownCard detail={detail} />
              <AssetCashflowCard detail={detail} />
              <RiskSection detail={detail} />
              <TransactionHistoryCard detail={detail} />
              <AboutCard about={detail.about} />
              <RelatedAssetsRow detail={detail} />
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-20">
                <AssetDepositSidebar detail={detail} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileDepositDock
        open={mobileOpen}
        onToggle={() => setMobileOpen((v) => !v)}
        label={`Deposit ${detail.hero.symbol}`}
      >
        <AssetDepositSidebar detail={detail} />
      </MobileDepositDock>
    </div>
  )
}

function MobileDepositDock({
  open,
  onToggle,
  children,
  label,
}: {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  label: string
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
        aria-label="Deposit"
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
        {label}
      </button>
    </div>
  )
}
