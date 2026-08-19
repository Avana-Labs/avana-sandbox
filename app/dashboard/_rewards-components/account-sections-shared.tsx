"use client"

import { Suspense, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TokenIcon } from "@/app/components/token-icon"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { buildDashboardWalletBalanceRows } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const MASK = "••••"

/**
 * Idle "available to use" funds for a product — the buckets that were moved off the
 * Wallet tab (which now shows only unallocated funds). Rendering them here keeps the
 * money visible on the product it belongs to, and lets the global Net Value reconcile
 * with the per-tab totals. Renders nothing when the wallet has no such balance.
 */
export function ProductAvailableCard({
  walletId,
  sourceTypes,
  title,
}: {
  walletId: string
  sourceTypes: ReadonlyArray<UserAssetBalance["sourceType"]>
  /** Already-translated heading (translate at the call site so i18n parity can see the key). */
  title: string
}) {
  const { exact } = useCurrency()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const priceFor = useCanonicalPriceFor()
  const balances = useConvexProductWalletBalances(walletId)
  const allow = new Set(sourceTypes)
  const rows = buildDashboardWalletBalanceRows({ walletId, balances: balances ?? undefined, priceFor }).filter((row) =>
    allow.has(row.sourceType),
  )
  if (rows.length === 0) return null
  const total = rows.reduce((sum, row) => sum + row.valueUsd, 0)
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h3>
        <span className="font-data text-[15px] tabular-nums text-foreground">{m(exact(total))}</span>
      </div>
      <ul className="divide-y divide-border rounded-radius-md border border-border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <TokenIcon symbol={row.symbol} size="table" />
              <span className="truncate text-[14px] font-medium text-foreground">{row.symbol}</span>
            </span>
            <span className="text-right">
              <span className="block font-data text-[14px] tabular-nums text-foreground">{m(exact(row.valueUsd))}</span>
              <span className="block text-[12px] text-muted-foreground">
                {showDollarAmounts ? `${row.amount} ${row.symbol}` : MASK}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Underline sub-tab strip for the account sections (Borrow/Multiply) on the
 * portfolio page — same treatment as the old dashboard SectionTabStrip.
 */
export function SectionTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={ariaLabel} className="flex w-max min-w-max gap-8">
        {items.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 pb-2 text-left text-[15px] font-normal tracking-[-0.03em] transition-colors md:text-[17px]",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AccountModuleBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton className="h-64 w-full rounded-radius-md" />}>{children}</Suspense>
}
