"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  Bot,
  Calendar,
  Coins,
  HelpCircle,
  Shield,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type StakeCopilotProps = {
  currentStep: number
}

/** Right-rail copilot + quick-tips pair that reacts to the active step. */
export function StakeCopilot({ currentStep }: StakeCopilotProps) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-medium">
            <Bot className="h-3.5 w-3.5 text-accent-primary" />
            Copilot
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[12px] space-y-3 text-muted-foreground">
          {currentStep === 0 && (
            <>
              <p>Pick the pool where you want staking exposure. Consider:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Utilization and risk profile
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Base yield and fee history
                </li>
                <li className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  How much you already have deployed
                </li>
              </ul>
            </>
          )}
          {currentStep === 1 && (
            <>
              <p>Choose what you are staking into the pool:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Match the asset to the pool’s quoted pairs
                </li>
                <li className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Watch minimums and withdrawal cooldowns
                </li>
              </ul>
            </>
          )}
          {currentStep === 2 && (
            <>
              <p>Set how much you stake and for how long:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Larger stakes can change reward share and slippage
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Longer locks often earn higher reward multipliers
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
              <p>Review all details carefully. Staking may lock funds for the full period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TooltipProvider>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[13px] font-medium">
              <HelpCircle className="h-3.5 w-3.5 text-accent-primary" />
              Quick tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-3 py-2 rounded-radius-sm border border-border bg-surface-inset cursor-help">
                    <p className="text-[12.5px] font-medium text-foreground">Staking APR</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Estimated reward rate</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Illustrative APR from your stake size, lock length, and pool TVL—actual rewards depend on the live
                    program.
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-3 py-2 rounded-radius-sm border border-border bg-surface-inset cursor-help">
                    <p className="text-[12.5px] font-medium text-foreground">Lock period</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Funds committed for the term</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    While staked, principal may be unusable until the lock ends or you pay any early exit penalty the
                    protocol defines.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </motion.div>
  )
}
