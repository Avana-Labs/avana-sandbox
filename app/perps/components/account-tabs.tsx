"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PillTabButton } from "@/components/ui/pill-tab-button"
import { TokenIcon } from "@/app/components/token-icon"
import { DeltaPill, FlashValue } from "@/app/components/ui/live"
import { TransactionHistoryList } from "./sidebar"

const TABS = ["LP Collaterals", "Positions", "Open Orders", "TWAP", "History"] as const
type Tab = typeof TABS[number]

function PositionRow({
  symbol,
  label,
  side,
  leverage,
  pnlUsd,
  pnlPct,
}: {
  symbol: string
  label: string
  side: "long" | "short"
  leverage: number
  pnlUsd: number
  pnlPct: number
}) {
  const isLong = side === "long"
  const sideTint = isLong ? "bg-emerald-500" : "bg-rose-500"
  const sidePillClass = isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
  const pnlClass = pnlUsd >= 0 ? "text-emerald-500" : "text-rose-500"
  const pnlPrefix = pnlUsd >= 0 ? "+" : "−"
  const absPnl = Math.abs(pnlUsd).toFixed(2)

  return (
    <div className="relative flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2 pl-4 transition-colors hover:bg-muted/40">
      <span className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full ${sideTint}`} aria-hidden />
      <div className="flex items-center gap-3">
        <TokenIcon symbol={symbol} size="md" />
        <span className="font-medium text-sm">{label}</span>
        <span className={`text-[10px] uppercase ${sidePillClass} px-1.5 py-0.5 rounded`}>
          {isLong ? "Long" : "Short"} {leverage}x
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <FlashValue value={pnlUsd} goodDirection="up" className={`text-sm font-data tabular-nums ${pnlClass}`}>
          {`${pnlPrefix}$${absPnl}`}
        </FlashValue>
        <DeltaPill value={pnlPct} format="percent" digits={2} goodDirection="up" />
      </div>
    </div>
  )
}

export function AccountTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("Positions")

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">My Positions</h2>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex space-x-1 overflow-x-auto">
          {TABS.map((tab) => (
            <PillTabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </PillTabButton>
          ))}
        </div>
      </div>
      <CardContent className="p-6">
        {activeTab === "Open Orders" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No open orders</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here once submitted.</p>
          </div>
        ) : activeTab === "Positions" ? (
          <div className="space-y-2">
            <PositionRow symbol="ETH" label="ETH-PERP" side="long" leverage={5} pnlUsd={89.2} pnlPct={1.78} />
            <PositionRow symbol="SOL" label="SOL-PERP" side="short" leverage={3} pnlUsd={-24.6} pnlPct={-1.23} />
          </div>
        ) : activeTab === "LP Collaterals" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <TokenIcon symbol="ETH" size="md" ring />
                  <TokenIcon symbol="USDC" size="md" ring className="-ml-2" />
                </div>
                <div>
                  <p className="font-medium text-sm">ETH/USDC (Uniswap V3)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Health: 84%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-data">$14,500.00</p>
                <p className="text-xs text-muted-foreground">Deposited</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <TokenIcon symbol="wstETH" size="md" ring />
                  <TokenIcon symbol="WETH" size="md" ring className="-ml-2" />
                </div>
                <div>
                  <p className="font-medium text-sm">wstETH/WETH (Aerodrome)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Health: 92%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-data">$22,100.00</p>
                <p className="text-xs text-muted-foreground">Deposited</p>
              </div>
            </div>
          </div>
        ) : activeTab === "TWAP" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No active TWAP orders</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Time-weighted average price orders appear here.</p>
          </div>
        ) : (
          <TransactionHistoryList />
        )}
      </CardContent>
    </Card>
    </div>
  )
}
