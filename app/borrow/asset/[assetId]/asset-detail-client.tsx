"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { StickyDetailHeader } from "@/app/borrow/_detail/ui"
import {
  AssetHero,
  AssetHeroIdentity,
} from "@/app/borrow/_detail/asset-sections"
import { QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { AssetTokenActions } from "@/app/borrow/_detail/sidebars"
import { cn } from "@/lib/utils"

const AboutNewsSection = dynamic(() => import("@/app/borrow/_detail/ui").then((mod) => mod.AboutNewsSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
const DetailFaqSection = dynamic(() => import("@/app/borrow/_detail/ui").then((mod) => mod.DetailFaqSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[380px]" />,
})
const EngagementTrendsCard = dynamic(() => import("@/app/borrow/_detail/ui").then((mod) => mod.EngagementTrendsCard), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[260px]" />,
})
const InterestRateModelCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.InterestRateModelCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const SupplyBorrowCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.SupplyBorrowCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[280px]" /> },
)
const HistoricalUtilizationCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.HistoricalUtilizationCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const CashflowTrendCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.CashflowTrendCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const AllocationBreakdownCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.AllocationBreakdownCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const AssetCashflowCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.AssetCashflowCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[240px]" /> },
)
const TransactionHistoryCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.TransactionHistoryCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[360px]" /> },
)
const RelatedAssetsRow = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.RelatedAssetsRow),
  { ssr: false, loading: () => <DeferredBlock className="h-[200px]" /> },
)
const RiskSection = dynamic(() => import("@/app/borrow/_detail/pool-sections").then((mod) => mod.RiskSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
const AssetTokenSidebar = dynamic(() => import("@/app/borrow/_detail/sidebars").then((mod) => mod.AssetTokenSidebar), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[760px]" />,
})

function DeferredBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-radius-md border border-border bg-surface-raised/60", className)} />
}

function TokenAvatar({ visual, className }: { visual: AssetDetail["hero"]["visual"]; className?: string }) {
  return (
    <span className={cn("inline-flex size-10 items-center justify-center", visual.textClass, className)}>
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-full object-contain" />
      ) : (
        <span className="text-[11px] font-medium">{visual.shortLabel}</span>
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
    <div className="min-h-screen bg-background text-foreground">
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
              className="inline-flex h-9 items-center justify-center rounded-radius-sm bg-[#007a99] px-3 text-[12.5px] font-medium text-white shadow-elev-1 transition-colors hover:bg-[#00627a] lg:hidden"
            >
              Deposit
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
            <AssetHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div ref={heroRef} className="min-w-0 lg:col-start-1 lg:row-start-2">
            <AssetHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Asset analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Asset data</h2>
              <QuickStatsGrid detail={detail} />
              <InterestRateModelCard detail={detail} />
              <SupplyBorrowCard detail={detail} />
              <HistoricalUtilizationCard detail={detail} />
              <AllocationBreakdownCard detail={detail} />
              <AssetCashflowCard detail={detail} />
              <RiskSection detail={detail} />
              <div className="space-y-6">
                <CashflowTrendCard detail={detail} />
                <EngagementTrendsCard
                  engagement={detail.engagement}
                  accentClassName={detail.hero.visual.textClass}
                />
              </div>
              <TransactionHistoryCard
                transactions={detail.transactions}
                assetSymbol={detail.hero.symbol}
              />
              <AboutNewsSection
                className="lg:hidden"
                about={detail.about}
                newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
                newsImageLabel={detail.hero.symbol}
                mediaVariant="icon"
              />
              <DetailFaqSection
                title="General FAQs"
                items={[
                  {
                    question: `What is ${detail.hero.symbol}?`,
                    answer: (
                      <p>
                        {detail.hero.name} is a borrowable asset listed on Avana. It can be borrowed anywhere the selected
                        collateral market supports it, with rates and limits determined by the active market risk settings.
                      </p>
                    ),
                  },
                  {
                    question: `How do I supply ${detail.hero.symbol}?`,
                    answer: (
                      <p>
                        Open the market, choose Deposit, enter the amount you want to supply, and confirm the transaction in
                        your wallet. Your balance and available supply capacity update after the transaction settles.
                      </p>
                    ),
                  },
                  {
                    question: `What moves the APY for ${detail.hero.symbol}?`,
                    answer: (
                      <p>
                        APY changes with utilization, available liquidity, and incentive changes. When more capital is borrowed
                        from a market, supply rates usually move higher as the pool becomes tighter.
                      </p>
                    ),
                  },
                  {
                    question: `Can I borrow against ${detail.hero.symbol}?`,
                    answer: (
                      <p>
                        If this asset is enabled as collateral, your borrowing power depends on the market’s loan-to-value and
                        risk parameters. More volatile assets generally support less borrowing than steadier collateral.
                      </p>
                    ),
                  },
                  {
                    question: `What risks should I watch?`,
                    answer: (
                      <p>
                        The main risks are price moves, utilization spikes, and liquidation if your health factor falls too
                        low. If you supply the asset, there is also protocol and market risk, so it helps to watch the
                        dashboard before making larger positions.
                      </p>
                    ),
                  },
                ]}
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
        label={`Manage ${detail.hero.symbol}`}
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
      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={onToggle} />
          <div
            role="dialog"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-radius-md border-t border-border bg-surface-raised p-4 shadow-elev-3 transition-transform duration-200"
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
        </>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        className="fixed inset-x-4 bottom-4 z-30 h-10 rounded-radius-sm bg-[#007a99] text-[13px] font-medium text-white shadow-elev-3 hover:bg-[#00627a]"
      >
        {label}
      </button>
    </div>
  )
}
