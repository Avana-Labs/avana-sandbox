"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { SectionCard } from "../ui"
import { DeltaPill } from "@/app/components/ui/live/delta-pill"

type Props = { detail: AssetDetail }

export function AssetCashflowCard({ detail }: Props) {
  const { cashflow } = detail
  return (
    <SectionCard
      title="Interest & rewards"
      subtitle={`${cashflow.periodLabel} · borrower interest, LP incentives and reserve take.`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-muted-foreground">
              <th className="pb-3 pl-6 pt-4 font-medium">Line</th>
              <th className="pb-3 pt-4 text-right font-medium">Reported</th>
              <th className="pb-3 pr-6 pt-4 text-right font-medium">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {cashflow.rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "transition-colors hover:bg-muted/50",
                  row.highlighted ? "bg-muted/30" : undefined,
                )}
              >
                <th scope="row" className="py-3 pl-6 text-left font-medium text-foreground">
                  {row.label}
                </th>
                <td className="py-3 text-right font-data font-medium tabular-nums text-foreground">
                  {row.reported}
                </td>
                <td className="py-3 pr-6 text-right">
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
