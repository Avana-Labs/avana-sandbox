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
      <div className="rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:flex-1 md:min-h-[250px]">
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
          className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5"
          onClick={onOpenTokenSheet}
        >
          <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
            {token ? (
              <TokenBubble visual={token.visual} className="size-10 shrink-0 md:size-9" />
            ) : (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-inset text-[12px] font-medium text-muted-foreground md:size-9">
                ?
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground md:text-[11.5px]">
              Borrow assets
            </span>
            <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
              {selectedAssetLabel}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5"
          onClick={onOpenPoolSheet}
        >
          <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
            <PairVisual
              visuals={pool.visuals}
              className="h-10 w-[3.2rem] shrink-0 [&>span]:size-10 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.25rem] md:h-9 md:w-[2.75rem] md:[&>span]:size-8 md:[&>span:nth-child(2)]:left-[1.05rem]"
            />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground md:text-[11.5px]">
              Collateralize
            </span>
            <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
              {pool.name}
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
