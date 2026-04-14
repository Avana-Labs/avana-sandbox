"use client"

import { useState } from "react"
import { PageIntro } from "../components/page-intro"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  ChevronRight,
  Share2,
  History,
  Sparkles,
  Newspaper,
  TrendingUp,
  Bell,
  ExternalLink,
} from "lucide-react"
import { EnhancedGraph } from "../components/enhanced-graph"

// Mock data
const positions = [
  {
    id: 1,
    pool: "ETH-USDC",
    protocol: "Uniswap V3",
    chain: "Arbitrum",
    value: 2500,
    apr: 15.5,
    earned: 125.5,
    isUp: true,
    change: 2.3,
  },
  {
    id: 2,
    pool: "BTC-ETH",
    protocol: "Balancer",
    chain: "Ethereum",
    value: 3800,
    apr: 12.8,
    earned: 89.2,
    isUp: false,
    change: 1.2,
  },
]

const transactions = [
  {
    id: 1,
    type: "Deposit",
    amount: "1.5 ETH",
    value: "$2,850",
    timestamp: "2h ago",
    status: "completed",
  },
  {
    id: 2,
    type: "Reward Claim",
    amount: "250 USDC",
    value: "$250",
    timestamp: "1d ago",
    status: "completed",
  },
]

const newsItems = [
  {
    id: 1,
    category: "Protocol Update",
    title: "Uniswap V4 Hooks Live on Your Pool",
    description:
      "New hooks system is now available for ETH-USDC pool, enabling enhanced functionality and better yields.",
    timestamp: "10 minutes ago",
    protocol: "Uniswap",
    isImportant: true,
    link: "#",
    impact: "Positive",
  },
  {
    id: 2,
    category: "Market Alert",
    title: "ETH-USDC Pool TVL Reaches New ATH",
    description: "Your active pool has crossed $2.1B in total value locked, signaling strong market confidence.",
    timestamp: "1 hour ago",
    protocol: "Uniswap",
    isImportant: false,
    link: "#",
    impact: "Positive",
  },
  {
    id: 3,
    category: "Yield Update",
    title: "APY Increase in WBTC-ETH Pool",
    description: "Recent market volatility has led to a 2.3% increase in base yield for your position.",
    timestamp: "2 hours ago",
    protocol: "Curve",
    isImportant: true,
    link: "#",
    impact: "Positive",
  },
  {
    id: 4,
    category: "Security Notice",
    title: "Successful Security Audit Completed",
    description: "Your active pools have passed the quarterly security audit by Certik with no major findings.",
    timestamp: "3 hours ago",
    protocol: "Multiple",
    isImportant: true,
    link: "#",
    impact: "Neutral",
  },
  {
    id: 5,
    category: "Governance",
    title: "Vote on Fee Structure Change",
    description: "New proposal affecting ETH-USDC pool fee structure. Your voting power: 1.2k votes",
    timestamp: "5 hours ago",
    protocol: "Uniswap",
    isImportant: false,
    link: "#",
    impact: "Neutral",
  },
]

export default function PortfolioPage() {
  const [showClaimable, setShowClaimable] = useState(false)
  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
  const totalEarned = positions.reduce((sum, pos) => sum + pos.earned, 0)
  const averageAPR = positions.reduce((sum, pos) => sum + pos.apr, 0) / positions.length

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <PageIntro title="My portfolio" description="View your liquidity positions and manage earned rewards.">
            <Button size="sm" className="hidden items-center gap-2 md:flex">
              <Share2 className="h-3.5 w-3.5" />
              Share portfolio
            </Button>
          </PageIntro>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">${totalValue.toLocaleString()}</span>
                    <span className="text-sm text-emerald-600 flex items-center">
                      <ArrowUpRight className="h-4 w-4" />
                      2.5%
                    </span>
                  </div>
                </div>
                <div className="h-[60px] mt-2">
                  <EnhancedGraph isPositive={true} points={20} height={60} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Total APR</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{averageAPR.toFixed(1)}%</span>
                    <span className="text-sm text-rose-600 flex items-center">
                      <ArrowDownRight className="h-4 w-4" />
                      0.8%
                    </span>
                  </div>
                </div>
                <div className="h-[60px] mt-2">
                  <EnhancedGraph isPositive={false} points={20} height={60} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Total Earned</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">${totalEarned.toLocaleString()}</span>
                    <Button variant="outline" size="sm" className="h-6">
                      Claim
                    </Button>
                  </div>
                </div>
                <div className="h-[60px] mt-2">
                  <EnhancedGraph isPositive={true} points={20} height={60} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="positions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="positions" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Positions
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Rewards
              </TabsTrigger>
            </TabsList>

            {/* Positions Tab */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-medium">Active Positions</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show Claimable</span>
                  <Switch checked={showClaimable} onCheckedChange={setShowClaimable} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pool</TableHead>
                      <TableHead>Chain</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">APR</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{position.pool}</div>
                            <div className="text-sm text-muted-foreground">{position.protocol}</div>
                          </div>
                        </TableCell>
                        <TableCell>{position.chain}</TableCell>
                        <TableCell className="text-right">${position.value.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{position.apr}%</TableCell>
                        <TableCell className="text-right">${position.earned}</TableCell>
                        <TableCell className="text-right">
                          <span className={position.isUp ? "text-emerald-600" : "text-rose-600"}>
                            {position.isUp ? "+" : "-"}
                            {position.change}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activity Tab */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.value}</TableCell>
                        <TableCell>{tx.timestamp}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
                            {tx.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Rewards Tab */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Available Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Trading Fees</p>
                      <p className="text-sm text-muted-foreground">From your liquidity positions</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">$89.50</p>
                      <Button size="sm">Claim</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Staking Rewards</p>
                      <p className="text-sm text-muted-foreground">Protocol incentives</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">$45.20</p>
                      <Button size="sm">Claim</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Reward History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="flex items-center">
                      <Sparkles className="h-9 w-9 text-primary" />
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">Trading Fees Claimed</p>
                        <p className="text-sm text-muted-foreground">Jan 15, 2024</p>
                      </div>
                      <div className="ml-auto font-medium">+$250.00</div>
                    </div>
                    <div className="flex items-center">
                      <Gift className="h-9 w-9 text-primary" />
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">Referral Bonus</p>
                        <p className="text-sm text-muted-foreground">Jan 12, 2024</p>
                      </div>
                      <div className="ml-auto font-medium">+$50.00</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* News Feed Section - Moved inside tabs */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Latest Updates</h2>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Manage Alerts
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {newsItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden hover:shadow-md transition-all duration-200 h-[200px] flex flex-col"
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-start gap-4 h-full">
                        <div
                          className={`shrink-0 rounded-full p-2 h-8 ${
                            item.impact === "Positive"
                              ? "bg-emerald-50 text-emerald-600"
                              : item.impact === "Negative"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-muted-foreground truncate">
                                  {item.category}
                                </span>
                                {item.isImportant && (
                                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                                    Important
                                  </span>
                                )}
                              </div>
                              <h3 className="font-medium truncate">{item.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                              <a href={item.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground mt-auto">
                            <span>{item.protocol}</span>
                            <span>{item.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
