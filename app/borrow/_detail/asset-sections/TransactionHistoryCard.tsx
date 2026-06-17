"use client"

import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<TxHistoryRow["kind"], string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  liquidation: "Liquidation",
  rewards: "Rewards",
}

const KIND_TONE: Record<TxHistoryRow["kind"], string> = {
  supply: "text-emerald-600 dark:text-emerald-400",
  withdraw: "text-rose-600 dark:text-rose-400",
  borrow: "text-rose-600 dark:text-rose-400",
  repay: "text-emerald-600 dark:text-emerald-400",
  liquidation: "text-amber-600 dark:text-amber-400",
  rewards: "text-emerald-600 dark:text-emerald-400",
}

type Props = {
  transactions: TxHistoryRow[]
  title?: string
  subtitle?: string
  kindLabelMap?: Partial<Record<TxHistoryRow["kind"], string>>
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

export function TransactionHistoryCard({
  transactions,
  title = "Transactions",
  subtitle,
  kindLabelMap,
}: Props) {
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11.5px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="max-w-[760px]">
        <div className="overflow-hidden rounded-[18px] border border-border/30 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[92px]" />
              <col className="w-[148px]" />
              <col className="w-[170px]" />
              <col />
            </colgroup>
            <thead className="bg-slate-50/85">
              <tr className="text-left text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5 text-right">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-slate-50/70">
                  <td className="px-5 py-4 align-middle text-[12px] tabular-nums text-muted-foreground">
                    {tx.timeLabel ?? formatRelativeTime(tx.at)}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <span className={cn("text-[13px] font-medium", KIND_TONE[tx.kind])}>
                      {kindLabelMap?.[tx.kind] ?? KIND_LABEL[tx.kind]}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle font-data text-[13px] font-medium tabular-nums text-foreground">
                    {tx.amountLabel}
                  </td>
                  <td className="px-5 py-4 align-middle text-right font-data text-[12px] tabular-nums text-muted-foreground">
                    <span className="inline-block max-w-full truncate align-middle">
                      {tx.walletLabel ?? tx.counterpartyLabel ?? tx.txHashShort}
                    </span>
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
