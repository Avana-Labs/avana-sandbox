"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { actionPagePath } from "@/app/lib/action-system/contracts"

type Props = { detail: AssetDetail; className?: string; embedded?: boolean }

/**
 * Right-column sidebar on the asset detail page.
 *
 * Keeps the page-visible surface tiny (summary + two buttons) and routes
 * deposit / withdraw to the shared lend action pages.
 */
export function AssetDepositSidebar({ detail, className, embedded = false }: Props) {
  const router = useRouter()
  const lendSession = useLendSessionContext()
  const marketId = resolveLendMarketId(detail.hero.symbol)

  const position = React.useMemo(
    () =>
      Object.values(lendSession.state.positions).find(
        (entry) => entry.walletId === lendSession.walletId && entry.marketId === marketId && entry.status === "active",
      ),
    [lendSession.state.positions, lendSession.walletId, marketId],
  )

  const apyLabel = `${parseFloat(String(detail.row.borrowApr)).toFixed(2)}%`
  const suppliedLabel = position
    ? `$${position.suppliedValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "$0.00"

  return (
    <>
      <aside
        className={cn(
          "flex w-full flex-col gap-4",
          embedded
            ? "p-0"
            : "rounded-radius-md border border-border bg-surface-raised p-4 shadow-elev-1",
          className,
        )}
        aria-label={`Deposit ${detail.hero.symbol}`}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Your deposits</div>
            <div className="mt-1 font-data text-[22px] font-medium tabular-nums text-foreground">{suppliedLabel}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-200/70 bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400">
            {apyLabel} APY
          </span>
        </header>

        <dl className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
          <dt className="text-muted-foreground">Asset</dt>
          <dd className="text-right font-medium text-foreground">{detail.hero.symbol}</dd>
          <dt className="text-muted-foreground">Supply APY</dt>
          <dd className="text-right font-data tabular-nums text-foreground">{apyLabel}</dd>
          <dt className="text-muted-foreground">Wallet balance</dt>
          <dd className="text-right font-data tabular-nums text-foreground">{detail.row.walletBalanceLabel}</dd>
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push(actionPagePath("lend", "deposit", { market: marketId }))}
            className="h-9 rounded-radius-sm bg-accent-primary text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => router.push(actionPagePath("lend", "withdraw", { market: marketId }))}
            disabled={!position}
            className="h-9 rounded-radius-sm border border-border bg-surface-raised text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      </aside>

      <AboutNewsSection
        about={detail.about}
        aboutTitle={`About ${detail.hero.name}`}
        compactAboutTitle
        newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
        newsImageLabel={detail.hero.symbol}
        mediaVariant="icon"
      />
    </>
  )
}
