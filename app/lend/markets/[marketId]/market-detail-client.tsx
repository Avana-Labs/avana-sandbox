"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { AboutNewsSection, DetailFaqSection, EngagementTrendsCard } from "@/app/borrow/_detail/ui"
import { CashflowCard, QuickStatsGrid, RiskSection } from "@/app/borrow/_detail/pool-sections"
import { TransactionHistoryCard } from "@/app/borrow/_detail/asset-sections"
import { LendHero, LendHeroIdentity, SupplyCard, RelatedMarketsRow, LendSidebar } from "@/app/lend/_detail"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

type Props = { detail: LendMarketDetail }

const PAGE_MAX_W = "max-w-[1152px]"

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
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const session = useLendSessionContext()
  const { t } = useTranslation()
  const marketId = detail.row.marketId

  const transactions = React.useMemo(() => {
    const sessionRows = mapSessionRows(session.transactionHistory, marketId, detail.hero.symbol)
    return sessionRows.length > 0 ? sessionRows : detail.transactions
  }, [detail.hero.symbol, detail.transactions, marketId, session.transactionHistory])

  return (
    <div className="bg-background">
      <main className={cn("mx-auto w-full px-5 pb-24 pt-8 md:px-8 md:pb-12", PAGE_MAX_W)}>
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[14px] text-muted-foreground md:text-[15px]">
          <Link href="/lend" className="transition-colors hover:text-foreground">
            {t("Lend")}
          </Link>
          <span aria-hidden className="text-border">
            ›
          </span>
          <span className="font-normal text-foreground">{detail.hero.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="min-w-0 border-b border-border pb-5 lg:col-span-2">
            <LendHeroIdentity detail={detail} className="pb-0" />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <LendHero detail={detail} hideIdentity className="mb-6" />

            <section aria-label="Lend market analytics" className="space-y-8 pt-8">
              <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">Market data</h2>
              <QuickStatsGrid detail={detail} />
              <SupplyCard detail={detail} />
              <CashflowCard detail={detail} />
              <EngagementTrendsCard engagement={detail.engagement} accentClassName={detail.hero.visual.textClass} />
              <RiskSection detail={detail} />
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
              <TransactionHistoryCard
                transactions={transactions}
                assetSymbol={detail.hero.symbol}
                kindLabelMap={{ supply: "Supply", withdraw: "Withdraw", rewards: "Rewards" }}
              />
              <RelatedMarketsRow detail={detail} />
            </section>
          </div>

          <aside className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:self-start">
            <LendSidebar detail={detail} />
          </aside>
        </div>
      </main>

      <MobileLendDock open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)}>
        <LendSidebar detail={detail} />
      </MobileLendDock>
    </div>
  )
}

function MobileLendDock({
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
        aria-label="Lend"
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
        Manage supply
      </button>
    </div>
  )
}
