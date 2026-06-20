"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { LendActionBox } from "./lend-action-box"

export function LendMarketActionDialog({
  open,
  onOpenChange,
  marketId,
  initialAction = "deposit",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketId: string
  initialAction?: "deposit" | "withdraw"
}) {
  const lendSession = useLendSessionContext()
  const market = lendSession.state.markets[marketId] ?? getLendMarketById(marketId)
  if (!market) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            {initialAction === "deposit" ? "Deposit" : "Withdraw"} {market.asset.symbol}
          </DialogTitle>
        </DialogHeader>
        <LendActionBox
          className="px-4 pb-4"
          market={market}
          initialAction={initialAction}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
