"use client"

import { ChevronDown } from "lucide-react"
import type { BorrowPreview, HomeBorrowToken, HomeCollateralPool } from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"

type HomeBorrowPanelProps = {
  pool: HomeCollateralPool
  token: HomeBorrowToken | null
  amount: string
  preview: BorrowPreview
  onAmountChange: (value: string) => void
  onOpenPoolSheet: () => void
  onOpenTokenSheet: () => void
  onSubmit: () => void
}

export function HomeBorrowPanel({
  pool,
  token,
  amount,
  preview,
  onAmountChange,
  onOpenPoolSheet,
  onOpenTokenSheet,
  onSubmit,
}: HomeBorrowPanelProps) {
  const selectedAssetLabel = token?.symbol ?? "Select asset"

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="rounded-[18px] border border-border bg-background px-5 py-4 shadow-elev-1 md:flex-1 md:min-h-[250px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">You&apos;re borrowing</span>
        </div>

        <div className="flex min-h-[150px] flex-col items-center justify-center gap-4 py-3 sm:min-h-[220px] md:min-h-[150px] md:flex-1 md:py-0">
          <label className="flex items-baseline justify-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              className="w-[min(100%,12ch)] bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
              aria-label="Borrow amount"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-between rounded-[20px] px-4 text-left"
          onClick={onOpenTokenSheet}
        >
          <span className="flex min-w-0 items-center gap-3">
            {token ? (
              <TokenBubble visual={token.visual} className="size-8" />
            ) : (
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-inset text-[11px] font-medium text-muted-foreground">
                ?
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Borrow assets
              </span>
              <span className="truncate text-[14px] font-medium text-foreground">{selectedAssetLabel}</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-12 justify-between rounded-[20px] px-4 text-left"
          onClick={onOpenPoolSheet}
        >
          <span className="flex min-w-0 items-center gap-3">
            <PairVisual visuals={pool.visuals} className="w-11" />
            <span className="flex min-w-0 flex-col">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Collateralize
              </span>
              <span className="truncate text-[14px] font-medium text-foreground">{pool.name}</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </div>

      <Button type="button" className="h-11 rounded-2xl text-base md:shrink-0" disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </Button>
    </div>
  )
}
