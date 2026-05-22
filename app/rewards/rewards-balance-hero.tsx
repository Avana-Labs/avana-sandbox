"use client"

import { useDisplayPreferences } from "@/app/components/display-preferences"

const REWARDS_BALANCE_TOTAL = 14_400
const REWARDS_GAIN_USD = 12.46
const REWARDS_GAIN_PCT = 4.52

export function RewardsBalanceHero() {
  const { showDollarAmounts } = useDisplayPreferences()

  return (
    <div className="mb-8 space-y-1">
      <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        <h2 className="m-0 leading-none">My rewards balance</h2>
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-data text-[22px] font-medium tracking-tight md:text-[28px]">
          {showDollarAmounts
            ? `$${REWARDS_BALANCE_TOTAL.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "••••••••"}
        </span>
        <span className="font-data text-[12.5px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
          {showDollarAmounts ? `+${REWARDS_GAIN_USD.toFixed(2)} (${REWARDS_GAIN_PCT.toFixed(2)}%)` : "••••••••"}
        </span>
      </div>
    </div>
  )
}
