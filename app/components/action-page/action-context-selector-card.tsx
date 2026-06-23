"use client"

import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"

export function ActionContextSelectorCard({
  label,
  value,
  collateralSymbol,
  borrowSymbol,
  onClick,
}: {
  label: string
  value: string
  collateralSymbol: string
  borrowSymbol?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      data-testid="action-context-selector-card"
    >
      <div className="rounded-radius-md border border-border bg-card">
        <div className="px-4 pb-4 pt-4">
          <div className="text-[13px] text-muted-foreground">{label}</div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 truncate text-[clamp(1.25rem,3.5vw,1.875rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
              {value}
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium">
              {borrowSymbol ? (
                <ActionTokenPairIcon collateralSymbol={collateralSymbol} borrowSymbol={borrowSymbol} size="md" />
              ) : (
                <ActionTokenIcon symbol={collateralSymbol} />
              )}
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
