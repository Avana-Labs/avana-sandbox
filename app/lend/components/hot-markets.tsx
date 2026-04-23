"use client"

import { TokenIcon } from "@/app/components/token-icon"
import { DeltaPill, FlashValue } from "@/app/components/ui/live"
import { cn } from "@/lib/utils"
import { MARKETS } from "./data"

type HotMarket = typeof MARKETS[number]

const HIDE_SCROLLBAR =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"

/**
 * Horizontally scrollable "Top Movers" card rail.
 * Inspired by the Toss Securities top-movers tiles: big logo, huge APY,
 * 24h delta pill. Ranked by |ΔAPY| so both rippers and dippers surface.
 */
export function HotMarkets({
  onSelect,
  limit = 6,
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
      <div className="mb-3">
        <h2 className="text-lg font-medium">Top movers</h2>
      </div>

      <div
        className={cn(
          "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2",
          HIDE_SCROLLBAR,
        )}
      >
        {ranked.map((m) => {
          const isUp = m.apyChange24h >= 0
          return (
            <button
              key={m.symbol}
              type="button"
              onClick={() => onSelect?.(m)}
              className={cn(
                "group relative flex w-[172px] shrink-0 snap-start flex-col justify-between",
                "rounded-2xl border border-border/40 bg-card/60 p-4 text-left",
                "transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
              )}
            >
              <div className="flex items-start justify-between">
                <TokenIcon symbol={m.symbol} size="lg" />
                {m.event ? (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Hot
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                <div className="truncate text-sm font-semibold text-foreground">
                  {m.symbol}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {m.protocol}
                </div>
              </div>

              <div className="mt-4">
                <FlashValue
                  value={m.apy}
                  goodDirection={isUp ? "up" : "down"}
                  className={cn(
                    "font-data text-3xl font-semibold leading-none tabular-nums",
                    isUp
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {m.apy.toFixed(2)}
                  <span className="ml-0.5 text-xl">%</span>
                </FlashValue>
                <div className="mt-2">
                  <DeltaPill
                    value={m.apyChange24h}
                    format="percent"
                    digits={2}
                    label="24h"
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
