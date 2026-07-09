"use client"

import { HeroBalanceDisplay } from "@/app/components/charts/hero-balance-display"

// TODO(backend): wire these to the user's real Avana balance.
const AVANA_BALANCE = "$14,400.00"
const AVANA_BALANCE_DELTA = "-$312.96 (-3.80%)"

export function PortfolioHeroHeader() {
  return (
    <div className="mb-4 sm:mb-6">
      <HeroBalanceDisplay
        label="User Avana balance"
        value={AVANA_BALANCE}
        delta={AVANA_BALANCE_DELTA}
        deltaTone="negative"
        meta="Today"
      />
    </div>
  )
}
