"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection, StickyDetailHeader, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
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
import { RiskSection, QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { AssetTokenActions, AssetTokenSidebar } from "@/app/borrow/_detail/sidebars"
import { cn } from "@/lib/utils"

function TokenAvatar({ visual, className }: { visual: AssetDetail["hero"]["visual"]; className?: string }) {
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

type Props = { detail: AssetDetail }

/** Desktop content max width — 10% narrower than the original 1280px layout. */
const PAGE_MAX_W = "max-w-[1152px]"

export function AssetDetailClient({ detail }: Props) {
  const heroRef = React.useRef<HTMLDivElement | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-background">
      <StickyDetailHeader
        heroRef={heroRef}
        sparkline={{ series: detail.heroMetric.series[detail.heroMetric.metricId]["1M"] }}
        title={
          <div className="flex items-center gap-2.5">
            <TokenAvatar visual={detail.hero.visual} />
            <span className="text-[13px] font-medium text-foreground">{detail.hero.symbol}</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-2">
            <span className="rounded-xs border border-border bg-surface-inset px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              {detail.hero.name}
            </span>
          </div>
        }
        actions={
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 text-[12px] font-medium sm:flex">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Borrow APY</span>
                  <span className="font-data text-emerald-600 dark:text-emerald-400">
                    {detail.quickStats.find((stat) => stat.id === "borrowApy")?.value || "--"}
                  </span>
                </div>
              </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-8 items-center justify-center rounded-radius-sm bg-[hsl(var(--brand))] px-3 text-[12.5px] font-medium text-white shadow-elev-1 transition-colors hover:bg-[hsl(var(--brand))]/90 lg:hidden"
            >
              Deposit
            </button>
          </div>
        }
      />

      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13px] text-[#9A9A9A]">
          <Link href="/borrow" className="transition-colors hover:text-foreground">
            Borrow
          </Link>
          <span aria-hidden className="text-[#D0D0D0]">›</span>
          <span className="font-normal text-[#1A1A1A]">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <AssetHeroIdentity detail={detail} />
          </div>

          <div ref={heroRef} className="min-w-0 lg:col-start-1 lg:row-start-2">
            <AssetHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Market analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-foreground">Market data</h2>
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
              <TransactionHistoryCard transactions={detail.transactions} />
              <AboutNewsSection
                className="lg:hidden"
                about={detail.about}
                newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
                newsImageLabel={detail.hero.symbol}
              />
              <RelatedAssetsRow detail={detail} />
            </section>
          </div>

          <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
            <div className="sticky top-20">
              <AssetTokenSidebar detail={detail} />
            </div>
          </aside>
        </div>
      </main>

      <MobileDepositDock
        open={mobileOpen}
        onToggle={() => setMobileOpen((v) => !v)}
        label={`Deposit ${detail.hero.symbol}`}
      >
        <AssetTokenActions detail={detail} />
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
        {label}
      </button>
    </div>
  )
}
