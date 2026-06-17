"use client"

import * as React from "react"
import type { MultiplyTxHistoryRow } from "@/app/lib/multiply-detail"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<MultiplyTxHistoryRow["kind"], string> = {
  open: "Open",
  add: "Add collateral",
  reduce: "Reduce",
  close: "Close",
  interest: "Interest",
  rebalance: "Rebalance",
}

const KIND_TONE: Record<MultiplyTxHistoryRow["kind"], string> = {
  open: "text-emerald-600 dark:text-emerald-400",
  add: "text-emerald-600 dark:text-emerald-400",
  reduce: "text-rose-600 dark:text-rose-400",
  close: "text-rose-600 dark:text-rose-400",
  interest: "text-slate-700 dark:text-slate-300",
  rebalance: "text-amber-600 dark:text-amber-400",
}

type Props = {
  transactions: MultiplyTxHistoryRow[]
  collateralSymbol: string
  borrowableSymbol: string
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "add", label: "Add" },
  { id: "reduce", label: "Reduce" },
  { id: "close", label: "Close" },
  { id: "rebalance", label: "Rebalance" },
] as const

export function TransactionHistoryCard({ transactions, collateralSymbol, borrowableSymbol }: Props) {
  const [activeFilter, setActiveFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all")
  const visibleTransactions =
    activeFilter === "all" ? transactions : transactions.filter((tx) => tx.kind === activeFilter)

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">Transactions</h2>
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
            <col className="w-[132px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
              <th className="rounded-l-2xl bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Time</th>
              <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Type</th>
              <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Amount</th>
              <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">For</th>
              <th className="rounded-r-2xl bg-slate-50 px-5 py-3.5 text-right dark:bg-slate-900/90">Wallet</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/70">
                <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">
                  {tx.timeLabel}
                </td>
                <td className="px-5 py-4 align-middle">
                  <span className={cn("inline-block whitespace-nowrap text-[15px] font-medium", KIND_TONE[tx.kind])}>
                    {KIND_LABEL[tx.kind]}
                  </span>
                </td>
                <td className="px-5 py-4 align-middle font-data text-[14px] font-medium tabular-nums text-foreground">
                  {tx.amountLabel}
                </td>
                <td className="px-5 py-4 align-middle text-[14px] text-muted-foreground">
                  <span className="inline-block whitespace-nowrap">
                    {describeTransaction(tx.kind, collateralSymbol, borrowableSymbol)}
                  </span>
                </td>
                <td className="px-5 py-4 align-middle text-right font-data text-[14px] tabular-nums text-foreground">
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

function describeTransaction(
  kind: MultiplyTxHistoryRow["kind"],
  collateralSymbol: string,
  borrowableSymbol: string,
) {
  switch (kind) {
    case "open":
      return `${collateralSymbol} position`
    case "add":
      return `${collateralSymbol} collateral`
    case "reduce":
      return `${collateralSymbol} collateral`
    case "close":
      return `${borrowableSymbol} debt`
    case "interest":
      return `${borrowableSymbol} funding`
    case "rebalance":
      return `${collateralSymbol}/${borrowableSymbol}`
    default:
      return borrowableSymbol
  }
}
