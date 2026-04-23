"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const REWARDS_BALANCE_TOTAL = 14_400
const REWARDS_GAIN_USD = 12.46
const REWARDS_GAIN_PCT = 4.52

export function RewardsBalanceHero() {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="mb-8 space-y-1">
      <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <h2 className="m-0 leading-none">My rewards balance</h2>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          className="hover:text-foreground"
          aria-label={showBalance ? "Hide balance" : "Show balance"}
        >
          {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-data text-[22px] font-medium tracking-tight md:text-[28px]">
          {showBalance
            ? `$${REWARDS_BALANCE_TOTAL.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "••••••••"}
        </span>
        <span className="font-data text-[12.5px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
          +${REWARDS_GAIN_USD.toFixed(2)} ({REWARDS_GAIN_PCT.toFixed(2)}%)
        </span>
      </div>
    </div>
  )
}
