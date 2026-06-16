"use client"

import type { MultiplyTxHistoryRow } from "@/app/lib/multiply-detail"
import { SectionCard } from "@/app/borrow/_detail/ui"

const KIND_LABEL: Record<MultiplyTxHistoryRow["kind"], string> = {
  open: "Open",
  add: "Add collateral",
  reduce: "Reduce",
  close: "Close",
  interest: "Interest",
  rebalance: "Rebalance",
}

type Props = {
  transactions: MultiplyTxHistoryRow[]
}

export function TransactionHistoryCard({ transactions }: Props) {
  return (
    <SectionCard title="Transaction history" subtitle="Recent position activity for this market." bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[780px] w-full border-separate border-spacing-0 text-[13px]">
          <thead className="bg-surface-raised/70">
            <tr className="text-left text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <th className="sticky top-0 border-b border-border/80 px-5 py-3.5">Action</th>
              <th className="sticky top-0 border-b border-border/80 px-5 py-3.5 text-right">Amount</th>
              <th className="sticky top-0 border-b border-border/80 px-5 py-3.5 text-right">When</th>
              <th className="sticky top-0 border-b border-border/80 px-5 py-3.5 text-right">Tx hash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 10).map((tx) => (
              <tr key={tx.id} className="group transition-colors hover:bg-surface-inset/50">
                <td className="border-b border-border/70 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-normal leading-6">
                    <span className="text-foreground">{KIND_LABEL[tx.kind]}</span>
                    {tx.counterpartyLabel ? <span className="min-w-0 truncate text-muted-foreground">{tx.counterpartyLabel}</span> : null}
                  </div>
                </td>
                <td className="border-b border-border/70 px-5 py-4 text-right font-data font-medium tabular-nums text-foreground">
                  {tx.amountLabel}
                </td>
                <td className="border-b border-border/70 px-5 py-4 text-right text-[11.5px] tabular-nums text-muted-foreground">
                  {new Date(tx.at).toLocaleString(undefined, {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="border-b border-border/70 px-5 py-4 text-right font-data text-[11.5px] tabular-nums text-muted-foreground">
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
