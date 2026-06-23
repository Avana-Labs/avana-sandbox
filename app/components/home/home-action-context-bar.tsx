"use client"

import type { HomeCollateralPool } from "@/app/lib/home-sim"
import { ActionContextSelectorCard } from "@/app/components/action-page/action-context-selector-card"
import { ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"

export function HomeActionContextBar({
  pool,
  onOpenPool,
  variant = "card",
  workspace = false,
  label = "Collateral",
  switchable = true,
}: {
  pool: HomeCollateralPool
  onOpenPool: () => void
  variant?: "card" | "inset"
  workspace?: boolean
  label?: string
  switchable?: boolean
}) {
  const [collateralSymbol, borrowSymbol] = pool.visuals.map((visual) => visual.symbol)

  if (variant === "inset") {
    return (
      <SwapStyleField label={label} tone="raised">
        <button
          type="button"
          onClick={switchable ? onOpenPool : undefined}
          disabled={!switchable}
          className="mt-3 flex w-full items-center justify-between gap-3 text-left disabled:cursor-default"
        >
          <div className="min-w-0 flex-1 truncate text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {pool.name}
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-2 text-[14px] font-medium">
            <ActionTokenPairIcon collateralSymbol={collateralSymbol ?? "LP"} borrowSymbol={borrowSymbol ?? "LP"} size="md" />
            {switchable ? (
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            ) : null}
          </div>
        </button>
      </SwapStyleField>
    )
  }

  return (
    <div className={workspace ? undefined : "mb-3"}>
      <ActionContextSelectorCard
        label={label}
        value={pool.name}
        collateralSymbol={collateralSymbol ?? "LP"}
        borrowSymbol={borrowSymbol}
        onClick={onOpenPool}
        workspace={workspace}
      />
    </div>
  )
}
