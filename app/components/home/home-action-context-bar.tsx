"use client"

import type { HomeCollateralPool } from "@/app/lib/home-sim"
import { ActionContextSelectorCard } from "@/app/components/action-page/action-context-selector-card"
import { ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"

export function HomeActionContextBar({
  pool,
  onOpenPool,
  variant = "card",
}: {
  pool: HomeCollateralPool
  onOpenPool: () => void
  variant?: "card" | "inset"
}) {
  const [collateralSymbol, borrowSymbol] = pool.visuals.map((visual) => visual.symbol)

  if (variant === "inset") {
    return (
      <SwapStyleField label="Collateral position">
        <button type="button" onClick={onOpenPool} className="mt-3 flex w-full items-start justify-between gap-3 text-left">
          <div className="min-w-0 flex-1 truncate text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {pool.name}
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium">
            <ActionTokenPairIcon collateralSymbol={collateralSymbol ?? "LP"} borrowSymbol={borrowSymbol ?? "LP"} size="md" />
            <span className="text-muted-foreground" aria-hidden>
              ▾
            </span>
          </div>
        </button>
      </SwapStyleField>
    )
  }

  return (
    <div className="mb-3">
      <ActionContextSelectorCard
        label="Collateral position"
        value={pool.name}
        collateralSymbol={collateralSymbol ?? "LP"}
        borrowSymbol={borrowSymbol}
        onClick={onOpenPool}
      />
    </div>
  )
}
