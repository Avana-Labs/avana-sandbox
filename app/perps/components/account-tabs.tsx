"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

const TABS = ["LP Collaterals", "Positions", "Open Orders", "TWAP", "History"] as const
type Tab = typeof TABS[number]

export function AccountTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("Positions")
  const [hideSmall, setHideSmall] = useState(false)

  return (
    <Card className="border-border/40 bg-card/50 shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex space-x-1 overflow-x-auto">
          {TABS.map(tab => (
            <Button
              key={tab}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 text-xs font-medium ${
                activeTab === tab
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox 
            id="hide-small" 
            checked={hideSmall} 
            onCheckedChange={(c) => setHideSmall(c as boolean)} 
          />
          <label htmlFor="hide-small" className="cursor-pointer">Hide small balances</label>
        </div>
      </div>
      <CardContent className="p-6">
        {activeTab === "Open Orders" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No open orders</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here once submitted.</p>
          </div>
        ) : activeTab === "Positions" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">ETH-PERP</span>
                <span className="text-[10px] uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">Long 5x</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-data">+$89.20</p>
                <p className="text-xs text-emerald-500">+1.78%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">SOL-PERP</span>
                <span className="text-[10px] uppercase bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded">Short 3x</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-data">-$24.60</p>
                <p className="text-xs text-rose-500">-1.23%</p>
              </div>
            </div>
          </div>
        ) : activeTab === "LP Collaterals" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div>
                <p className="font-medium text-sm">ETH/USDC (Uniswap V3)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Health: 84%</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-data">$14,500.00</p>
                <p className="text-xs text-muted-foreground">Deposited</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div>
                <p className="font-medium text-sm">wstETH/WETH (Aerodrome)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Health: 92%</p>
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
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No history available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your past trades and funding payments will be listed here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
