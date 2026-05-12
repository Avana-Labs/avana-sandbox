"use client"

import { cn } from "@/lib/utils"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"

const KIND_TONE: Record<TxHistoryRow["kind"], string> = {
  supply: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  withdraw: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  borrow: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  repay: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  liquidation: "bg-rose-600/10 text-rose-700 dark:text-rose-400",
  rewards: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
}

const KIND_LABEL: Record<TxHistoryRow["kind"], string> = {
  supply: "Add collateral",
  withdraw: "Remove collateral",
  borrow: "Borrow",
  repay: "Repay",
  liquidation: "Liquidation",
  rewards: "Claim fees",
}

type Props = {
  transactions: TxHistoryRow[]
  title?: string
  subtitle?: string
}

export function CollateralHistoryCard({
  transactions,
  title = "Collateral history",
  subtitle = "Recent collateral adds, removals, and fee claims.",
}: Props) {
  return (
    <SectionCard title={title} subtitle={subtitle} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <th className="pb-2 pl-5 pt-3">Action</th>
              <th className="pb-2 pt-3 text-right">Amount</th>
              <th className="pb-2 pt-3 text-right">When</th>
              <th className="pb-2 pr-5 pt-3 text-right">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.slice(0, 10).map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-surface-inset/60">
                <td className="py-2.5 pl-5">
                  <span className={cn("rounded-xs px-1.5 py-0.5 text-[10.5px] font-medium", KIND_TONE[tx.kind])}>
                    {KIND_LABEL[tx.kind]}
                  </span>
                  {tx.counterpartyLabel ? (
                    <span className="ml-2 text-[11.5px] text-muted-foreground">{tx.counterpartyLabel}</span>
                  ) : null}
                </td>
                <td className="py-2.5 text-right font-data font-medium tabular-nums text-foreground">
                  {tx.amountLabel}
                </td>
                <td className="py-2.5 text-right text-[11px] tabular-nums text-muted-foreground">
                  {new Date(tx.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="py-2.5 pr-5 text-right font-data text-[11px] tabular-nums text-muted-foreground">
                  {tx.txHashShort}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
