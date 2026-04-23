"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PoolCard } from "./components/pool-card"
import { StakeProgressTracker } from "./components/stake-progress-tracker"
import { StakeCopilot } from "./components/stake-copilot"
import { stakeAssets, stakePools, stakeSteps } from "./stake.mock"

/**
 * Owns all wizard state (step, pool, token, amount, duration) and composes the
 * focused step panels + the copilot sidebar. The page shell stays server-rendered.
 */
export function StakeWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [duration, setDuration] = useState("")

  const handleNext = () => {
    if (currentStep < stakeSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getSelectedPool = () => stakePools.find((pool) => pool.id === selectedPool)
  const getSelectedAsset = () => stakeAssets.find((asset) => asset.id === selectedToken)

  const isContinueDisabled =
    (currentStep === 0 && !selectedPool) ||
    (currentStep === 1 && !selectedToken) ||
    (currentStep === 2 && (!amount || !duration)) ||
    currentStep === stakeSteps.length - 1

  return (
    <>
      <StakeProgressTracker currentStep={currentStep} />

      <div className="grid md:grid-cols-7 gap-8">
        <div className="md:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-pool"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <h2 className="text-[14px] font-medium tracking-tight text-foreground mb-3">
                  Select pool to stake into
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {stakePools.map((pool) => (
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

            {currentStep === 1 && (
              <motion.div
                key="step-asset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <h2 className="text-[14px] font-medium tracking-tight text-foreground mb-3">Choose asset to stake</h2>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <Select value={selectedToken || ""} onValueChange={setSelectedToken}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a token" />
                      </SelectTrigger>
                      <SelectContent>
                        {stakeAssets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{asset.name}</span>
                              <span className="text-muted-foreground">Balance: {asset.balance}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-amount"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <h2 className="text-[14px] font-medium tracking-tight text-foreground mb-3">
                  Set stake amount & lock period
                </h2>
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Stake amount</label>
                        <Input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Enter amount in ${getSelectedAsset()?.name || "tokens"}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Lock period (days)</label>
                        <Input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="How long assets stay staked"
                          min="1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <h2 className="text-[14px] font-medium tracking-tight text-foreground mb-3">Review & confirm</h2>
                <Card>
                  <CardContent className="p-5">
                    <div className="space-y-5">
                      <div className="grid gap-2.5 text-[12.5px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Selected pool</span>
                          <span className="font-medium text-foreground">{getSelectedPool()?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Staking asset</span>
                          <span className="font-medium text-foreground">{getSelectedAsset()?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-data font-medium tabular-nums text-foreground">
                            {amount} {getSelectedAsset()?.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Lock period</span>
                          <span className="font-data font-medium tabular-nums text-foreground">{duration} days</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-[13px] font-medium">
                          <span className="text-foreground">Estimated staking APR</span>
                          <span className="font-data tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{(Number(amount) * 0.1).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={isContinueDisabled}>
              {currentStep === stakeSteps.length - 1 ? "Confirm" : "Continue"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <StakeCopilot currentStep={currentStep} />
        </div>
      </div>
    </>
  )
}
