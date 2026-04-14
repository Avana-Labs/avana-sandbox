"use client"

import { useCallback, useMemo, useState } from "react"
import { ArrowDownUp, Info, Shield, TrendingUp, Wallet } from "lucide-react"
import { PageIntro } from "../components/page-intro"
import { StaticSparkline } from "../components/static-sparkline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", balance: 48_250.0, price: 1.0 },
  { symbol: "USDT", name: "Tether", balance: 12_800.0, price: 1.0 },
  { symbol: "ETH", name: "Ethereum", balance: 14.2, price: 3_482.0 },
  { symbol: "DAI", name: "Dai", balance: 5_600.0, price: 1.0 },
] as const

const SLEEVES = [
  { id: "core", name: "Core Yield", apy: 7.2, tvl: "$14.8M", utilization: 72, risk: "Low", icon: Shield, seed: "invest-core", positive: true },
  { id: "growth", name: "Growth", apy: 12.8, tvl: "$6.2M", utilization: 58, risk: "Medium", icon: TrendingUp, seed: "invest-growth", positive: true },
  { id: "reserve", name: "Reserve", apy: 4.4, tvl: "$3.6M", utilization: 34, risk: "Low", icon: Wallet, seed: "invest-reserve", positive: false },
] as const

const MARKETS = [
  { pool: "ETH / USDC", protocol: "Uniswap", chain: "Ethereum", apy: 8.1, tvl: "$42M", utilization: 76 },
  { pool: "wstETH / ETH", protocol: "Balancer", chain: "Arbitrum", apy: 7.3, tvl: "$28M", utilization: 68 },
  { pool: "crvUSD / USDC", protocol: "Curve", chain: "Base", apy: 6.8, tvl: "$19M", utilization: 54 },
  { pool: "ETH / USDbC", protocol: "Aerodrome", chain: "Base", apy: 12.4, tvl: "$8.4M", utilization: 82 },
  { pool: "WBTC / ETH", protocol: "Uniswap", chain: "Ethereum", apy: 5.9, tvl: "$36M", utilization: 61 },
  { pool: "USDC / DAI", protocol: "Curve", chain: "Ethereum", apy: 4.2, tvl: "$52M", utilization: 45 },
] as const

type SleeveId = (typeof SLEEVES)[number]["id"]

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="inline h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function InvestClient() {
  const [token, setToken] = useState<string>("USDC")
  const [sleeveId, setSleeveId] = useState<SleeveId>("core")
  const [pct, setPct] = useState([25])
  const [tab, setTab] = useState("supply")
  const [sortApy, setSortApy] = useState(false)

  const selectedToken = useMemo(() => TOKENS.find((t) => t.symbol === token)!, [token])
  const sleeve = useMemo(() => SLEEVES.find((s) => s.id === sleeveId)!, [sleeveId])

  const amount = useMemo(() => {
    const usdBalance = selectedToken.balance * selectedToken.price
    return usdBalance * (pct[0] / 100)
  }, [selectedToken, pct])

  const projectedYield = useMemo(() => ({
    daily: (amount * sleeve.apy) / 100 / 365,
    monthly: (amount * sleeve.apy) / 100 / 12,
    yearly: (amount * sleeve.apy) / 100,
  }), [amount, sleeve.apy])

  const sortedMarkets = useMemo(() => {
    const m = [...MARKETS]
    if (sortApy) m.sort((a, b) => b.apy - a.apy)
    return m
  }, [sortApy])

  const toggleSort = useCallback(() => setSortApy((v) => !v), [])

  const totalSupplied = useMemo(
    () => TOKENS.reduce((sum, t) => sum + t.balance * t.price, 0),
    [],
  )

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PageIntro title="Invest" description="Supply capital across LP-backed sleeves and earn yield." />

          {/* Portfolio strip — matches homepage metric cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Net worth", value: `$${totalSupplied.toLocaleString("en-US", { maximumFractionDigits: 0 })}` },
              { label: "Net APY", value: "8.7%", highlight: true },
              { label: "Health factor", value: "2.14" },
              { label: "Positions", value: "3" },
            ].map((stat) => (
              <Card key={stat.label} className="overflow-hidden border-border/60 bg-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`font-data text-2xl font-bold ${stat.highlight ? "text-emerald-600" : ""}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_380px]">
            {/* Supply / Withdraw form */}
            <Card className="overflow-hidden border-border/60 bg-card">
              <CardContent className="space-y-5 p-4 pt-6">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="supply" className="flex-1">Supply</TabsTrigger>
                    <TabsTrigger value="withdraw" className="flex-1">Withdraw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="supply" className="space-y-5">
                    <div className="rounded-md border border-border/60 bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <Select value={token} onValueChange={setToken}>
                          <SelectTrigger className="w-[160px] border-border/60 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((t) => (
                              <SelectItem key={t.symbol} value={t.symbol}>
                                {t.symbol} — {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-right">
                          <p className="font-data text-2xl font-bold">
                            {selectedToken.symbol === "ETH"
                              ? (amount / selectedToken.price).toFixed(4)
                              : amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ≈ ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Slider value={pct} onValueChange={setPct} max={100} step={1} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{pct[0]}% of balance</span>
                          <span>
                            Wallet: {selectedToken.balance.toLocaleString("en-US", { maximumFractionDigits: selectedToken.symbol === "ETH" ? 4 : 0 })} {selectedToken.symbol}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {[25, 50, 75, 100].map((v) => (
                            <Button
                              key={v}
                              size="sm"
                              variant={pct[0] === v ? "default" : "outline"}
                              onClick={() => setPct([v])}
                              className="h-7 text-xs"
                            >
                              {v}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Sleeve <InfoTip text="Capital sleeves route your supply into different risk/return profiles." />
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {SLEEVES.map((s) => {
                          const Icon = s.icon
                          const active = s.id === sleeveId
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSleeveId(s.id)}
                              className={`rounded-md border p-3 text-left transition-colors ${
                                active
                                  ? "border-primary bg-primary/5"
                                  : "border-border/60 hover:border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-sm font-medium">{s.name}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="font-data text-lg font-bold text-emerald-600">{s.apy}%</span>
                                <Badge variant="outline" className="text-[10px]">{s.risk}</Badge>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="rounded-md border border-border/60 bg-muted/50 p-4">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Projected yield <InfoTip text="Estimates based on current sleeve APY. Not guaranteed." />
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Daily</p>
                          <p className="font-data font-bold">${projectedYield.daily.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                          <p className="font-data font-bold">${projectedYield.monthly.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Yearly</p>
                          <p className="font-data font-bold">${projectedYield.yearly.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sleeve APY</span>
                        <span className="font-data font-medium text-emerald-600">{sleeve.apy}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-data font-medium">{sleeve.utilization}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">TVL</span>
                        <span className="font-data font-medium">{sleeve.tvl}</span>
                      </div>
                    </div>

                    <Button className="h-11 w-full" disabled={amount === 0}>
                      {amount === 0 ? "Enter an amount" : `Supply ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${selectedToken.symbol}`}
                    </Button>
                  </TabsContent>

                  <TabsContent value="withdraw" className="space-y-5">
                    <div className="rounded-md border border-border/60 bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <Select value={token} onValueChange={setToken}>
                          <SelectTrigger className="w-[160px] border-border/60 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((t) => (
                              <SelectItem key={t.symbol} value={t.symbol}>
                                {t.symbol} — {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-right">
                          <p className="font-data text-2xl font-bold">
                            {amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supplied in {sleeve.name}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Slider value={pct} onValueChange={setPct} max={100} step={1} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{pct[0]}%</span>
                          <span>Available: {selectedToken.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })} {selectedToken.symbol}</span>
                        </div>
                      </div>
                    </div>
                    <Button className="h-11 w-full" variant="outline" disabled={amount === 0}>
                      {amount === 0 ? "Enter an amount" : `Withdraw ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${selectedToken.symbol}`}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Sleeve detail + position */}
            <div className="space-y-4">
              <Card className="overflow-hidden border-border/60 bg-card">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{sleeve.name}</h3>
                    <Badge variant="outline">{sleeve.risk} risk</Badge>
                  </div>
                  <div className="h-[60px] -mx-6">
                    <StaticSparkline seed={sleeve.seed} isPositive={sleeve.positive} points={24} height={60} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">APY</p>
                      <p className="font-data font-bold text-emerald-600">{sleeve.apy}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">TVL</p>
                      <p className="font-data font-bold">{sleeve.tvl}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Util.</p>
                      <p className="font-data font-bold">{sleeve.utilization}%</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="font-data font-medium">{sleeve.utilization}%</span>
                    </div>
                    <Progress value={sleeve.utilization} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/60 bg-card">
                <CardContent className="space-y-3 pt-6">
                  <h3 className="text-sm font-medium">Your position</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplied</span>
                      <span className="font-data font-medium">${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Earned (all time)</span>
                      <span className="font-data font-medium text-emerald-600">$1,240</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending rewards</span>
                      <span className="font-data font-medium">$84.20</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Claim rewards
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Markets table */}
          <Card className="overflow-hidden border-border/60 bg-card">
            <CardContent className="p-4 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Markets</h2>
                <button onClick={toggleSort} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  {sortApy ? "Default order" : "Sort by APY"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left font-compact text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">Pool</th>
                      <th className="pb-3 font-medium">Protocol</th>
                      <th className="pb-3 font-medium">Chain</th>
                      <th className="pb-3 text-right font-medium">APY</th>
                      <th className="pb-3 text-right font-medium">TVL</th>
                      <th className="pb-3 text-right font-medium">Util.</th>
                      <th className="pb-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMarkets.map((m) => (
                      <tr key={m.pool} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium">{m.pool}</td>
                        <td className="py-3 text-muted-foreground">{m.protocol}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px]">{m.chain}</Badge>
                        </td>
                        <td className="font-data py-3 text-right font-medium text-emerald-600">{m.apy}%</td>
                        <td className="font-data py-3 text-right">{m.tvl}</td>
                        <td className="font-data py-3 text-right">{m.utilization}%</td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Supply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
