"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PrimaryCardButton } from "@/app/components/home/shared"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"

export type LendSessionModalState = {
  isOpen: boolean
  marketId: string
  actionType: "deposit" | "withdraw"
}

export function LendSessionModal({
  modalState,
  onClose,
}: {
  modalState: LendSessionModalState
  onClose: () => void
}) {
  const lendSession = useLendSessionContext()
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const market = getLendMarketById(modalState.marketId)
  const position = Object.values(lendSession.state.positions).find(
    (entry) => entry.walletId === lendSession.walletId && entry.marketId === modalState.marketId && entry.status === "active",
  )

  if (!market) return null

  const parsedAmount = Number.parseFloat(amount) || 0

  const handleSubmit = async () => {
    if (isSubmitting || parsedAmount <= 0) return
    if (modalState.actionType === "withdraw" && !position) {
      toast.error("No active lend position found")
      return
    }

    setIsSubmitting(true)
    try {
      const intent =
        modalState.actionType === "deposit"
          ? lendSession.createIntent({
              type: "deposit",
              walletId: lendSession.walletId,
              marketId: market.marketId,
              depositAmount: parsedAmount,
              walletBalance: 10_000,
            })
          : lendSession.createIntent({
              type: "withdraw",
              walletId: lendSession.walletId,
              marketId: market.marketId,
              positionId: position!.positionId,
              withdrawAmount: parsedAmount,
            })

      const preview = await lendSession.previewTransaction(intent)
      if (!preview.allowed) {
        toast.error(preview.validationErrors[0] ?? "Transaction is not allowed")
        return
      }

      await lendSession.executeTransaction(intent)
      toast.success(`Simulated ${modalState.actionType} for ${parsedAmount} ${market.asset.symbol}`)
      setAmount("")
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {modalState.actionType === "deposit" ? "Deposit" : "Withdraw"} {market.asset.symbol}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            aria-label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2"
            placeholder="Amount"
          />
          <PrimaryCardButton type="button" disabled={isSubmitting || parsedAmount <= 0} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Processing..." : modalState.actionType === "deposit" ? "Deposit" : "Withdraw"}
          </PrimaryCardButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
