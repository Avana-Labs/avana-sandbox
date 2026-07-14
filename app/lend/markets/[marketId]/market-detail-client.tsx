"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import Link from "next/link"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { LendHero, LendHeroIdentity, SupplyCard } from "@/app/lend/_detail"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { DetailPageNotice, DetailPageWidth, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { cn } from "@/lib/utils"

const AboutNewsSection = dynamic(() => import("@/app/borrow/_detail/ui/AboutNewsSection").then((mod) => mod.AboutNewsSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
const DetailFaqSection = dynamic(() => import("@/app/borrow/_detail/ui/DetailFaqSection").then((mod) => mod.DetailFaqSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[380px]" />,
})
const QuickStatsGrid = dynamic(() => import("@/app/borrow/_detail/pool-sections/QuickStatsGrid").then((mod) => mod.QuickStatsGrid), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[280px]" />,
})
const CashflowCard = dynamic(() => import("@/app/borrow/_detail/pool-sections/CashflowCard").then((mod) => mod.CashflowCard), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
const RiskSection = dynamic(() => import("@/app/borrow/_detail/pool-sections/RiskSection").then((mod) => mod.RiskSection), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[320px]" />,
})
const TransactionHistoryCard = dynamic(
  () => import("@/app/borrow/_detail/asset-sections/TransactionHistoryCard").then((mod) => mod.TransactionHistoryCard),
  { ssr: false, loading: () => <DeferredBlock className="h-[360px]" /> },
)
const RelatedMarketsRow = dynamic(() => import("@/app/lend/_detail/sections/RelatedMarketsRow").then((mod) => mod.RelatedMarketsRow), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[200px]" />,
})
const LendSidebar = dynamic(() => import("@/app/lend/_detail/sidebars/LendSidebar").then((mod) => mod.LendSidebar), {
  ssr: false,
  loading: () => <DeferredBlock className="h-[760px]" />,
})

function DeferredBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-radius-md border border-border bg-surface-raised/60", className)} />
}

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
      <main className="pb-24 pt-8 md:pb-12">
        <div className="container mx-auto px-4">
          <DetailPageWidth>
            <nav aria-label={t("Breadcrumb")} className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
              <Link href="/lend" className="transition-colors hover:text-foreground">
                {t("Lend")}
              </Link>
              <span aria-hidden className="text-border">
                ›
              </span>
              <span className="font-normal text-foreground">{detail.hero.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
              <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
                <LendHeroIdentity detail={detail} className="pb-0" />
              </div>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <LendHero detail={detail} hideIdentity className="mb-6" />

                <AboutNewsSection
                  about={detail.about}
                  aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
                  compactAboutTitle
                  newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
                  newsImageLabel={detail.hero.symbol}
                  mediaVariant="icon"
                />

                <section aria-label={t("Lend market analytics")} className="space-y-12 pt-12">
                  <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">Key Statistics</h2>
                  <QuickStatsGrid detail={detail} />
                  <SupplyCard detail={detail} />
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
                  <DetailPageNotice />
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
          className={primaryCtaClass({ size: "compact" })}
        >
          {t("Deposit")}
        </Link>
        <Link
          href={actionPagePath("lend", "withdraw", { market: marketId, return: `/lend/markets/${marketId}` })}
          className={secondaryCtaClass({ size: "compact" })}
        >
          {t("Withdraw")}
        </Link>
      </MobileDetailActionBar>
    </div>
  )
}
