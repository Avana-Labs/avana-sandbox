"use client"

import { toast } from "sonner"
import { MultiplyHero } from "./components/multiply-hero"
import { MultiplyPartnersSection } from "./components/multiply-partners"
import { MultiplyLendSection } from "./components/multiply-lend-section"
import { MarketsTable } from "./components/markets-table"

export const MOCK_MARKETS = [
  { symbol: "ETH", name: "Ethereum", price: 3482, funding: 0.012, change: 2.4, volume: 1520000000, maxLeverage: 25, longOi: 62, shortOi: 38 },
  { symbol: "BTC", name: "Bitcoin", price: 87240, funding: -0.004, change: -0.8, volume: 3200000000, maxLeverage: 50, longOi: 48, shortOi: 52 },
  { symbol: "SOL", name: "Solana", price: 204.8, funding: 0.028, change: 5.1, volume: 850000000, maxLeverage: 15, longOi: 71, shortOi: 29 },
  { symbol: "ARB", name: "Arbitrum", price: 1.42, funding: 0.006, change: 1.2, volume: 120000000, maxLeverage: 10, longOi: 55, shortOi: 45 },
  { symbol: "OP", name: "Optimism", price: 2.84, funding: 0.009, change: 3.7, volume: 95000000, maxLeverage: 10, longOi: 58, shortOi: 42 },
]

export function MultiplyClient() {
  const handleMultiply = (symbol: string, side: "long" | "short") => {
    toast[side === "long" ? "success" : "info"](`${side === "long" ? "Long" : "Short"} ${symbol}`, {
      description: "Order ticket would open here.",
    })
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-[1152px]">
        <MultiplyHero markets={MOCK_MARKETS} />
        <MultiplyPartnersSection />
        <MultiplyLendSection />

        {/* BOTTOM: Full-width Markets then Positions/History (incl. Tx History tab) */}
        <div className="mt-12 space-y-8">
          <MarketsTable markets={MOCK_MARKETS} onMultiply={handleMultiply} />
        </div>
      </div>
    </main>
  )
}
