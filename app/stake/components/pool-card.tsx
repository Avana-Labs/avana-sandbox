"use client"

import { ArrowDownRight, ArrowUpRight, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { StakePool } from "../stake.mock"

type PoolCardProps = {
  pool: StakePool
  isSelected?: boolean
  onClick: () => void
}

/** Selectable pool tile used in the stake wizard's pool-picker step. */
export function PoolCard({ pool, isSelected = false, onClick }: PoolCardProps) {
  return (
    <Card
      className={`group transition-colors border-border bg-surface-raised shadow-elev-1 hover:bg-surface-inset overflow-hidden cursor-pointer ${
        isSelected ? "ring-1 ring-accent-primary/40 border-accent-primary/40" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {pool.protocol}
            </span>
          </div>
          <div
            className={`font-data flex items-center gap-1 text-[11px] font-medium tabular-nums ${
              pool.isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {pool.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {pool.change.toFixed(1)}%
          </div>
        </div>

        <h3 className="text-[13px] font-medium mb-3 text-foreground">{pool.name}</h3>

        <div className="relative mb-3">
          <div className="font-data text-[22px] font-medium tabular-nums text-foreground mb-1">
            {pool.currentApy.toFixed(1)}%
          </div>
          <div className="h-[32px] -mx-1">
            <EnhancedGraph isPositive={pool.isUp} points={12} height={32} className="scale-110 origin-bottom" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">TVL</span>
            <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
              ${(pool.tvl / 1_000_000).toFixed(1)}M
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Your position
            </span>
            <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
              ${(pool.userPosition / 1_000).toFixed(1)}K
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-xs bg-accent-primary/60" />
            {pool.chain}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            5m ago
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
