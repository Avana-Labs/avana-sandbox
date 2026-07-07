"use client"

import * as React from "react"
import Link from "next/link"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { AboutNewsSection, DetailFaqSection, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import { CashflowCard, QuickStatsGrid, RiskSection } from "@/app/borrow/_detail/pool-sections"
import { mapMultiplyHistoryToDetailRows } from "@/app/lib/multiply-system/read-model"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { DetailPageWidth, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import {
  MarketHero,
  MarketHeroIdentity,
  RelatedMarketsRow,
  MarketSidebar,
  SupplyBorrowCard,
  TransactionHistoryCard,
} from "@/app/multiply/_detail"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"

type Props = { detail: MultiplyMarketDetail }

export function MarketDetailClient({ detail }: Props) {
  const session = useMultiplySessionContext()
  const { t } = useTranslation()
  const marketId = detail.id.toLowerCase().replaceAll("_", "-")

  const transactions = React.useMemo(() => {
    const sessionRows = mapMultiplyHistoryToDetailRows(
      session.transactionHistory.filter((item) => item.marketId === marketId),
      detail.row.protocol,
      detail.row.asset,
    )
    return sessionRows.length > 0 ? sessionRows : detail.transactions
  }, [detail.row.asset, detail.row.protocol, detail.transactions, marketId, session.transactionHistory])

  return (
    <div className="bg-background">
      <main className="pb-24 pt-8 md:pb-12">
        <div className="container mx-auto px-4">
          <DetailPageWidth>
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
              <Link href="/multiply" className="transition-colors hover:text-foreground">
                {t("Multiply")}
              </Link>
              <span aria-hidden className="text-border">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <MarketHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <MarketHero detail={detail} hideIdentity className="mb-6" />

                <AboutNewsSection
                  about={detail.about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visuals[0]?.iconUrl ?? detail.hero.visuals[1]?.iconUrl ?? undefined}
                  newsImageLabel={detail.hero.name}
                  mediaVariant="icon"
                />

                <section aria-label="Multiply market analytics" className="space-y-8 pt-8">
                  <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
                  <QuickStatsGrid detail={detail} />
                  <SupplyBorrowCard detail={detail} />
                  <CashflowCard detail={detail} />
                  <EngagementTrendsCard
                    engagement={detail.engagement}
                    accentClassName={[detail.hero.visuals[0]?.textClass ?? "", detail.hero.visuals[1]?.textClass ?? ""]}
                  />
                  <RiskSection detail={detail} />
                  <DetailFaqSection
                    title="Multiply FAQs"
                    items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                  />
                  <TransactionHistoryCard
                    transactions={transactions}
                    collateralSymbol={detail.row.protocol}
                    borrowableSymbol={detail.row.asset}
                  />
                  <RelatedMarketsRow detail={detail} />
                </section>
              </div>

              <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
                <MarketSidebar detail={detail} />
              </aside>
            </div>
          </DetailPageWidth>
        </div>
      </main>

      <MobileDetailActionBar className="grid grid-cols-2 gap-3">
        <Link
          href={actionPagePath("multiply", "multiply", { market: marketId, return: `/multiply/markets/${marketId}` })}
          className={primaryCtaClass({ size: "compact" })}
        >
          {t("Multiply")}
        </Link>
        <Link
          href={actionPagePath("multiply", "deleverage", { market: marketId, return: `/multiply/markets/${marketId}` })}
          className={secondaryCtaClass({ size: "compact" })}
        >
          {t("Deleverage")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
