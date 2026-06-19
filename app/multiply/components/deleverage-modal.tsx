"use client"

import * as React from "react"
import type { MultiplyMarketRecord, MultiplyPosition } from "@/app/lib/multiply-engine"
import { buildMultiplySessionSeed, getMultiplySessionWalletId } from "@/app/lib/multiply-system/demo-session"
import { useMultiplyActionBox } from "@/app/lib/multiply-system/use-multiply-action-box"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { TransactionFlowPanel } from "@/app/components/transaction-flow"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function formatMultiplier(value: number) {
  return `${value.toFixed(2)}x`
}

export function DeleverageModal({
  open,
  onOpenChange,
  market,
  position,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  market: MultiplyMarketRecord
  position: MultiplyPosition
}) {
  const walletId = React.useMemo(() => getMultiplySessionWalletId(), [])
  const sessionSeed = React.useMemo(() => buildMultiplySessionSeed(walletId), [walletId])
  const session = useMultiplySession({ walletId, sessionSeed })
  const actionBox = useMultiplyActionBox(session)
  const [targetMultiplier, setTargetMultiplier] = React.useState(Math.max(1, position.multiplier - 0.5))

  const handleReview = React.useCallback(async () => {
    await actionBox.prepareAction({
      type: "deleverage",
      walletId,
      positionId: position.id,
      targetMultiplier,
    })
    await actionBox.advance()
  }, [actionBox, position.id, targetMultiplier, walletId])

  const preview = actionBox.preview

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-surface-raised p-0">
        <DialogTitle className="sr-only">Deleverage {market.collateralAsset.symbol}</DialogTitle>
        <div className="space-y-4 p-5">
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Simulated deleverage</div>
            <h3 className="mt-1 text-[18px] font-normal tracking-[-0.02em] text-foreground">
              Reduce {market.collateralAsset.symbol} exposure
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[13px] font-medium text-foreground">Target multiplier</label>
              <span className="font-data text-[13px] tabular-nums">{formatMultiplier(targetMultiplier)}</span>
            </div>
            <Slider
              min={1}
              max={Math.max(1, position.multiplier - 0.1)}
              step={0.1}
              value={[targetMultiplier]}
              onValueChange={(values) => setTargetMultiplier(values[0] ?? 1)}
            />
          </div>

          {preview ? (
            <dl className="grid grid-cols-2 gap-3 rounded-radius-sm border border-border/70 bg-surface-inset/40 p-3 text-[12.5px]">
              <div>
                <dt className="text-muted-foreground">Current exposure</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatUsd(preview.before.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">New exposure</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatUsd(preview.after.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Debt repaid</dt>
                <dd className="mt-0.5 font-data tabular-nums">
                  {formatUsd(Math.max(0, preview.before.debtValueUsd - preview.after.debtValueUsd))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Health factor</dt>
                <dd className="mt-0.5 font-data tabular-nums">
                  {preview.after.healthFactor === "infinity" ? "∞" : preview.after.healthFactor.toFixed(2)}
                </dd>
              </div>
            </dl>
          ) : null}

          {actionBox.stage === "entry" ? (
            <Button className={cn("h-10 w-full rounded-radius-sm")} onClick={() => void handleReview()}>
              Review simulated deleverage
            </Button>
          ) : null}

          {actionBox.stage === "preview" ? (
            <Button
              className={cn("h-10 w-full rounded-radius-sm")}
              disabled={!actionBox.canAdvance}
              onClick={() => void actionBox.advance()}
            >
              Continue
            </Button>
          ) : null}

          {actionBox.stage === "approve" || actionBox.stage === "processing" || actionBox.stage === "success" ? (
            <TransactionFlowPanel
              stage={actionBox.stage === "approve" ? "review" : actionBox.stage === "processing" ? "processing" : "success"}
              actionLabel="Deleverage"
              amountLabel={formatMultiplier(targetMultiplier)}
              title="Deleverage position"
              subtitle="Simulated exposure reduction"
              rows={
                preview
                  ? [
                      { label: "Debt before", value: formatUsd(preview.before.debtValueUsd) },
                      { label: "Debt after", value: formatUsd(preview.after.debtValueUsd) },
                      { label: "Multiplier after", value: formatMultiplier(preview.after.multiplier) },
                    ]
                  : []
              }
              primaryLabel={actionBox.stage === "success" ? "Done" : "Confirm simulated deleverage"}
              simulated
              submitDisabled={!actionBox.canAdvance}
              onPrimary={() => {
                if (actionBox.stage === "success") {
                  actionBox.reset()
                  onOpenChange(false)
                  return
                }
                void actionBox.advance()
              }}
              onBack={() => actionBox.reset()}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
