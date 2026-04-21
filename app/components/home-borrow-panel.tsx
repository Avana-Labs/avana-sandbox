"use client"

import { ChevronDown } from "lucide-react"
import type { BorrowPreview, HomeBorrowToken, HomeCollateralPool } from "@/app/lib/home-sim"
import { formatCompactUsd } from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { DetailList, PairVisual, PanelField, PremiumPanel, TokenBubble, ValueBadge } from "@/app/components/home-workspace-primitives"

type HomeBorrowPanelProps = {
  pool: HomeCollateralPool
  token: HomeBorrowToken
  amount: string
  preview: BorrowPreview
  onAmountChange: (value: string) => void
  onOpenPoolSheet: () => void
  onOpenTokenSheet: () => void
  onSetMax: () => void
  onSubmit: () => void
}

function BorrowHealthGauge({ preview }: { preview: BorrowPreview }) {
  const toneClassName =
    preview.riskTone === "positive"
      ? "bg-emerald-500"
      : preview.riskTone === "warning"
        ? "bg-amber-500"
        : preview.riskTone === "danger"
          ? "bg-rose-500"
          : "bg-primary"

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-border/60 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">Health factor</span>
        <span
          className={[
            "font-data text-2xl font-semibold",
            preview.riskTone === "positive" ? "text-emerald-600" : "",
            preview.riskTone === "warning" ? "text-amber-600" : "",
            preview.riskTone === "danger" ? "text-rose-600" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {preview.healthFactorLabel}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className={`${toneClassName} h-full rounded-full`} style={{ width: `${preview.progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Safe</span>
          <span>Liquidation risk</span>
        </div>
      </div>
    </div>
  )
}

export function HomeBorrowPanel({
  pool,
  token,
  amount,
  preview,
  onAmountChange,
  onOpenPoolSheet,
  onOpenTokenSheet,
  onSetMax,
  onSubmit,
}: HomeBorrowPanelProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <PremiumPanel
        title="Borrow against an LP position"
        description="Choose collateral, size a borrow, and preview how far you can push leverage before risk gets uncomfortable."
      >
        <div className="flex flex-col gap-4">
          <PanelField
            label="Collateral"
            helper={`${pool.venue} · Max LTV ${pool.maxLtv}% · Power ${formatCompactUsd(pool.borrowPowerUsd)}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-data text-3xl font-semibold tracking-tight">{formatCompactUsd(pool.collateralUsd)}</span>
                <span className="text-sm text-muted-foreground">{pool.name}</span>
              </div>
              <Button type="button" variant="outline" className="h-12 rounded-full px-4" onClick={onOpenPoolSheet}>
                <PairVisual visuals={pool.visuals} />
                {pool.name}
                <ChevronDown data-icon="inline-end" />
              </Button>
            </div>
          </PanelField>

          <PanelField
            label="Borrow"
            helper={preview.amountUsd > 0 ? `Approximate settlement value ${preview.amountLabel}` : "Choose the token and size you want to borrow."}
            action={
              <button type="button" onClick={onSetMax} className="text-xs font-semibold text-primary transition-opacity hover:opacity-80">
                Max
              </button>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="sr-only">Borrow amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent font-data text-5xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
                />
              </label>
              <Button type="button" variant="outline" className="h-12 rounded-full px-4" onClick={onOpenTokenSheet}>
                <TokenBubble visual={token.visual} className="size-8" />
                {token.symbol}
                <ChevronDown data-icon="inline-end" />
              </Button>
            </div>
          </PanelField>

          {preview.warningTitle && preview.warningMessage ? (
            <div
              className={[
                "flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm",
                preview.riskTone === "danger"
                  ? "border-rose-200 bg-rose-500/10 text-rose-700"
                  : "border-amber-200 bg-amber-500/10 text-amber-700",
              ].join(" ")}
            >
              <strong className="font-semibold">{preview.warningTitle}</strong>
              <span>{preview.warningMessage}</span>
            </div>
          ) : null}

          <Button type="button" className="h-12 rounded-2xl text-base" disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
            {preview.ctaLabel}
          </Button>
        </div>
      </PremiumPanel>

      <div className="flex flex-col gap-5">
        <PremiumPanel title="Risk preview" description="The reference LPFI flow keeps this card live as you type.">
          <div className="flex flex-col gap-4">
            <BorrowHealthGauge preview={preview} />
            <DetailList
              rows={[
                { label: "Borrowed", value: preview.amountUsd > 0 ? formatCompactUsd(preview.amountUsd) : "$0.00" },
                { label: "Remaining power", value: formatCompactUsd(preview.remainingBorrowPowerUsd), tone: "positive" },
                { label: "Liquidation threshold", value: formatCompactUsd(pool.liquidationUsd), tone: "warning" },
              ]}
            />
          </div>
        </PremiumPanel>

        <PremiumPanel title="Selected route" description="Match LPFI mechanics, but in a calmer Uniswap-like surface.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <ValueBadge label={pool.category} />
              <ValueBadge label={`${token.borrowApr.toFixed(1)}% APR`} tone="warning" />
              <ValueBadge label={`${pool.pairApr.toFixed(1)}% LP APR`} tone="positive" />
            </div>
            <DetailList
              rows={[
                { label: "Collateral venue", value: pool.venue },
                { label: "Borrow asset", value: token.symbol },
                { label: "LP still earning", value: `${pool.pairApr.toFixed(1)}% APR`, tone: "positive" },
              ]}
            />
          </div>
        </PremiumPanel>
      </div>
    </div>
  )
}
