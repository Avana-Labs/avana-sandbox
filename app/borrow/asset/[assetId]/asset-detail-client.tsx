"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import {
  AssetHero,
  AssetHeroIdentity,
} from "@/app/borrow/_detail/asset-sections"
import { QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { AssetTokenActions } from "@/app/borrow/_detail/sidebars"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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

type Props = { detail: AssetDetail }

/** Desktop content max width — 10% narrower than the original 1280px layout. */
const PAGE_MAX_W = "max-w-[1152px]"

export function AssetDetailClient({ detail }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
          <Link href="/borrow" className="transition-colors hover:text-foreground">
            {t("Borrow")}
          </Link>
          <span aria-hidden className="text-border">›</span>
          <span className="font-normal text-foreground">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
            <AssetHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <AssetHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Asset analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Asset data</h2>
              <QuickStatsGrid detail={detail} />
              <InterestRateModelCard detail={detail} />
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
                items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-radius-md border-t border-border bg-surface-raised p-4 shadow-elev-3 transition-transform duration-200"
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
