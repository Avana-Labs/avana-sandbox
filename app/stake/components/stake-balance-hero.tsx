"use client"

import { useState } from "react"
import { CirclePlus, Eye, EyeOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { STAKING_BALANCE } from "../stake.mock"

/** Compact balance hero shown at the top of the stake wizard. Mirrors lend/perps/rewards headers. */
export function StakeBalanceHero() {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <h2 className="m-0 leading-none">My staking balance</h2>
          <button
            type="button"
            onClick={() => setShowBalance((previous) => !previous)}
            className="hover:text-foreground"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-data text-[22px] font-medium tracking-tight md:text-[28px]">
            {showBalance
              ? `$${STAKING_BALANCE.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "••••••••"}
          </span>
          <span className="font-data text-[12.5px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            +${STAKING_BALANCE.gainUsd.toFixed(2)} ({STAKING_BALANCE.gainPct.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="gap-1.5">
          <CirclePlus className="h-3.5 w-3.5" />
          Stake more
        </Button>
        <Button type="button" variant="secondary" className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Unstake
        </Button>
      </div>
    </div>
  )
}
