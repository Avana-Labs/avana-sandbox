"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PageIntro } from "../components/page-intro"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bot,
  ChevronRight,
  Shield,
  Clock,
  Zap,
  HelpCircle,
  AlertTriangle,
  Coins,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EnhancedGraph } from "../components/enhanced-graph"

// Mock data for pools
const userPools = [
  {
    id: "1",
    name: "ETH-USDC",
    protocol: "Uniswap V3",
    chain: "Arbitrum",
    currentApy: 18.5,
    tvl: 3200000,
    volume24h: 1200000,
    userPosition: 250000,
    riskLevel: "Low",
    utilizationRate: 78,
    isUp: true,
    change: 3.2,
  },
  {
    id: "2",
    name: "WBTC-ETH",
    protocol: "Curve",
    chain: "Optimism",
    currentApy: 22.3,
    tvl: 2100000,
    volume24h: 750000,
    userPosition: 180000,
    riskLevel: "Medium",
    utilizationRate: 88,
    isUp: true,
    change: 4.5,
  },
]

const incentiveTokens = [
  { id: "usdc", name: "USDC", balance: "50,000" },
  { id: "eth", name: "ETH", balance: "25.5" },
  { id: "wbtc", name: "WBTC", balance: "1.8" },
]

const steps = ["Select Pool", "Choose Token", "Set Amount & Duration", "Review & Confirm"]

// Pool Card Component
function PoolCard({
  pool,
  isSelected = false,
  onClick,
}: {
  pool: (typeof userPools)[number]
  isSelected?: boolean
  onClick: () => void
}) {
  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 bg-white/50 backdrop-blur-sm overflow-hidden cursor-pointer ${
        isSelected ? "ring-1 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Protocol Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-compact text-xs font-medium text-muted-foreground">{pool.protocol}</span>
          </div>
          <div
            className={`font-data flex items-center gap-1 text-xs font-medium ${pool.isUp ? "text-emerald-600" : "text-rose-600"}`}
          >
            {pool.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {pool.change.toFixed(1)}%
          </div>
        </div>

        {/* Pool Name */}
        <h3 className="text-sm font-medium mb-3 text-foreground">{pool.name}</h3>

        {/* APY and Graph */}
        <div className="relative mb-3">
          <div className="font-data text-2xl font-bold text-foreground mb-1">{pool.currentApy.toFixed(1)}%</div>
          <div className="h-[32px] -mx-1">
            <EnhancedGraph isPositive={pool.isUp} points={12} height={32} className="scale-110 origin-bottom" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">TVL</span>
            <div className="font-data font-medium text-foreground">${(pool.tvl / 1000000).toFixed(1)}M</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Your Position</span>
            <div className="font-data font-medium text-foreground">${(pool.userPosition / 1000).toFixed(1)}K</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            {pool.chain}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            5m ago
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function IncentivePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [duration, setDuration] = useState("")
  const [showCopilot, setShowCopilot] = useState(true)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getSelectedPool = () => userPools.find((pool) => pool.id === selectedPool)
  const getSelectedToken = () => incentiveTokens.find((token) => token.id === selectedToken)

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <PageIntro
            title="Simulate"
            titleClassName="text-2xl font-semibold leading-tight tracking-tight md:text-3xl"
            description="Model incentives before committing capital."
            descriptionClassName="text-sm"
          >
            <Button variant="outline" size="sm" onClick={() => setShowCopilot(!showCopilot)} className="gap-2">
              <Bot className="h-3.5 w-3.5" />
              {showCopilot ? "Hide" : "Show"} Copilot
            </Button>
          </PageIntro>

          {/* Warning Card */}
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2 text-yellow-500">Important Notice</h3>
                  <p className="text-sm text-muted-foreground">
                    Incentives are usually provided by protocols. By continuing, you acknowledge that you understand the
                    mechanics of the protocol and that after depositing any rewards as incentives, you will not be able
                    to withdraw them.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Tracker */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">{steps[currentStep]}</span>
            </div>
            <Progress value={((currentStep + 1) / steps.length) * 100} />
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-7 gap-8">
            {/* Left Column - Main Interface */}
            <div className="md:col-span-5 space-y-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Pool Selection */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-lg font-semibold mb-4">Select pool to incentivize</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {userPools.map((pool) => (
                        <PoolCard
                          key={pool.id}
                          pool={pool}
                          isSelected={selectedPool === pool.id}
                          onClick={() => setSelectedPool(pool.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Token Selection */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg font-semibold mb-4">Choose incentive token</h2>
                    <Card>
                      <CardContent className="p-6 space-y-4">
                        <Select value={selectedToken || ""} onValueChange={setSelectedToken}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a token" />
                          </SelectTrigger>
                          <SelectContent>
                            {incentiveTokens.map((token) => (
                              <SelectItem key={token.id} value={token.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{token.name}</span>
                                  <span className="text-muted-foreground">Balance: {token.balance}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Step 3: Amount & Duration */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg font-semibold mb-4">Set amount & duration</h2>
                    <Card>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Incentive Amount</label>
                            <Input
                              type="text"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder={`Enter amount in ${getSelectedToken()?.name || "tokens"}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Duration (days)</label>
                            <Input
                              type="number"
                              value={duration}
                              onChange={(e) => setDuration(e.target.value)}
                              placeholder="Enter duration in days"
                              min="1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Step 4: Review & Confirm */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg font-semibold mb-4">Review & confirm</h2>
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Selected Pool</span>
                              <span className="font-semibold">{getSelectedPool()?.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Incentive Token</span>
                              <span className="font-semibold">{getSelectedToken()?.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Amount</span>
                              <span className="font-data font-semibold">
                                {amount} {getSelectedToken()?.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Duration</span>
                              <span className="font-data font-semibold">{duration} days</span>
                            </div>
                          </div>
                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between text-lg font-semibold">
                              <span>Estimated APR Boost</span>
                              <span className="font-data text-emerald-600">+{(Number(amount) * 0.1).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 0 && !selectedPool) ||
                    (currentStep === 1 && !selectedToken) ||
                    (currentStep === 2 && (!amount || !duration)) ||
                    currentStep === steps.length - 1
                  }
                >
                  {currentStep === steps.length - 1 ? "Confirm" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Right Column - Copilot & Info */}
            <div className="md:col-span-2">
              <AnimatePresence>
                {showCopilot && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Bot className="h-5 w-5" />
                          Copilot
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-4">
                        {currentStep === 0 && (
                          <>
                            <p>Choose the pool you want to incentivize. Consider:</p>
                            <ul className="space-y-2">
                              <li className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Current utilization rate
                              </li>
                              <li className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                Existing APY performance
                              </li>
                              <li className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-primary" />
                                Your position size
                              </li>
                            </ul>
                          </>
                        )}
                        {currentStep === 1 && (
                          <>
                            <p>Select a token for incentives:</p>
                            <ul className="space-y-2">
                              <li className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Choose tokens that align with your pool
                              </li>
                              <li className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-primary" />
                                Consider market demand
                              </li>
                            </ul>
                          </>
                        )}
                        {currentStep === 2 && (
                          <>
                            <p>Set your incentive parameters:</p>
                            <ul className="space-y-2">
                              <li className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-primary" />
                                Higher amounts attract more liquidity
                              </li>
                              <li className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Longer durations show commitment
                              </li>
                            </ul>
                          </>
                        )}
                        {currentStep === 3 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-yellow-600">
                              <AlertTriangle className="h-4 w-4" />
                              <p>Final confirmation required</p>
                            </div>
                            <p>Review all details carefully. This action cannot be reversed.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <TooltipProvider>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5" />
                            Quick Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-2 rounded-lg bg-muted cursor-help">
                                  <p className="text-sm font-medium">APR Boost</p>
                                  <p className="text-xs text-muted-foreground">Estimated yield increase</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  The estimated increase in APR based on your incentive amount and pool TVL.
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-2 rounded-lg bg-muted cursor-help">
                                  <p className="text-sm font-medium">Lock Period</p>
                                  <p className="text-xs text-muted-foreground">Incentives are locked</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Once deposited, incentives cannot be withdrawn and will be distributed over the
                                  specified duration.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipProvider>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
