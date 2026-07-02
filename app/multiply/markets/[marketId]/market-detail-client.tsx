"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { AboutNewsSection, DetailFaqSection, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import { CashflowCard, QuickStatsGrid, RiskSection } from "@/app/borrow/_detail/pool-sections"
import { mapMultiplyHistoryToDetailRows } from "@/app/lib/multiply-system/read-model"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"
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

const PAGE_MAX_W = "max-w-[1152px]"

export function MarketDetailClient({ detail }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
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
      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
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

            <section aria-label="Multiply market analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
              <QuickStatsGrid detail={detail} />
              <SupplyBorrowCard detail={detail} />
              <CashflowCard detail={detail} />
              <EngagementTrendsCard
                engagement={detail.engagement}
                accentClassName={[detail.hero.visuals[0].textClass, detail.hero.visuals[1].textClass]}
              />
              <RiskSection detail={detail} />
              <AboutNewsSection
                className="lg:hidden"
                about={detail.about}
                newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
                newsImageLabel={detail.hero.name}
                mediaVariant="icon"
              />
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
      </main>

      <MobileMultiplyDock open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)}>
        <MarketSidebar detail={detail} />
      </MobileMultiplyDock>
    </div>
  )
}

function MobileMultiplyDock({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="lg:hidden">
      <div
        aria-hidden={!open}
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onToggle}
      />
      <div
        role="dialog"
        aria-label="Multiply"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-radius-md border-t border-border bg-surface-raised p-4 shadow-elev-3 transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full",
        )}
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
      <button
        type="button"
        onClick={onToggle}
        className="fixed inset-x-4 bottom-4 z-30 h-10 rounded-radius-sm bg-[hsl(var(--brand))] text-[13px] font-medium text-white shadow-elev-3 hover:bg-[hsl(var(--brand))]/90"
      >
        Open position
      </button>
    </div>
  )
}
