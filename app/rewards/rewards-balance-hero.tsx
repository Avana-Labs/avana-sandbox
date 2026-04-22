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
      <div className="flex items-center gap-2 text-[12px] font-medium tracking-tight text-muted-foreground">
        <h2 className="m-0 leading-none">My Rewards Balance</h2>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          className="hover:text-foreground"
          aria-label={showBalance ? "Hide balance" : "Show balance"}
        >
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-data text-[1.45rem] font-semibold tracking-tight md:text-[1.8rem]">
          {showBalance
            ? `$${REWARDS_BALANCE_TOTAL.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "••••••••"}
        </span>
        <span className="text-sm font-medium text-emerald-500">
          +${REWARDS_GAIN_USD.toFixed(2)} ({REWARDS_GAIN_PCT.toFixed(2)}%)
        </span>
      </div>
    </div>
  )
}
