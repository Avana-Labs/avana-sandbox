"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { QuickStatsGrid } from "@/app/borrow/_detail/pool-sections"
import { LendHero, LendHeroIdentity, LendSidebar } from "@/app/lend/_detail"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import {
  DeferredDetailContent,
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
const DetailFaqSection = dynamic(
  () => import("@/app/borrow/_detail/ui/DetailFaqSection").then((mod) => mod.DetailFaqSection),
  { ssr: false },
)
const TransactionHistoryCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections/TransactionHistoryCard").then((mod) => mod.TransactionHistoryCard),
  { ssr: false },
)
const RelatedMarketsRow = dynamic(
  () => import("@/app/lend/_detail/sections/RelatedMarketsRow").then((mod) => mod.RelatedMarketsRow),
  { ssr: false },
)

type Props = { detail: LendMarketDetail }

/** Map a wallet's own sandbox lend actions into the shared TxHistoryRow shape. */
function mapSessionRows(
  history: ReturnType<typeof useLendSessionContext>["transactionHistory"],
  marketId: string,
  assetSymbol: string,
): TxHistoryRow[] {
  const now = Date.now()
  return history
    .filter((item) => item.marketId === marketId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      timeLabel: formatAge(now - item.timestamp),
      kind: item.kind === "deposit" ? "supply" : item.kind === "claim" ? "rewards" : "withdraw",
      amountLabel: `${item.kind === "withdraw" ? "-" : "+"}${item.amount.toFixed(4)} ${assetSymbol}`,
      walletLabel: "Sandbox wallet",
      txHashShort: item.hash.slice(0, 10),
    }))
}

function formatAge(elapsedMs: number) {
  const s = Math.max(1, Math.floor(elapsedMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function LendMarketDetailClient({ detail }: Props) {
  const session = useLendSessionContext()
  const { t } = useTranslation()
  const marketId = detail.row.marketId

  const transactions = React.useMemo(() => {
    const sessionRows = mapSessionRows(session.transactionHistory, marketId, detail.hero.symbol)
    return sessionRows.length > 0 ? sessionRows : detail.transactions
  }, [detail.hero.symbol, detail.transactions, marketId, session.transactionHistory])

  return (
    <div className="bg-background">
      <main className="pb-24 pt-12 md:pb-12 md:pt-14">
        <div className="container mx-auto px-4">
          <DetailPageWidth>
            <nav
              aria-label={t("Breadcrumb")}
              className="mb-4 flex items-center gap-1.5 text-[15px] text-muted-foreground md:text-[16px]"
            >
              <Link href="/lend" className="transition-colors hover:text-foreground">
                {t("Lend")}
              </Link>
              <span aria-hidden className="font-medium text-muted-foreground">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-20">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <LendHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <LendHero detail={detail} hideIdentity className="mb-6" />

                <section aria-label={t("Key Statistics")} className="mb-12 space-y-6">
                  <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">
                    Key Statistics
                  </h2>
                  <QuickStatsGrid detail={detail} />
                </section>

                <AboutNewsSection
                  about={detail.about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
                  newsImageLabel={detail.hero.symbol}
                  mediaVariant="icon"
                />

                <section aria-label={t("Lend market analytics")} className="space-y-12 pt-12">
                  <DeferredDetailContent className="space-y-12">
                    <CashflowCard detail={detail} />
                    <RiskSection detail={detail} />
                    <DetailFaqSection
                      title={t("General FAQs")}
                      items={detail.faqs.map((faq) => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}
                    />
                    <TransactionHistoryCard
                      transactions={transactions}
                      assetSymbol={detail.hero.symbol}
                      kindLabelMap={{ supply: "Supply", withdraw: "Withdraw", rewards: "Rewards" }}
                    />
                    <RelatedMarketsRow detail={detail} />
                    <DetailPageNotice product="lend" />
                  </DeferredDetailContent>
                </section>
              </div>

              <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
                <LendSidebar detail={detail} />
              </aside>
            </div>
          </DetailPageWidth>
        </div>
      </main>

      <MobileDetailActionBar className="grid grid-cols-2 gap-3">
        <Link
          href={actionPagePath("lend", "deposit", { market: marketId, return: `/lend/markets/${marketId}` })}
          className={primaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Deposit" />
          {t("Deposit")}
        </Link>
        <Link
          href={actionPagePath("lend", "withdraw", { market: marketId, return: `/lend/markets/${marketId}` })}
          className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
        >
          <ActionIcon label="Withdraw" />
          {t("Withdraw")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
