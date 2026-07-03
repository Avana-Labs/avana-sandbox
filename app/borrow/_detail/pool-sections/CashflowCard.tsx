"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { CashflowCard as CashflowCardData } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { SectionCard } from "../ui"
import { DeltaPill } from "@/app/components/ui/live/delta-pill"

// Structural prop (like QuickStatsGrid / RiskSection) so any detail view-model
// carrying a `cashflow: CashflowCard` (borrow pool, lend market) can reuse this.
type Props = { detail: { cashflow: CashflowCardData } }

export function CashflowCard({ detail }: Props) {
  const { cashflow } = detail
  const { t } = useTranslation()

  return (
    <SectionCard
      title={t("Cashflow breakdown")}
      subtitle={t("{period} · fees, incentives and protocol revenue.").replace("{period}", cashflow.periodLabel)}
      chrome="plain"
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <th className="pb-2 pl-5 pt-3">{t("Line")}</th>
              <th className="pb-2 pt-3 text-right">{t("Reported")}</th>
              <th className="pb-2 pr-5 pt-3 text-right">{t("YoY")}</th>
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
