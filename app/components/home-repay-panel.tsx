"use client"

import { RotateCcw } from "lucide-react"
import type { HomeCollateralPool, RepayPreview } from "@/app/lib/home-sim"
import { formatCompactUsd } from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { DetailList, PairVisual, PanelField, PremiumPanel, ValueBadge } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"

type HomeRepayPanelProps = {
  pools: HomeCollateralPool[]
  selectedPoolId: string
  debts: Record<string, number>
  borrowAprByPoolId: Record<string, number>
  amount: string
  preview: RepayPreview
  onSelectPool: (poolId: string) => void
  onAmountChange: (value: string) => void
  onSetMax: () => void
  onSubmit: () => void
}

export function HomeRepayPanel({
  pools,
  selectedPoolId,
  debts,
  borrowAprByPoolId,
  amount,
  preview,
  onSelectPool,
  onAmountChange,
  onSetMax,
  onSubmit,
}: HomeRepayPanelProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <PremiumPanel
        title="Repay active debt"
        description="Select the LP-backed loan you want to reduce, then preview the health factor improvement before submitting."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {pools.map((pool) => {
              const debtUsd = debts[pool.id] ?? 0
              const isSelected = pool.id === selectedPoolId
              const isDisabled = debtUsd <= 0

              return (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => onSelectPool(pool.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all",
                    isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/60 bg-background/70 hover:border-border",
                    isDisabled && "opacity-55",
                  )}
                >
                  <PairVisual visuals={pool.visuals} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold text-foreground">{pool.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {pool.venue} · {pool.category}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("font-data text-sm font-semibold", debtUsd > 0 ? "text-rose-600" : "text-muted-foreground")}>
                      {debtUsd > 0 ? formatCompactUsd(debtUsd) : "No debt"}
                    </span>
                    <ValueBadge
                      label={debtUsd > 0 ? `${borrowAprByPoolId[pool.id].toFixed(1)}% APR` : "No loan"}
                      tone={debtUsd > 0 ? "danger" : "default"}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <PanelField
            label="Repay amount"
            helper={preview.amountUsd > 0 ? `Approximate settlement value ${formatCompactUsd(preview.amountUsd)}` : "Repay in USDC to de-risk the selected collateral."}
            action={
              <button type="button" onClick={onSetMax} className="text-xs font-semibold text-primary transition-opacity hover:opacity-80">
                Max
              </button>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="sr-only">Repay amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent font-data text-5xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
                />
              </label>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-3 font-semibold">
                <RotateCcw className="h-4 w-4 text-primary" />
                USDC
              </div>
            </div>
          </PanelField>

          <Button type="button" className="h-12 rounded-2xl text-base" disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
            {preview.ctaLabel}
          </Button>
        </div>
      </PremiumPanel>

      <div className="flex flex-col gap-5">
        <PremiumPanel title="Repay impact" description="LPFI shows the improvement live; this rail keeps that exact feedback loop.">
          <div className="flex flex-col gap-4">
            <DetailList
              rows={[
                { label: "Remaining debt", value: preview.remainingDebtLabel },
                { label: "Health factor", value: `${preview.oldHealthFactorLabel} -> ${preview.healthFactorAfterLabel}`, tone: "positive" },
                { label: "Interest saved / yr", value: formatCompactUsd(preview.yearlyInterestSavedUsd), tone: "positive" },
                { label: "Network fee", value: "~$0.80" },
              ]}
            />
            {preview.amountUsd > 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                <strong className="font-semibold">Health improves.</strong> The selected loan moves from {preview.oldHealthFactorLabel} to{" "}
                {preview.healthFactorAfterLabel}.
              </div>
            ) : null}
          </div>
        </PremiumPanel>

        <PremiumPanel title="Debt context" description="Compact stats inspired by LPFI, with calmer Uniswap-like spacing.">
          <DetailList
            rows={pools.map((pool) => ({
              label: pool.name,
              value: `${formatCompactUsd(debts[pool.id] ?? 0)} · ${(borrowAprByPoolId[pool.id] ?? 0).toFixed(1)}% APR`,
              tone: (debts[pool.id] ?? 0) > 0 ? "danger" : "default",
            }))}
          />
        </PremiumPanel>
      </div>
    </div>
  )
}
