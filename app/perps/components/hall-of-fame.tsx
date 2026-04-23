"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Entry = {
  symbol: string
  pair: string
  maxLeverage: number
  art: string
  tint: string
  accentText: string
}

const ENTRIES: Entry[] = [
  {
    symbol: "BTC",
    pair: "BTC / USDC",
    maxLeverage: 50,
    art: "/perps-hof/btc-stack.png",
    tint: "from-orange-400/30 via-orange-300/10 to-transparent",
    accentText: "text-orange-600 dark:text-orange-400",
  },
  {
    symbol: "ETH",
    pair: "ETH / USDC",
    maxLeverage: 25,
    art: "/perps-hof/eth-stack.png",
    tint: "from-blue-400/30 via-blue-300/10 to-transparent",
    accentText: "text-blue-600 dark:text-blue-400",
  },
  {
    symbol: "XRP",
    pair: "XRP / USDT",
    maxLeverage: 20,
    art: "/perps-hof/xrp-stack.png",
    tint: "from-slate-400/30 via-slate-300/10 to-transparent",
    accentText: "text-slate-600 dark:text-slate-300",
  },
]

export function HallOfFame() {
  const [index, setIndex] = useState(0)
  const active = ENTRIES[index]

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % ENTRIES.length), 5000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", active.tint)} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-10 z-0">
        <Image
          key={active.symbol}
          src={active.art}
          alt={active.symbol}
          fill
          className="animate-in fade-in zoom-in-95 object-contain object-bottom duration-500"
          sizes="360px"
          priority
        />
      </div>

      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="flex items-baseline gap-2">
          <div className={cn("font-data text-[44px] font-medium leading-none tracking-tight", active.accentText)}>
            {active.maxLeverage}
            <span className="text-[32px] font-medium">×</span>
          </div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{active.pair}</div>
        </div>

        <div className="mt-auto flex items-center justify-center gap-1.5">
          {ENTRIES.map((entry, i) => (
            <button
              key={entry.symbol}
              type="button"
              aria-label={`Show ${entry.symbol}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1 rounded-xs transition-all",
                i === index ? "w-4 bg-foreground" : "w-1 bg-muted-foreground/40 hover:bg-muted-foreground/60",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
