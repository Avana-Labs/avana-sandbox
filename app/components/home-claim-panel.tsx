"use client"

import { Coins } from "lucide-react"
import type { ClaimPreview, HomeClaimPosition } from "@/app/lib/home-sim"
import { formatUsd, getClaimBreakdownLabel } from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { DetailList, PairVisual, PanelField, PremiumPanel, TokenBubble, ValueBadge } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"

type HomeClaimPanelProps = {
  positions: HomeClaimPosition[]
  claimableTotals: Record<string, number>
  selections: Record<string, boolean>
  amount: string
  preview: ClaimPreview
  onTogglePosition: (positionId: string) => void
  onAmountChange: (value: string) => void
  onSetAll: () => void
  onSubmit: () => void
}

const CLAIM_TOKEN_ORDER = ["ETH", "USDC", "USDT", "WBTC"] as const

export function HomeClaimPanel({
  positions,
  claimableTotals,
  selections,
  amount,
  preview,
  onTogglePosition,
  onAmountChange,
  onSetAll,
  onSubmit,
}: HomeClaimPanelProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <PremiumPanel
        title="Claim accumulated fees"
        description="Select the positions you want to harvest from, then optionally cap the claim amount for a partial withdrawal."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {positions.map((position) => {
              const isSelected = selections[position.id]
              const claimableUsd = claimableTotals[position.id] ?? 0

              return (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => onTogglePosition(position.id)}
                  className={cn(
                    "flex flex-col gap-4 rounded-[24px] border px-4 py-4 text-left transition-all",
                    isSelected ? "border-emerald-400 bg-emerald-500/5 shadow-sm" : "border-border/60 bg-background/70 hover:border-border",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <PairVisual visuals={[position.breakdown[0].visual, position.breakdown[1]?.visual ?? position.breakdown[0].visual]} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold text-foreground">{position.name}</span>
                      <span className="text-xs text-muted-foreground">{position.subtitle}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-data text-base font-semibold text-emerald-600">{formatUsd(claimableUsd)}</span>
                      <ValueBadge label={isSelected ? "Selected" : "Optional"} tone={isSelected ? "positive" : "default"} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {position.breakdown.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-3 py-3">
                        <TokenBubble visual={item.visual} className="size-8" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-data text-sm font-semibold text-foreground">{item.amountLabel}</span>
                          <span className="text-xs text-muted-foreground">{formatUsd(item.usdValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          <PanelField
            label="Claim amount"
            helper={preview.helperLabel}
            action={
              <button type="button" onClick={onSetAll} className="text-xs font-semibold text-primary transition-opacity hover:opacity-80">
                All
              </button>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="sr-only">Claim amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent font-data text-5xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
                />
              </label>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
                <Coins className="h-4 w-4" />
                USD
              </div>
            </div>
          </PanelField>

          <Button type="button" className="h-12 rounded-2xl text-base" disabled={!preview.hasSelection} onClick={onSubmit}>
            {preview.ctaLabel}
          </Button>
        </div>
      </PremiumPanel>

      <div className="flex flex-col gap-5">
        <PremiumPanel title="Claimable now" description="LPFI uses a dark hero here; this keeps the same emphasis but in Avana's system.">
          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%),linear-gradient(135deg,hsl(220_20%_9%),hsl(226_26%_13%))] p-5 text-white">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-white/70">Total claimable across selected positions</span>
                <span className="font-data text-4xl font-semibold tracking-tight">{formatUsd(preview.selectedTotalUsd)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CLAIM_TOKEN_ORDER.filter((symbol) => (preview.tokenTotals[symbol] ?? 0) > 0).map((symbol) => {
                const sourceItem = positions.flatMap((position) => position.breakdown).find((item) => item.symbol === symbol)

                if (!sourceItem) {
                  return null
                }

                return (
                  <div key={symbol} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <TokenBubble visual={sourceItem.visual} className="size-8" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-data text-sm font-semibold">{getClaimBreakdownLabel(symbol, preview.tokenTotals[symbol] ?? 0)}</span>
                      <span className="text-xs text-muted-foreground">{formatUsd(preview.tokenTotals[symbol] ?? 0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel title="Claim impact" description="Claiming rewards does not change collateral health, liquidation thresholds, or borrow power.">
          <div className="flex flex-col gap-4">
            <DetailList
              rows={[
                { label: "Selected positions", value: preview.selectedPositionIds.length.toString() },
                { label: "Claim amount", value: formatUsd(preview.effectiveClaimUsd), tone: "positive" },
                { label: "Collateral impact", value: "None", tone: "positive" },
              ]}
            />
            <div className="rounded-2xl border border-sky-200 bg-sky-500/10 px-4 py-3 text-sm text-sky-700">
              <strong className="font-semibold">No collateral impact.</strong> Harvesting LP fees leaves health factor and liquidation thresholds unchanged.
            </div>
          </div>
        </PremiumPanel>
      </div>
    </div>
  )
}
