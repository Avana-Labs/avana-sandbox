"use client"

import * as React from "react"
import type { PoolDetail, AssetDetail } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

type Props = { detail: PoolDetail | AssetDetail; className?: string }

export function QuickStatsGrid({ detail, className }: Props) {
  const stats = detail.quickStats.slice(0, 6)
  return (
    <section aria-label="Stats" className={cn("flex flex-col gap-6", className)}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">Stats</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.id} className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="font-data text-[1.05rem] font-medium leading-tight tabular-nums text-foreground md:text-[1.15rem]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
