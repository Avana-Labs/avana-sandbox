"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { mapMultiplyHistoryToDetailRows } from "@/app/lib/multiply-system/read-model"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  DeferredDetailContent,
  DetailPageNotice,
  DetailPageWidth,
  MobileDetailActionBar,
} from "@/app/components/detail-page-primitives"
import { MarketHero, MarketHeroIdentity, MarketSidebar } from "@/app/multiply/_detail"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"

type Props = { detail: MultiplyMarketDetail }

const CashflowCard = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/CashflowCard").then((mod) => mod.CashflowCard),
  { ssr: false },
)
const RiskSection = dynamic(
  () => import("@/app/borrow/_detail/pool-sections/RiskSection").then((mod) => mod.RiskSection),
  { ssr: false },
)
const DetailFaqSection = dynamic(
  () => import("@/app/borrow/_detail/ui/DetailFaqSection").then((mod) => mod.DetailFaqSection),
  { ssr: false },
)
const TransactionHistoryCard = dynamic(
  () => import("@/app/multiply/_detail/pool-sections/TransactionHistoryCard").then((mod) => mod.TransactionHistoryCard),
  { ssr: false },
)
const RelatedMarketsRow = dynamic(
  () => import("@/app/multiply/_detail/pool-sections/RelatedMarketsRow").then((mod) => mod.RelatedMarketsRow),
  { ssr: false },
)

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
      <main className="pb-24 pt-12 md:pb-12 md:pt-14">
        <div className="container mx-auto px-4">
          <DetailPageWidth>
            <nav
              aria-label={t("Breadcrumb")}
              className="mb-4 flex items-center gap-1.5 text-[15px] text-muted-foreground md:text-[16px]"
            >
              <Link href="/multiply" className="transition-colors hover:text-foreground">
                {t("Multiply")}
              </Link>
              <span aria-hidden className="font-medium text-muted-foreground">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-20">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <MarketHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <MarketHero detail={detail} hideIdentity className="mb-12" />

                <AboutNewsSection
                  about={detail.about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visuals[0]?.iconUrl ?? detail.hero.visuals[1]?.iconUrl ?? undefined}
                  newsImageLabel={detail.hero.name}
                  mediaVariant="icon"
                  afterAbout={
                    <>
                      <section aria-label={t("Key Statistics")} className="space-y-6">
                        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
                          Key Statistics
                        </h2>
                        <QuickStatsGrid detail={detail} />
                      </section>
                      <RiskSection detail={detail} />
                    </>
                  }
                  className="pt-0"
                />

                <section
                  aria-label={t("Multiply market analytics")}
                  className="space-y-14 pt-14 md:space-y-16 md:pt-16"
                >
                  <DeferredDetailContent className="space-y-14 md:space-y-16">
                    <CashflowCard detail={detail} />
                    <DetailFaqSection
                      title={t("Multiply FAQs")}
                      items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                    />
                    <TransactionHistoryCard
                      transactions={transactions}
                      collateralSymbol={detail.row.protocol}
                      borrowableSymbol={detail.row.asset}
                    />
                    <RelatedMarketsRow detail={detail} />
                    <DetailPageNotice product="multiply" />
                  </DeferredDetailContent>
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
          className={primaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Multiply" />
          {t("Multiply")}
        </Link>
        <Link
          href={actionPagePath("multiply", "deleverage", { market: marketId, return: `/multiply/markets/${marketId}` })}
          className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Deleverage" />
          {t("Deleverage")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
