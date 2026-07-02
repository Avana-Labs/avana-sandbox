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
  open: "text-success",
  add: "text-success",
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

const ROW_HOVER_BG = "transition-colors group-hover:bg-table-header/40 dark:group-hover:bg-[#131820]"
const ROW_HOVER_LEFT = `${ROW_HOVER_BG} group-hover:rounded-l-radius-lg`
const ROW_HOVER_RIGHT = `${ROW_HOVER_BG} group-hover:rounded-r-radius-lg`

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

      <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[96px]" />
                <col className="w-[118px]" />
                <col className="w-[112px]" />
                <col className="w-[132px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Time
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Type
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Amount
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    For
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Wallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="group transition-colors">
                    <td className={`px-5 py-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground ${ROW_HOVER_LEFT}`}>
                      {tx.timeLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle ${ROW_HOVER_BG}`}>
                      <span className={cn("inline-block whitespace-nowrap text-[14px] font-medium tracking-[-0.03em]", KIND_TONE[tx.kind])}>
                        {KIND_LABEL[tx.kind]}
                      </span>
                    </td>
                    <td className={`px-3 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_BG}`}>
                      {tx.amountLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle text-right text-[12px] font-normal tracking-[-0.03em] text-muted-foreground ${ROW_HOVER_BG}`}>
                      <span className="inline-block whitespace-nowrap">
                        {describeTransaction(tx.kind, collateralSymbol, borrowableSymbol)}
                      </span>
                    </td>
                    <td className={`px-5 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_RIGHT}`}>
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

          <div className="overflow-x-auto md:hidden">
            <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[96px]" />
                <col className="w-[118px]" />
                <col className="w-[112px]" />
                <col className="w-[132px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Time
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Type
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Amount
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    For
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    Wallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="group transition-colors">
                    <td className={`px-5 py-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground ${ROW_HOVER_LEFT}`}>
                      {tx.timeLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle ${ROW_HOVER_BG}`}>
                      <span className={cn("inline-block whitespace-nowrap text-[14px] font-medium tracking-[-0.03em]", KIND_TONE[tx.kind])}>
                        {KIND_LABEL[tx.kind]}
                      </span>
                    </td>
                    <td className={`px-3 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_BG}`}>
                      {tx.amountLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle text-right text-[12px] font-normal tracking-[-0.03em] text-muted-foreground ${ROW_HOVER_BG}`}>
                      <span className="inline-block whitespace-nowrap">
                        {describeTransaction(tx.kind, collateralSymbol, borrowableSymbol)}
                      </span>
                    </td>
                    <td className={`px-5 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_RIGHT}`}>
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
