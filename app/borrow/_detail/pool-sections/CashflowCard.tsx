"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"
import { DeltaPill } from "@/app/components/ui/live/delta-pill"

type Props = { detail: PoolDetail }

export function CashflowCard({ detail }: Props) {
  const { cashflow } = detail

  return (
    <SectionCard
      title="Cashflow breakdown"
      subtitle={`${cashflow.periodLabel} · fees, incentives and protocol revenue.`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <th className="pb-2 pl-5 pt-3">Line</th>
              <th className="pb-2 pt-3 text-right">Reported</th>
              <th className="pb-2 pr-5 pt-3 text-right">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cashflow.rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "transition-colors hover:bg-surface-inset/60",
                  row.highlighted ? "bg-surface-inset/40" : undefined,
                )}
              >
                <th scope="row" className="py-2.5 pl-5 text-left font-medium text-foreground">
                  {row.label}
                </th>
                <td className="py-2.5 text-right font-data font-medium tabular-nums text-foreground">
                  {row.reported}
                </td>
                <td className="py-2.5 pr-5 text-right">
                  {row.yoy ? (
                    <DeltaPill value={row.yoy.value} format="percent" digits={1} hideZero={false} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
