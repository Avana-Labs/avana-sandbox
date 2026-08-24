"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { ChevronRight } from "@/app/components/icons"
import { TokenIcon } from "@/app/components/token-icon"
import { api } from "@/convex/_generated/api"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"
import {
  mapConvexActivityItemsToRows,
  mergeActivityRows,
  type ConvexActivityItem,
} from "@/app/dashboard/convex-activity"

const MASK = "••••"
const ACTIVITY_PAGE_SIZE = 25
const ACTIVITY_MAX = 200

const KIND_LABEL: Record<PortfolioActivityRow["kind"], string> = {
  swap: "Swap",
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  pledge: "Pledge",
  claim: "Claim",
  stake: "Stake",
  startCooldown: "Cooldown",
  unstake: "Unstake",
  open: "Open",
  addCollateral: "Add collateral",
  reduce: "Reduce",
  close: "Close",
  rebalance: "Rebalance",
  interest: "Interest",
  liquidation: "Liquidation",
}

/** Pull a token symbol from activity labels for the row icon (dummy-friendly). */
export function inferActivityTokenSymbol(row: PortfolioActivityRow): string {
  if (row.product === "rewards") return "AVA"

  const secondary = row.secondaryLabel.replace(/\s+claimed$/i, "").trim()
  const secondaryTail = secondary.split(/\s+/).at(-1)
  if (secondaryTail && /^[A-Za-z][A-Za-z0-9]{0,9}$/.test(secondaryTail)) return secondaryTail

  const primaryTail = row.primaryLabel.trim().split(/\s+/).at(-1)
  if (primaryTail && /^[A-Za-z][A-Za-z0-9]{0,9}$/.test(primaryTail)) return primaryTail

  return "ETH"
}

// Amount-column sign convention: user CASH FLOW, read like a bank statement.
export const AMOUNT_SIGN_BY_KIND: Record<PortfolioActivityRow["kind"], 1 | -1 | 0> = {
  borrow: 1,
  withdraw: 1,
  claim: 1,
  unstake: 1,
  reduce: 1,
  close: 1,
  supply: -1,
  repay: -1,
  pledge: -1,
  stake: -1,
  open: -1,
  addCollateral: -1,
  liquidation: -1,
  swap: 0,
  startCooldown: 0,
  rebalance: 0,
  interest: 0,
}

function applyAmountSign(sign: 1 | -1 | 0, body: string) {
  return sign > 0 ? `+${body}` : sign < 0 ? `-${body}` : body
}

function formatRowAmount(row: PortfolioActivityRow) {
  const sign = AMOUNT_SIGN_BY_KIND[row.kind]
  const magnitude = Math.abs(row.amountUsd)
  const body = row.product === "rewards" ? `${magnitude.toLocaleString()} AVA` : formatCompactUsd(magnitude)
  return applyAmountSign(sign, body)
}

function amountToneClass(row: PortfolioActivityRow) {
  const sign = AMOUNT_SIGN_BY_KIND[row.kind]
  if (sign > 0) return "text-success"
  if (sign < 0) return "text-foreground"
  return "text-muted-foreground"
}

const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/

function isSimulatedTxHash(txHash: string) {
  return !REAL_TX_HASH.test(txHash)
}

function getTxnHref(txHash: string) {
  return isSimulatedTxHash(txHash)
    ? `/sandbox/transactions/${encodeURIComponent(txHash)}`
    : `https://etherscan.io/tx/${txHash}`
}

function formatRelativeTime(iso: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))

  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

/**
 * Compact Activity feed for the dashboard sidebar (and mobile stack).
 * Seed rows cover live session actions; Convex `getActivity` paginates the
 * durable history with lazy "load more" as the user scrolls.
 */
export function RecentActivity({
  rows: seedRows,
  walletId,
}: {
  rows: PortfolioActivityRow[]
  walletId?: string | null
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const router = useRouter()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const [limit, setLimit] = React.useState(ACTIVITY_PAGE_SIZE)
  const cachedConvexRef = React.useRef<PortfolioActivityRow[]>([])

  const convexRaw = useQuery(
    api.sandbox.transactions.getActivity,
    walletId ? { wallet: walletId, limit } : "skip",
  )

  const convexRows = React.useMemo(() => {
    if (!convexRaw) return cachedConvexRef.current
    const mapped = mapConvexActivityItemsToRows(convexRaw as ConvexActivityItem[])
    cachedConvexRef.current = mapped
    return mapped
  }, [convexRaw])

  const isLoadingConvex = Boolean(walletId) && convexRaw === undefined && cachedConvexRef.current.length === 0
  const isLoadingMore = Boolean(walletId) && convexRaw === undefined && cachedConvexRef.current.length > 0
  const hasMore =
    Boolean(walletId) && limit < ACTIVITY_MAX && (convexRaw === undefined || convexRaw.length >= limit)

  const sortedRows = React.useMemo(() => mergeActivityRows(seedRows, convexRows), [convexRows, seedRows])

  const loadMore = React.useCallback(() => {
    if (!hasMore || isLoadingMore) return
    setLimit((current) => Math.min(current + ACTIVITY_PAGE_SIZE, ACTIVITY_MAX))
  }, [hasMore, isLoadingMore])

  React.useEffect(() => {
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { root, rootMargin: "80px", threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMore, sortedRows.length])

  const amount = (row: PortfolioActivityRow) => (showDollarAmounts ? formatRowAmount(row) : MASK)

  const openReceipt = React.useCallback(
    (txHash: string) => {
      if (!txHash) return
      if (isSimulatedTxHash(txHash)) {
        router.push(getTxnHref(txHash))
      } else {
        window.open(getTxnHref(txHash), "_blank", "noopener,noreferrer")
      }
    },
    [router],
  )

  return (
    <div className="min-w-0 min-h-0">
      {isLoadingConvex && !sortedRows.length ? (
        <div className="rounded-radius-md border border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("Loading")}…
        </div>
      ) : sortedRows.length ? (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto overscroll-contain rounded-radius-md border border-border lg:max-h-[560px]"
          aria-label={t("Activity")}
          role="region"
          tabIndex={0}
        >
          <div className="divide-y divide-border">
            {sortedRows.map((row) => {
              const interactive = Boolean(row.txHash)
              return (
                <div
                  key={row.id}
                  {...(interactive
                    ? {
                        role: "link" as const,
                        tabIndex: 0,
                        "aria-label": `${t("View transaction")}: ${row.primaryLabel}`,
                        onClick: () => openReceipt(row.txHash),
                        onKeyDown: (event: React.KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            openReceipt(row.txHash)
                          }
                        },
                      }
                    : {})}
                  className={cn(
                    "group flex items-center gap-3 bg-transparent px-3.5 py-3.5",
                    interactive &&
                      "cursor-pointer transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
                  )}
                >
                  <TokenIcon symbol={inferActivityTokenSymbol(row)} size="md" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium leading-5 tracking-[-0.02em] text-foreground">
                      {row.primaryLabel}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] leading-4 text-muted-foreground">
                      {[t(KIND_LABEL[row.kind]), row.secondaryLabel || null, formatRelativeTime(row.at)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "font-data text-[14px] font-medium tabular-nums tracking-[-0.02em]",
                        amountToneClass(row),
                      )}
                    >
                      {amount(row)}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 transition-opacity",
                        interactive
                          ? "text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                          : "invisible",
                      )}
                      aria-hidden
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {hasMore ? (
            <div
              ref={sentinelRef}
              className="border-t border-border px-3.5 py-3 text-center text-[12.5px] text-muted-foreground"
              aria-live="polite"
            >
              {isLoadingMore ? `${t("Loading")}…` : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-radius-md border border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("No recent activity.")}
        </div>
      )}
    </div>
  )
}
