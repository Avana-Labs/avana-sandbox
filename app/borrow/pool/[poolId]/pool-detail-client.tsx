"use client"

import * as React from "react"
import Link from "next/link"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection, DetailFaqSection } from "@/app/borrow/_detail/ui"
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
import { DetailPageWidth, MobileDetailActionBar } from "@/app/components/detail-page-primitives"

type Props = { detail: PoolDetail }

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
          <DetailPageWidth>
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
              <Link href="/borrow" className="transition-colors hover:text-foreground">
                {t("Borrow")}
              </Link>
              <span aria-hidden className="text-border">›</span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <PoolHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <PoolHero detail={detail} hideIdentity className="mb-6" />

                <AboutNewsSection
                  about={detail.about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
                  newsImageLabel={detail.hero.name}
                  mediaVariant="icon"
                />

                <section aria-label="Pool analytics" className="space-y-8 pt-8">
                  <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
                  <QuickStatsGrid detail={detail} />
                  <CashflowCard detail={detail} />
                  <RiskSection detail={detail} />
                  <DetailFaqSection
                    title="General FAQs"
                    items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                  />
                  <CollateralHistoryCard transactions={detail.transactions} />
                  <RelatedPoolsRow detail={detail} />
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
          className={primaryCtaClass({ size: "compact" })}
        >
          {t("Pledge")}
        </Link>
        <Link
          href={actionPagePath("borrow", "claim", { market: detail.id, return: `/borrow/markets/${detail.id}` })}
          className={secondaryCtaClass({ size: "compact" })}
        >
          {t("Claim")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
