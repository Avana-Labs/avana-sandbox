"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TokenIcon } from "@/app/components/token-icon"
import { BipolarBar, DeltaPill, FlashValue } from "@/app/components/ui/live"
import { MARKETS } from "./data"

type HotMarket = typeof MARKETS[number]

/**
 * Compact ranked feed of the most active lending markets.
 * Inspired by the Toss Securities volume-ranked list: logo, ticker, APY,
 * 24h delta pill, and a bipolar utilization bar.
 */
export function HotMarkets({
  onSelect,
  limit = 5,
}: {
  onSelect?: (market: HotMarket) => void
  limit?: number
}) {
  const ranked = [...MARKETS]
    .filter((market) => !market.soon)
    .sort((a, b) => Math.abs(b.apyChange24h) - Math.abs(a.apyChange24h))
    .slice(0, limit)

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Hot markets</h2>
        <span className="text-[11px] text-muted-foreground">Ranked by 24h APY move</span>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none">
        <CardContent className="p-0">
          <ul className="divide-y divide-border/40">
            {ranked.map((m) => {
              const borrowed = m.utilization
              const idle = Math.max(0, 100 - borrowed)
              const borrowedClass = borrowed >= 85 ? "bg-rose-500" : borrowed >= 60 ? "bg-amber-500" : "bg-emerald-500"
              return (
                <li
                  key={m.symbol}
                  className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  onClick={() => onSelect?.(m)}
                >
                  <TokenIcon symbol={m.symbol} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.symbol}</span>
                      <span className="truncate text-xs text-muted-foreground">{m.protocol}</span>
                    </div>
                    <div className="mt-1 max-w-[160px]">
                      <BipolarBar
                        leftValue={borrowed}
                        rightValue={idle}
                        leftClass={borrowedClass}
                        rightClass="bg-muted-foreground/20"
                        heightClass="h-1"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <FlashValue value={m.apy} goodDirection="up" className="font-data text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {m.apy.toFixed(2)}%
                    </FlashValue>
                    <DeltaPill value={m.apyChange24h} format="percent" digits={2} label="24h" />
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
