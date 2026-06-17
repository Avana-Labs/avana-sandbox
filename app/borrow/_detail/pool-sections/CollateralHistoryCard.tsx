"use client"

import * as React from "react"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<TxHistoryRow["kind"], string> = {
  supply: "Pledge",
  withdraw: "Remove",
  borrow: "Borrow",
  repay: "Repay",
  liquidation: "Liquidation",
  rewards: "Claim",
}

const KIND_TONE: Record<TxHistoryRow["kind"], string> = {
  supply: "text-emerald-600 dark:text-emerald-400",
  withdraw: "text-rose-600 dark:text-rose-400",
  borrow: "text-rose-600 dark:text-rose-400",
  repay: "text-emerald-600 dark:text-emerald-400",
  liquidation: "text-amber-600 dark:text-amber-400",
  rewards: "text-slate-700 dark:text-slate-300",
}

type Props = {
  transactions: TxHistoryRow[]
  tokenLabels: [string, string]
  title?: string
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "supply", label: "Pledge" },
  { id: "withdraw", label: "Remove" },
  { id: "rewards", label: "Claim" },
] as const

export function CollateralHistoryCard({
  transactions,
  tokenLabels,
  title = "Transactions",
}: Props) {
  const [activeFilter, setActiveFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all")
  const visibleTransactions =
    activeFilter === "all" ? transactions : transactions.filter((tx) => tx.kind === activeFilter)

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => {
            const active = filter.id === activeFilter
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-[760px] overflow-x-auto rounded-[18px] bg-white dark:bg-slate-950">
        <table className="min-w-[760px] w-full table-fixed border-separate border-spacing-0 text-[14px]">
          <colgroup>
            <col className="w-[96px]" />
            <col className="w-[118px]" />
            <col className="w-[112px]" />
            <col className="w-[112px]" />
            <col className="w-[112px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-left text-[11.5px] font-medium text-muted-foreground dark:bg-slate-900/90">
              <th className="rounded-l-2xl px-5 py-3.5">Time</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5 text-right">USD</th>
              <th className="px-5 py-3.5 text-right">{tokenLabels[0]}</th>
              <th className="px-5 py-3.5 text-right">{tokenLabels[1]}</th>
              <th className="rounded-r-2xl px-5 py-3.5 text-right">Wallet</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/70">
                <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.timeLabel}
                </td>
                <td className="px-5 py-4 align-middle">
                  <span className={cn("text-[15px] font-medium", KIND_TONE[tx.kind])}>{KIND_LABEL[tx.kind]}</span>
                </td>
                <td className="px-5 py-4 text-right align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.amountLabel.replace(/^\+/, "")}
                </td>
                <td className="px-5 py-4 text-right align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.token0AmountLabel ?? "-"}
                </td>
                <td className="px-5 py-4 text-right align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.token1AmountLabel ?? "-"}
                </td>
                <td className="px-5 py-4 text-right align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.walletHref ? (
                    <a
                      href={tx.walletHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block max-w-full truncate whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                    >
                      {tx.walletLabel ?? tx.txHashShort}
                    </a>
                  ) : (
                    <span className="inline-block max-w-full truncate whitespace-nowrap align-middle">
                      {tx.walletLabel ?? tx.txHashShort}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
