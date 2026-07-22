"use client"

import * as React from "react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { SectionCard } from "../ui"

type Props = { detail: AssetDetail; id?: string }

export function AllocationBreakdownCard({ detail, id }: Props) {
  const { t } = useTranslation()
  if (detail.allocation.length === 0) {
    return (
      <SectionCard title={t("Allocation breakdown")}>
        <p className="text-sm text-muted-foreground">
          {t("No pools currently expose {symbol} as a borrow asset.").replace("{symbol}", detail.hero.symbol)}
        </p>
      </SectionCard>
    )
  }
  return (
    <SectionCard
      id={id}
      title={t("Allocation breakdown")}
      subtitle={t("Where {symbol} is deployed across LP collateral pools.").replace("{symbol}", detail.hero.symbol)}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-4 py-2 sm:px-5">{t("Pool")}</th>
              <th className="px-2 py-2 text-right">{t("Share")}</th>
              <th className="px-2 py-2 text-right">{t("Value")}</th>
              <th className="px-2 py-2 text-right">{t("Utilization")}</th>
              <th className="px-4 py-2 text-right sm:pr-5">{t("Borrow APR")}</th>
            </tr>
          </thead>
          <tbody>
            {detail.allocation.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-hover">
                <td className="px-4 py-2.5 sm:pl-5">
                  <TokenPairCell visuals={row.visuals} name={row.poolName} subtitle={row.venueLabel} size="md" />
                </td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-1 w-16 overflow-hidden rounded-xs bg-surface-inset">
                      <span
                        className="block h-full rounded-xs bg-accent-primary"
                        style={{ width: `${Math.min(100, row.sharePct)}%` }}
                      />
                    </span>
                    <span className="font-data text-[12.5px] font-medium tabular-nums text-foreground">
                      {row.sharePct.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right font-data text-[12.5px] font-medium tabular-nums text-foreground">
                  {formatCompactUsd(row.valueUsd)}
                </td>
                <td className="px-2 py-2.5 text-right font-data text-[12.5px] tabular-nums text-foreground">
                  {row.utilizationPct.toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right font-data text-[12.5px] tabular-nums text-foreground sm:pr-5">
                  {row.borrowAprPct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
