"use client"

import * as React from "react"
import Link from "next/link"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
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
import { PoolBorrowSidebar } from "@/app/borrow/_detail/sidebars"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  const { t } = useTranslation()

  return (
    <div className="bg-background">
      <main className="pb-24 pt-8 md:pb-12">
        <div className="container mx-auto px-4">
          <div className={cn("mx-auto", PAGE_MAX_W)}>
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
              <Link href="/borrow" className="transition-colors hover:text-foreground">
                {t("Borrow")}
              </Link>
              <span aria-hidden className="text-border">›</span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <PoolHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <PoolHero detail={detail} hideIdentity className="mb-6" />

                <section aria-label="Pool analytics" className="space-y-8 pt-8">
                  <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
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
          </div>
        </div>
      </main>

      {/* Mobile: direct-action sticky bar — routes straight into the action (no intermediate dock) */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link
          href={actionPagePath("borrow", "supply", { market: detail.id, return: `/borrow/markets/${detail.id}` })}
          className={primaryCtaClass({ size: "compact" })}
        >
          {t("Pledge")}
        </Link>
        <Link
          href={actionPagePath("borrow", "borrow", { market: detail.id, return: `/borrow/markets/${detail.id}` })}
          className={secondaryCtaClass({ size: "compact" })}
        >
          {t("Borrow")}
        </Link>
      </div>
    </div>
  )
}
