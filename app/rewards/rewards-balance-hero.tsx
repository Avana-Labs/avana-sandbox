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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <h2>My Rewards Balance</h2>
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
        <span className="font-data text-4xl font-semibold tracking-tight">
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
