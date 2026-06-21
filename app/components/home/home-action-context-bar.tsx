"use client"

import { ChevronDown } from "lucide-react"
import type { HomeBorrowToken, HomeCollateralPool } from "@/app/lib/home-sim"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { Button } from "@/components/ui/button"

export function HomeActionContextBar({
  pool,
  token,
  onOpenPool,
  onOpenToken,
  showToken = true,
}: {
  pool: HomeCollateralPool
  token?: HomeBorrowToken | null
  onOpenPool: () => void
  onOpenToken?: () => void
  showToken?: boolean
}) {
  return (
    <div className={showToken ? "mb-4 grid gap-2.5 sm:grid-cols-2" : "mb-4"}>
      <Button
        type="button"
        variant="outline"
        className="grid h-[58px] grid-cols-[2.75rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md px-3.5 text-left"
        onClick={onOpenPool}
      >
        <span className="flex h-9 w-[2.75rem] items-center justify-center">
          <PairVisual
            visuals={pool.visuals}
            className="h-9 w-[2.75rem] shrink-0 [&>span]:size-8 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.05rem]"
          />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[11.5px] font-medium tracking-[0.02em] text-[hsl(var(--brand))]">Collateral position</span>
          <span className="truncate pt-0.5 text-[15px] font-medium text-foreground">{pool.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--brand))]" />
      </Button>

      {showToken && onOpenToken ? (
        <Button
          type="button"
          variant="outline"
          className="grid h-[58px] grid-cols-[2.75rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md px-3.5 text-left"
          onClick={onOpenToken}
        >
          <span className="flex h-9 w-[2.75rem] items-center justify-center">
            {token ? <TokenBubble visual={token.visual} className="size-9 shrink-0" /> : null}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[11.5px] font-medium tracking-[0.02em] text-[hsl(var(--brand))]">Borrow asset</span>
            <span className="truncate pt-0.5 text-[15px] font-medium text-foreground">{token?.symbol ?? "Select asset"}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--brand))]" />
        </Button>
      ) : null}
    </div>
  )
}
