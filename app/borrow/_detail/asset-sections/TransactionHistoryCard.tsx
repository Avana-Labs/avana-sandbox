"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail, TxHistoryRow } from "@/app/lib/borrow-detail"
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
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  liquidation: "Liquidation",
  rewards: "Rewards",
}

type Props = { detail: AssetDetail }

export function TransactionHistoryCard({ detail }: Props) {
  return (
    <SectionCard
      title="Transaction history"
      subtitle="Recent activity for this market."
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-muted-foreground">
              <th className="pb-3 pl-6 pt-4 font-medium">Action</th>
              <th className="pb-3 pt-4 text-right font-medium">Amount</th>
              <th className="pb-3 pt-4 text-right font-medium">When</th>
              <th className="pb-3 pr-6 pt-4 text-right font-medium">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {detail.transactions.slice(0, 10).map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-muted/50">
                <td className="py-3 pl-6">
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", KIND_TONE[tx.kind])}>
                    {KIND_LABEL[tx.kind]}
                  </span>
                  {tx.counterpartyLabel ? (
                    <span className="ml-2 text-xs text-muted-foreground">{tx.counterpartyLabel}</span>
                  ) : null}
                </td>
                <td className="py-3 text-right font-data font-medium tabular-nums text-foreground">
                  {tx.amountLabel}
                </td>
                <td className="py-3 text-right text-xs tabular-nums text-muted-foreground">
                  {new Date(tx.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="py-3 pr-6 text-right font-data text-[11px] tabular-nums text-muted-foreground">
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
