"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TokenIcon } from "@/app/components/token-icon"
import { BipolarBar, DeltaPill, FlashValue } from "@/app/components/ui/live"

function LongShortButtons({
  symbol,
  onTrade,
  size = "md",
}: {
  symbol: string
  onTrade?: (symbol: string, side: "long" | "short") => void
  size?: "sm" | "md"
}) {
  const sizeClass = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[12px]"
  return (
    <div className="inline-flex gap-1.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onTrade?.(symbol, "long")
        }}
        className={`${sizeClass} inline-flex items-center gap-1 rounded-full bg-emerald-500/10 font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400`}
      >
        <TrendingUp className="h-3 w-3" />
        Long
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onTrade?.(symbol, "short")
        }}
        className={`${sizeClass} inline-flex items-center gap-1 rounded-full bg-rose-500/10 font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400`}
      >
        <TrendingDown className="h-3 w-3" />
        Short
      </button>
    </div>
  )
}

type Market = {
  symbol: string
  name: string
  price: number
  funding: number
  change: number
  volume: number
  maxLeverage: number
  longOi: number
  shortOi: number
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function MarketsTable({
  markets,
  onTrade,
}: {
  markets: Market[]
  onTrade?: (symbol: string, side: "long" | "short") => void
}) {
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0)

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Markets</h2>
        <span className="text-[11px] text-muted-foreground">
          Avana 24h volume <span className="font-data tabular-nums text-foreground">{formatVolume(totalVolume)}</span>
        </span>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] table-fixed text-sm">
              <colgroup>
                <col className="w-auto" />
                <col className="w-[150px]" />
                <col className="w-[130px]" />
                <col className="w-[220px]" />
                <col className="w-[90px]" />
                <col className="w-[190px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="px-6 pb-3 pt-4 font-medium">Asset</th>
                  <th className="px-4 pb-3 pt-4 text-right font-medium">Price</th>
                  <th className="px-4 pb-3 pt-4 text-right font-medium">Volume</th>
                  <th className="px-4 pb-3 pt-4 text-right font-medium">Long / Short OI</th>
                  <th className="px-4 pb-3 pt-4 text-center font-medium">Max Lev</th>
                  <th className="px-6 pb-3 pt-4 text-right font-medium">Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {markets.map((m) => (
                  <tr key={m.symbol} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={m.symbol} size="lg" />
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span className="text-[14px] font-semibold text-foreground">{m.symbol}</span>
                          <span className="truncate text-xs text-muted-foreground">{m.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <FlashValue value={m.price} goodDirection="up" className="font-data tabular-nums">
                          ${m.price.toLocaleString("en-US")}
                        </FlashValue>
                        <DeltaPill value={m.change} format="percent" digits={2} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <FlashValue value={m.volume} goodDirection="up" className="font-data tabular-nums text-foreground">
                        {formatVolume(m.volume)}
                      </FlashValue>
                    </td>
                    <td className="px-4 py-4">
                      <div className="mx-auto w-[190px]">
                        <BipolarBar
                          leftValue={m.longOi}
                          rightValue={m.shortOi}
                          leftLabel={`${m.longOi}`}
                          rightLabel={`${m.shortOi}`}
                          leftClass="bg-emerald-500"
                          rightClass="bg-rose-500"
                          leftLabelClass="text-emerald-600 dark:text-emerald-400"
                          rightLabelClass="text-rose-600 dark:text-rose-400"
                          heightClass="h-1.5"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {m.maxLeverage}x
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <LongShortButtons symbol={m.symbol} onTrade={onTrade} size="sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-4 md:hidden p-4">
            {markets.map((m) => (
              <div key={m.symbol} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={m.symbol} size="md" />
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.symbol}</span>
                        <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                          {m.maxLeverage}x
                        </Badge>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">{m.name}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <FlashValue value={m.price} goodDirection="up" className="font-data text-sm tabular-nums">
                      ${m.price.toLocaleString("en-US")}
                    </FlashValue>
                    <DeltaPill value={m.change} format="percent" digits={2} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    Vol <span className="font-data text-foreground">{formatVolume(m.volume)}</span>
                  </span>
                  <div className="w-[55%] min-w-[140px]">
                    <BipolarBar
                      leftValue={m.longOi}
                      rightValue={m.shortOi}
                      leftLabel={`L ${m.longOi}`}
                      rightLabel={`S ${m.shortOi}`}
                      leftClass="bg-emerald-500"
                      rightClass="bg-rose-500"
                      leftLabelClass="text-emerald-600 dark:text-emerald-400"
                      rightLabelClass="text-rose-600 dark:text-rose-400"
                      heightClass="h-1.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <LongShortButtons symbol={m.symbol} onTrade={onTrade} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
