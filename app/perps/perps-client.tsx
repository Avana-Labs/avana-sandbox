"use client"

import { useMemo, useState } from "react"
import { PageIntro } from "../components/page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const MARKETS = [
  { symbol: "ETH", name: "Ethereum", price: 3482, funding: 0.012, change: 2.4 },
  { symbol: "BTC", name: "Bitcoin", price: 87240, funding: -0.004, change: -0.8 },
  { symbol: "SOL", name: "Solana", price: 204.8, funding: 0.028, change: 5.1 },
  { symbol: "ARB", name: "Arbitrum", price: 1.42, funding: 0.006, change: 1.2 },
  { symbol: "OP", name: "Optimism", price: 2.84, funding: 0.009, change: 3.7 },
] as const

const LEVERAGE_OPTIONS = [2, 3, 5, 10, 15, 20, 25] as const

export function PerpsClient() {
  const [marketSymbol, setMarketSymbol] = useState("ETH")
  const [side, setSide] = useState<"long" | "short">("long")
  const [sizeInput, setSizeInput] = useState("1000")
  const [leverage, setLeverage] = useState(5)

  const market = useMemo(() => MARKETS.find((m) => m.symbol === marketSymbol)!, [marketSymbol])
  const size = Number.parseFloat(sizeInput) || 0
  const notional = size * leverage
  const liqDistance = 1 / leverage
  const liqPrice = side === "long"
    ? market.price * (1 - liqDistance * 0.9)
    : market.price * (1 + liqDistance * 0.9)
  const fundingCost = (notional * Math.abs(market.funding)) / 100

  const positions = [
    { symbol: "ETH", side: "Long" as const, entry: 3420, size: 5000, leverage: 5, pnl: 89.2, pnlPct: 1.78 },
    { symbol: "SOL", side: "Short" as const, entry: 212.4, size: 2000, leverage: 3, pnl: -24.6, pnlPct: -1.23 },
  ]

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PageIntro title="Perps" description="LP-backed leverage and directional overlays.">
            <Badge variant="secondary">Phase 2</Badge>
          </PageIntro>

          {/* Market selector — pill strip like homepage tabs */}
          <div className="mb-8 flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <Button
                key={m.symbol}
                size="sm"
                variant={m.symbol === marketSymbol ? "default" : "outline"}
                onClick={() => setMarketSymbol(m.symbol)}
                className="gap-1.5"
              >
                {m.symbol}
                <span className={`text-xs ${m.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {m.change >= 0 ? "+" : ""}{m.change}%
                </span>
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* Price + positions column */}
            <div className="space-y-4">
              {/* Price header */}
              <Card className="overflow-hidden border-border/60 bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{market.name} Perpetual</p>
                      <p className="text-3xl font-bold">${market.price.toLocaleString("en-US")}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${market.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {market.change >= 0 ? "+" : ""}{market.change}%
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Funding {market.funding >= 0 ? "+" : ""}{market.funding}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Open positions */}
              <Card className="overflow-hidden border-border/60 bg-card">
                <CardContent className="pt-6">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Open positions</p>
                  <div className="space-y-3">
                    {positions.map((pos) => (
                      <div key={`${pos.symbol}-${pos.side}`} className="flex items-center justify-between rounded-md border border-border/60 p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{pos.symbol}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                pos.side === "Long"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}
                            >
                              {pos.side} {pos.leverage}x
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Entry ${pos.entry.toLocaleString()} · ${pos.size.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${pos.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                          </p>
                          <p className={`text-xs ${pos.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order form */}
            <Card className="overflow-hidden border-border/60 bg-card">
              <CardContent className="space-y-4 p-4 pt-6">
                {/* Long / Short */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={side === "long" ? "default" : "outline"}
                    onClick={() => setSide("long")}
                    className={side === "long" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    Long
                  </Button>
                  <Button
                    variant={side === "short" ? "default" : "outline"}
                    onClick={() => setSide("short")}
                    className={side === "short" ? "bg-rose-600 hover:bg-rose-700" : ""}
                  >
                    Short
                  </Button>
                </div>

                {/* Size input */}
                <div className="rounded-md border border-border/60 bg-muted/50 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Size</span>
                    <span>Balance: $48,250</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/40"
                      placeholder="0"
                    />
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">USDC</span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {[100, 500, 1000, 5000].map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={sizeInput === String(v) ? "default" : "outline"}
                        onClick={() => setSizeInput(String(v))}
                        className="h-7 flex-1 text-xs"
                      >
                        ${v.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Leverage */}
                <div className="rounded-md border border-border/60 bg-muted/50 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Leverage</span>
                    <span className="text-sm font-bold text-foreground">{leverage}x</span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {LEVERAGE_OPTIONS.map((lv) => (
                      <Button
                        key={lv}
                        size="sm"
                        variant={leverage === lv ? "default" : "outline"}
                        onClick={() => setLeverage(lv)}
                        className="h-7 flex-1 text-xs"
                      >
                        {lv}x
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Computed values */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notional</span>
                    <span className="font-medium">${notional.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liq. price</span>
                    <span className="font-medium">${liqPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Funding / 8h</span>
                    <span className={`font-medium ${market.funding >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ${fundingCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-medium">${(notional * 0.0006).toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  className={`h-11 w-full ${
                    side === "long"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  disabled={size === 0}
                >
                  {size === 0
                    ? "Enter size"
                    : `${side === "long" ? "Long" : "Short"} ${market.symbol} — ${leverage}x`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
