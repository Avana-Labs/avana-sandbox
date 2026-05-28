"use client"

import * as React from "react"
import type { PoolDetail, AssetDetail } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

type Props = { detail: PoolDetail | AssetDetail; className?: string }

export function QuickStatsGrid({ detail, className }: Props) {
  const stats = detail.quickStats.slice(0, 6)
  return (
    <section aria-label="Stats" className={cn("flex flex-col gap-4", className)}>
      <h2 className="text-title-sm text-text-extra-high">Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden mb-px [&>*]:border-border-light [&>*:nth-child(even)]:border-l md:[&>*:nth-child(n+2)]:border-l max-md:[&>*:nth-child(n+3)]:border-t">
        {stats.map((stat) => (
          <div key={stat.id} className="pl-6 pr-6 py-5 first:pl-0 max-md:odd:pl-0">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-low">{stat.label}</div>
            <div className="font-data text-[15px] font-medium leading-tight tabular-nums text-text-extra-high">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
