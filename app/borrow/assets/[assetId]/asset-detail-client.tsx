"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import type { AssetHeroPreloads } from "@/app/lib/borrow-detail/hero-preload"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
import type { CashflowPreload } from "@/app/lib/detail-page/cashflow-preload"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import {
  DeferredDetailContent,
  detailAnalyticsSectionClass,
  detailAnalyticsStackClass,
  DetailPageNotice,
  DetailPageWidth,
  MobileDetailActionBar,
} from "@/app/components/detail-page-primitives"
import { AssetHero, AssetHeroIdentity, interestRateModelFromAssetDetail } from "@/app/borrow/_detail/asset-sections"
import { QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { withGovernanceParameterView } from "@/app/borrow/_detail/lib/governance-parameters"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { AssetTokenSidebar } from "@/app/borrow/_detail/sidebars"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { BORROW_ASSET_KIND_CONFIG } from "@/app/components/detail-transaction-table/detail-market-transactions"
import { mapBorrowSessionRows, mapBorrowTxRow } from "@/app/lib/detail-page/transaction-history"
import { cn } from "@/lib/utils"

const DetailFaqSection = dynamic(() => import("@/app/borrow/_detail/ui").then((mod) => mod.DetailFaqSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[380px]" />,
})
const InterestRateModelCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.InterestRateModelCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const AllocationBreakdownCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections").then((mod) => mod.AllocationBreakdownCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[320px]" /> },
)
const CashflowCard = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/CashflowCard").then((mod) => mod.CashflowCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[240px]" /> },
)
const DetailMarketTransactionsDeferred = dynamic(
  () =>
    import("@/app/components/detail-transaction-table/detail-market-transactions").then(
      (mod) => mod.DetailMarketTransactions,
    ),
  { ssr: false, loading: () => <DeferredBlock className="h-[360px]" /> },
)
const RiskSection = dynamic(() => import("@/app/borrow/_detail/pool-sections").then((mod) => mod.RiskSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
function DeferredBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-radius-md border border-border bg-surface-raised/60", className)} />
}

type Props = {
  detail: AssetDetail
  heroPreloads?: AssetHeroPreloads | null
  quickStatsPreload?: QuickStatsPreload | null
  cashflowPreload?: CashflowPreload | null
}

export function AssetDetailClient({
  detail,
  heroPreloads = null,
  quickStatsPreload = null,
  cashflowPreload = null,
}: Props) {
  const { t } = useTranslation()
  const session = useBorrowSessionContext()
  const closeHref = `/borrow/assets/${detail.row.id}`
  const about = withGovernanceParameterView(detail.about, detail.protocolParameters)
  const seedRows = React.useMemo(() => detail.transactions.map(mapBorrowTxRow), [detail.transactions])
  const sessionRows = React.useMemo(
    () => mapBorrowSessionRows(session.transactionHistory, detail.row.id, detail.hero.symbol, "asset"),
    [detail.hero.symbol, detail.row.id, session.transactionHistory],
  )
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pb-24 pt-12 md:pb-12 md:pt-14">
        <div className="container mx-auto px-4">
          <DetailPageWidth>
            <nav
              aria-label={t("Breadcrumb")}
              className="mb-4 flex items-center gap-1.5 text-[15px] text-muted-foreground md:text-[16px]"
            >
              <Link href="/borrow" className="transition-colors hover:text-foreground">
                {t("Borrow")}
              </Link>
              <span aria-hidden className="font-normal text-muted-foreground">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-20">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <AssetHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <AssetHero detail={detail} heroPreloads={heroPreloads} hideIdentity className="mb-12" />

                <AboutNewsSection
                  about={about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
                  newsImageLabel={detail.hero.symbol}
                  mediaVariant="icon"
                  afterAbout={
                    <>
                      <section aria-label={t("Key Statistics")} className="space-y-6">
                        <h2 className="text-[22px] font-normal leading-none tracking-[-0.01em] text-foreground md:text-[24px]">
                          Key Statistics
                        </h2>
                        <QuickStatsGrid
                          detail={detail}
                          quickStatsPreload={quickStatsPreload}
                          product="borrow"
                          hideRisk
                        />
                      </section>
                      <RiskSection detail={detail} />
                    </>
                  }
                  className="pt-0"
                />

                <section aria-label={t("Asset analytics")} className={detailAnalyticsSectionClass}>
                  <DeferredDetailContent className={detailAnalyticsStackClass}>
                    <InterestRateModelCard {...interestRateModelFromAssetDetail(detail)} />
                    <AllocationBreakdownCard detail={detail} />
                    <CashflowCard detail={detail} cashflowPreload={cashflowPreload} />
                    <DetailFaqSection
                      title={t("General FAQs")}
                      items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                    />
                    <DetailMarketTransactionsDeferred
                      scope="asset"
                      slug={detail.row.id}
                      seedRows={seedRows}
                      sessionRows={sessionRows}
                      kindConfig={BORROW_ASSET_KIND_CONFIG}
                      context={{ assetSymbol: detail.hero.symbol }}
                    />
                    <DetailPageNotice product="borrow" />
                  </DeferredDetailContent>
                </section>
              </div>

              <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
                <div className="sticky top-20">
                  <AssetTokenSidebar detail={detail} />
                </div>
              </aside>
            </div>
          </DetailPageWidth>
        </div>
      </main>

      <MobileDetailActionBar className="grid grid-cols-2 gap-3">
        <Link
          href={actionPagePath("borrow", "borrow", { asset: detail.row.id, return: closeHref })}
          className={primaryCtaClass({ size: "compact", className: "gap-2.5 font-normal [&_svg]:size-5" })}
        >
          <ActionIcon label="Borrow" />
          {t("Borrow")}
        </Link>
        <Link
          href={actionPagePath("borrow", "repay", { asset: detail.row.id, return: closeHref })}
          className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-normal [&_svg]:size-5" })}
        >
          <ActionIcon label="Repay" />
          {t("Repay")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
