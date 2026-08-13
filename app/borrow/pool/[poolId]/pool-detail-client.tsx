"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { secondaryCtaClass } from "@/app/components/action-page/action-cta"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import type { PoolHeroPreloads } from "@/app/lib/borrow-detail/hero-preload"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { AssetsYouCanBorrowSection } from "@/app/borrow/_detail/ui/CrossMarketReferenceSections"
import { LiquidationRiskSection } from "@/app/borrow/_detail/ui/LiquidationRiskSection"
import { resolveBorrowablesForPool } from "@/app/lib/borrow-detail/cross-market"
import { withGovernanceParameterView } from "@/app/borrow/_detail/lib/governance-parameters"
import { PoolHero, PoolHeroIdentity, QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { PoolBorrowSidebar } from "@/app/borrow/_detail/sidebars"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  DeferredDetailContent,
  detailAnalyticsSectionClass,
  detailAnalyticsStackClass,
  DetailPageNotice,
  DetailPageWidth,
  MobileDetailActionBar,
} from "@/app/components/detail-page-primitives"

const CashflowCard = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/CashflowCard").then((mod) => mod.CashflowCard),
  { ssr: false },
)
const RiskSection = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/RiskSection").then((mod) => mod.RiskSection),
  { ssr: false },
)
const CollateralHistoryCard = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/CollateralHistoryCard").then((mod) => mod.CollateralHistoryCard),
  { ssr: false },
)
const DetailFaqSection = dynamic(
  () => import("@/app/borrow/_detail/ui/DetailFaqSection").then((mod) => mod.DetailFaqSection),
  { ssr: false },
)

type Props = { detail: PoolDetail; heroPreloads?: PoolHeroPreloads | null }

/**
 * Two-column detail page for a single LP collateral pool.
 *
 * Desktop: sections fill the left column; `PoolBorrowSidebar` (homepage
 * CompactBorrowCard reused) sticks on the right. Mobile: sections stack and
 * the sidebar collapses into a bottom sheet triggered by a fixed button.
 */
export function PoolDetailClient({ detail, heroPreloads = null }: Props) {
  const { t } = useTranslation()
  const about = withGovernanceParameterView(detail.about, detail.protocolParameters)

  return (
    <div className="bg-background">
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
              <span aria-hidden className="font-medium text-muted-foreground">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-20">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <PoolHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <PoolHero detail={detail} heroPreloads={heroPreloads} hideIdentity className="mb-12" />

                <AboutNewsSection
                  about={about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
                  newsImageLabel={detail.hero.name}
                  mediaVariant="icon"
                  afterAbout={
                    <>
                      <section aria-label={t("Key Statistics")} className="space-y-6">
                        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
                          Key Statistics
                        </h2>
                        <QuickStatsGrid detail={detail} hideRisk />
                      </section>
                      <RiskSection detail={detail} />
                    </>
                  }
                  className="pt-0"
                />

                <section aria-label={t("Pool analytics")} className={detailAnalyticsSectionClass}>
                  <DeferredDetailContent className={detailAnalyticsStackClass}>
                    <CashflowCard detail={detail} />
                    <AssetsYouCanBorrowSection
                      collateralLabel={detail.hero.name}
                      assets={detail.borrowableAssets ?? resolveBorrowablesForPool(detail.row)}
                    />
                    {detail.liquidationRisk && detail.liquidationRisk.length > 0 ? (
                      <LiquidationRiskSection stats={detail.liquidationRisk} />
                    ) : null}
                    <DetailFaqSection
                      title={t("General FAQs")}
                      items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                    />
                    <CollateralHistoryCard transactions={detail.transactions} />
                    <DetailPageNotice product="borrow" />
                  </DeferredDetailContent>
                </section>
              </div>

              <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
                <PoolBorrowSidebar detail={detail} />
              </aside>
            </div>
          </DetailPageWidth>
        </div>
      </main>

      <MobileDetailActionBar className="grid grid-cols-2 gap-3">
        <Link
          href={actionPagePath("borrow", "supply", { market: detail.id, return: `/borrow/markets/${detail.id}` })}
          className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Pledge" />
          {t("Pledge")}
        </Link>
        <Link
          href={actionPagePath("borrow", "claim", { market: detail.id, return: `/borrow/markets/${detail.id}` })}
          className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Claim" />
          {t("Claim")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
