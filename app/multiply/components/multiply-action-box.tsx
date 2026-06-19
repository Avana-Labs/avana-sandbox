"use client"

import * as React from "react"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import { buildMultiplySessionSeed, getMultiplySessionWalletId } from "@/app/lib/multiply-system/demo-session"
import { useMultiplyActionBox } from "@/app/lib/multiply-system/use-multiply-action-box"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { TransactionFlowPanel } from "@/app/components/transaction-flow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatMultiplier(value: number) {
  return `${value.toFixed(2)}x`
}

function previewRows(preview: NonNullable<ReturnType<typeof useMultiplyActionBox>["preview"]>) {
  return [
    { label: "Total exposure", value: formatUsd(preview.after.collateralValueUsd) },
    { label: "Estimated debt", value: formatUsd(preview.after.debtValueUsd) },
    { label: "LTV", value: formatPct(preview.after.ltv) },
    { label: "Health factor", value: preview.after.healthFactor === "infinity" ? "∞" : preview.after.healthFactor.toFixed(2) },
    { label: "Net APY", value: formatPct(preview.after.netApy) },
    {
      label: "Liquidation price",
      value: preview.simulationSummary?.liquidationPrice ? formatUsd(preview.simulationSummary.liquidationPrice) : "—",
    },
    {
      label: "Price impact",
      value: preview.simulationSummary?.priceImpactPct ? formatPct(preview.simulationSummary.priceImpactPct) : "—",
    },
  ]
}

export function MultiplyActionBox({
  market,
  className,
  onSuccess,
}: {
  market: MultiplyMarketRecord
  className?: string
  onSuccess?: () => void
}) {
  const walletId = React.useMemo(() => getMultiplySessionWalletId(), [])
  const sessionSeed = React.useMemo(() => buildMultiplySessionSeed(walletId), [walletId])
  const session = useMultiplySession({ walletId, sessionSeed })
  const actionBox = useMultiplyActionBox(session)
  const [collateralAmount, setCollateralAmount] = React.useState("1")
  const [selectedMultiplier, setSelectedMultiplier] = React.useState(Math.min(2, market.risk.publicMaxMultiplier))

  const handleReview = React.useCallback(async () => {
    const amount = Number.parseFloat(collateralAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    await actionBox.prepareAction({
      type: "multiply",
      walletId,
      marketId: market.id,
      collateralAmount: amount,
      selectedMultiplier,
    })
    await actionBox.advance()
  }, [actionBox, collateralAmount, market.id, selectedMultiplier, walletId])

  const preview = actionBox.preview

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-radius-md border border-border bg-surface-raised p-4 shadow-elev-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Simulated multiply</div>
            <h3 className="mt-1 text-[18px] font-normal tracking-[-0.02em] text-foreground">
              {market.collateralAsset.symbol} / {market.borrowAsset.symbol}
            </h3>
          </div>
          <span className="rounded-full bg-[hsl(var(--brand-soft))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--brand))]">
            Sandbox
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`multiply-collateral-${market.id}`} className="text-[13px] font-medium text-foreground">
              Collateral amount ({market.collateralAsset.symbol})
            </label>
            <Input
              id={`multiply-collateral-${market.id}`}
              value={collateralAmount}
              onChange={(event) => setCollateralAmount(event.target.value)}
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[13px] font-medium text-foreground">Multiplier</label>
              <span className="font-data text-[13px] tabular-nums text-foreground">{formatMultiplier(selectedMultiplier)}</span>
            </div>
            <Slider
              min={1}
              max={20}
              step={0.1}
              value={[selectedMultiplier]}
              onValueChange={(values) => setSelectedMultiplier(values[0] ?? 1)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>1x</span>
              <span>Public max {formatMultiplier(market.risk.publicMaxMultiplier)}</span>
              <span>20x</span>
            </div>
          </div>

          {preview ? (
            <dl className="grid grid-cols-2 gap-3 rounded-radius-sm border border-border/70 bg-surface-inset/40 p-3 text-[12.5px]">
              <div>
                <dt className="text-muted-foreground">Max LTV</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(market.risk.maxLtv)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Liquidation threshold</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(market.risk.liquidationThreshold)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Supply APY</dt>
                <dd className="mt-0.5 font-data tabular-nums text-emerald-600">{formatPct(market.economics.supplyApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Borrow APY</dt>
                <dd className="mt-0.5 font-data tabular-nums text-rose-600">{formatPct(market.economics.borrowApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total exposure</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatUsd(preview.after.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated debt</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatUsd(preview.after.debtValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Health factor</dt>
                <dd className="mt-0.5 font-data tabular-nums">
                  {preview.after.healthFactor === "infinity" ? "∞" : preview.after.healthFactor.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net APY</dt>
                <dd className="mt-0.5 font-data tabular-nums">{formatPct(preview.after.netApy)}</dd>
              </div>
            </dl>
          ) : null}

          {preview?.validationErrors.length ? (
            <div className="rounded-radius-sm border border-rose-500/20 bg-rose-500/5 p-3 text-[12px] text-rose-700 dark:text-rose-300">
              {preview.validationErrors.join(" ")}
            </div>
          ) : null}

          {preview?.warnings.length ? (
            <div className="rounded-radius-sm border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-amber-800 dark:text-amber-200">
              {preview.warnings.join(" ")}
            </div>
          ) : null}

          {actionBox.stage === "entry" ? (
            <Button
              className="h-10 w-full rounded-radius-sm bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover"
              onClick={() => void handleReview()}
            >
              Review simulated multiply
            </Button>
          ) : null}

          {actionBox.stage === "preview" ? (
            <Button
              className="h-10 w-full rounded-radius-sm bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover"
              disabled={!actionBox.canAdvance}
              onClick={() => void actionBox.advance()}
            >
              Continue
            </Button>
          ) : null}
        </div>
      </div>

      {actionBox.stage === "approve" || actionBox.stage === "processing" || actionBox.stage === "success" ? (
        <TransactionFlowPanel
          stage={actionBox.stage === "approve" ? "review" : actionBox.stage === "processing" ? "processing" : "success"}
          actionLabel="Multiply"
          amountLabel={`${collateralAmount} ${market.collateralAsset.symbol}`}
          title={`Multiply ${market.collateralAsset.symbol}`}
          subtitle="Simulated loop exposure update"
          rows={preview ? previewRows(preview) : []}
          primaryLabel={actionBox.stage === "success" ? "Done" : "Confirm simulated multiply"}
          simulated
          submitDisabled={!actionBox.canAdvance}
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
