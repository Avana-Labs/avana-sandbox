"use client"

import * as React from "react"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import { MultiplyActionBox } from "./multiply-action-box"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function MultiplyActionModal({
  open,
  onOpenChange,
  market,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  market: MultiplyMarketRecord | null
}) {
  if (!market) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-surface-raised p-0">
        <DialogTitle className="sr-only">Multiply {market.collateralAsset.symbol}</DialogTitle>
        <MultiplyActionBox market={market} className="p-5" onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
