"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { SectionCard } from "../ui"
import { DeltaPill } from "@/app/components/ui/live/delta-pill"

type Props = { detail: AssetDetail }

export function AssetCashflowCard({ detail }: Props) {
  const { cashflow } = detail
  const { t } = useTranslation()
  return (
    <SectionCard
      title={t("Interest & rewards")}
      subtitle={t("{period} · borrower interest, LP incentives and reserve take.").replace("{period}", cashflow.periodLabel)}
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
                  "transition-colors hover:bg-hover",
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
