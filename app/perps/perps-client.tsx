"use client"

import { PerpBalanceRow } from "./components/perp-balance-row"
import { BalanceChart } from "./components/balance-chart"
import { MarketsTable } from "./components/markets-table"
import { AccountTabs } from "./components/account-tabs"
import { Sidebar } from "./components/sidebar"

export const MOCK_MARKETS = [
  { symbol: "ETH", name: "Ethereum", price: 3482, funding: 0.012, change: 2.4, volume: 1520000000, maxLeverage: 25 },
  { symbol: "BTC", name: "Bitcoin", price: 87240, funding: -0.004, change: -0.8, volume: 3200000000, maxLeverage: 50 },
  { symbol: "SOL", name: "Solana", price: 204.8, funding: 0.028, change: 5.1, volume: 850000000, maxLeverage: 15 },
  { symbol: "ARB", name: "Arbitrum", price: 1.42, funding: 0.006, change: 1.2, volume: 120000000, maxLeverage: 10 },
  { symbol: "OP", name: "Optimism", price: 2.84, funding: 0.009, change: 3.7, volume: 95000000, maxLeverage: 10 },
]

export function PerpsClient() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Top Balance Row */}
        <PerpBalanceRow />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Column */}
          <div className="space-y-6 overflow-hidden">
            <BalanceChart />
            <MarketsTable markets={MOCK_MARKETS} />
            <AccountTabs />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <Sidebar />
          </div>
        </div>
      </div>
    </main>
  )
}
