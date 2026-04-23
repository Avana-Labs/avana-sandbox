"use client"

import * as React from "react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { SectionCard } from "../ui"

type Props = { detail: AssetDetail }

export function AllocationBreakdownCard({ detail }: Props) {
  if (detail.allocation.length === 0) {
    return (
      <SectionCard title="Allocation breakdown">
        <p className="text-sm text-muted-foreground">
          No pools currently expose {detail.hero.symbol} as a borrow asset.
        </p>
      </SectionCard>
    )
  }
  return (
    <SectionCard
      title="Allocation breakdown"
      subtitle={`Where ${detail.hero.symbol} is deployed across LP collateral pools.`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2.5 sm:px-6">Pool</th>
              <th className="px-2 py-2.5 text-right">Share</th>
              <th className="px-2 py-2.5 text-right">Value</th>
              <th className="px-2 py-2.5 text-right">Utilization</th>
              <th className="px-4 py-2.5 text-right sm:pr-6">Borrow APR</th>
            </tr>
          </thead>
          <tbody>
            {detail.allocation.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3.5 sm:pl-6">
                  <TokenPairCell visuals={row.visuals} name={row.poolName} subtitle={row.venueLabel} size="md" />
                </td>
                <td className="px-2 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-data text-sm font-semibold tabular-nums text-foreground">
                      {row.sharePct.toFixed(2)}%
                    </span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-foreground/50"
                        style={{ width: `${Math.min(100, row.sharePct)}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3.5 text-right font-data text-sm font-medium tabular-nums text-foreground">
                  {formatCompactUsd(row.valueUsd)}
                </td>
                <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-foreground">
                  {row.utilizationPct.toFixed(2)}%
                </td>
                <td className="px-4 py-3.5 text-right font-data text-sm tabular-nums text-foreground sm:pr-6">
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
