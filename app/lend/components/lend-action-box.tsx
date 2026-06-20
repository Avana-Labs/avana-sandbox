"use client"

import * as React from "react"
import type { LendMarket } from "@/app/lib/lend-engine"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { useLendActionBox } from "@/app/lib/lend-system/use-lend-action-box"
import { getWalletBalanceForLendMarket } from "@/app/lib/lend-system/wallet-balances"
import { TransactionFlowPanel } from "@/app/components/transaction-flow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function previewRows(preview: NonNullable<ReturnType<typeof useLendActionBox>["preview"]>) {
  return [
    { label: "Supplied amount", value: preview.after.suppliedAmount.toFixed(4) },
    { label: "Supplied value", value: formatUsd(preview.after.suppliedValueUsd) },
    { label: "Principal", value: preview.after.principalAmount.toFixed(4) },
    { label: "Interest earned", value: preview.after.interestEarned.toFixed(4) },
    { label: "Rewards earned", value: formatUsd(preview.after.rewardsEarnedUsd) },
    { label: "Total earned", value: formatUsd(preview.after.totalEarnedUsd) },
    { label: "Current APY", value: formatPct(preview.after.currentApy) },
  ]
}

export function LendActionBox({
  market,
  initialAction = "deposit",
  className,
  onSuccess,
}: {
  market: LendMarket
  initialAction?: "deposit" | "withdraw"
  className?: string
  onSuccess?: () => void
}) {
  const session = useLendSessionContext()
  const actionBox = useLendActionBox(session)
  const [actionType, setActionType] = React.useState<"deposit" | "withdraw">(initialAction)
  const [amount, setAmount] = React.useState("100")
  const walletBalance = React.useMemo(
    () => getWalletBalanceForLendMarket(session.walletId, market),
    [market, session.walletId],
  )

  const position = React.useMemo(
    () =>
      Object.values(session.state.positions).find(
        (entry) => entry.walletId === session.walletId && entry.marketId === market.marketId && entry.status === "active",
      ),
    [market.marketId, session.state.positions, session.walletId],
  )

  React.useEffect(() => {
    setActionType(initialAction)
  }, [initialAction, market.marketId])

  React.useEffect(() => {
    if (actionBox.stage !== "entry") return undefined
    const parsedAmount = Number.parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return undefined

    const handle = window.setTimeout(() => {
      if (actionType === "deposit") {
        void actionBox.refreshPreview({
          type: "deposit",
          walletId: session.walletId,
          marketId: market.marketId,
          depositAmount: parsedAmount,
          walletBalance,
        })
        return
      }
      if (!position) return
      void actionBox.refreshPreview({
        type: "withdraw",
        walletId: session.walletId,
        marketId: market.marketId,
        positionId: position.positionId,
        withdrawAmount: parsedAmount,
      })
    }, 180)

    return () => window.clearTimeout(handle)
  }, [actionBox, actionType, amount, market.marketId, position, session.walletId])

  const handleReview = React.useCallback(async () => {
    const parsedAmount = Number.parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    if (actionType === "withdraw" && !position) return

    await actionBox.prepareAction(
      actionType === "deposit"
        ? {
            type: "deposit",
            walletId: session.walletId,
            marketId: market.marketId,
            depositAmount: parsedAmount,
            walletBalance,
          }
        : {
            type: "withdraw",
            walletId: session.walletId,
            marketId: market.marketId,
            positionId: position!.positionId,
            withdrawAmount: parsedAmount,
          },
    )
  }, [actionBox, actionType, amount, market.marketId, position, session.walletId])

  const preview = actionBox.preview
  const submitDisabled = actionBox.stage !== "success" && !actionBox.canAdvance

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-radius-md border border-border bg-surface-raised p-4 shadow-elev-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Simulated {actionType}
            </div>
            <h3 className="mt-1 text-[18px] font-normal tracking-[-0.02em] text-foreground">{market.asset.symbol}</h3>
          </div>
          <span className="rounded-full bg-[hsl(var(--brand-soft))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--brand))]">
            Sandbox
          </span>
        </div>

        {actionBox.stage === "entry" ? (
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-border pb-2">
              {(["deposit", "withdraw"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActionType(tab)}
                  className={cn(
                    "pb-2 text-sm capitalize",
                    actionType === tab ? "border-b-2 border-accent-primary font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-radius-sm border border-border/70 bg-surface-inset/40 p-3 text-[12.5px]">
              <div>
                <dt className="text-muted-foreground">Supply APY</dt>
                <dd className="mt-0.5 font-data tabular-nums text-emerald-600">{formatPct(market.supplyApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rewards APY</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(market.rewardsApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total APY</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(market.totalApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Utilization</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(market.utilization)}</dd>
              </div>
            </dl>

            <Input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />

            {preview?.validationErrors.length ? (
              <div className="rounded-radius-sm border border-rose-500/20 bg-rose-500/5 p-3 text-[12px] text-rose-700">
                {preview.validationErrors.join(" ")}
              </div>
            ) : null}

            {preview?.warnings.length ? (
              <div className="rounded-radius-sm border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-amber-800">
                {preview.warnings.join(" ")}
              </div>
            ) : null}

            <Button
              className="h-10 w-full"
              disabled={actionType === "withdraw" && !position}
              onClick={() => void handleReview()}
            >
              Review simulated {actionType}
            </Button>
          </div>
        ) : null}

        {actionBox.stage === "preview" ? (
          <Button className="h-10 w-full" disabled={!actionBox.canAdvance} onClick={() => void actionBox.advance()}>
            Continue
          </Button>
        ) : null}
      </div>

      {actionBox.stage === "approve" || actionBox.stage === "processing" || actionBox.stage === "success" ? (
        <TransactionFlowPanel
          stage={actionBox.stage === "approve" ? "review" : actionBox.stage === "processing" ? "processing" : "success"}
          actionLabel={actionType === "deposit" ? "Deposit" : "Withdraw"}
          amountLabel={`${amount} ${market.asset.symbol}`}
          title={`${actionType === "deposit" ? "Deposit" : "Withdraw"} ${market.asset.symbol}`}
          subtitle="Simulated lend position update"
          rows={preview ? previewRows(preview) : []}
          primaryLabel={actionBox.stage === "success" ? "Done" : `Confirm simulated ${actionType}`}
          simulated
          submitDisabled={submitDisabled}
          blockedReason={preview?.validationErrors[0] ?? null}
          onPrimary={() => {
            if (actionBox.stage === "success") {
              actionBox.reset()
              onSuccess?.()
              return
            }
            void actionBox.advance()
          }}
          onBack={() => actionBox.reset()}
        />
      ) : null}
    </div>
  )
}
