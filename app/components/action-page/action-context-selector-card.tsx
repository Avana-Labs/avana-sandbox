"use client"

import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { cn } from "@/lib/utils"

export function ActionContextSelectorCard({
  label,
  value,
  approxUsdLabel,
  collateralSymbol,
  borrowSymbol,
  onClick,
  workspace = false,
}: {
  label: string
  value: string
  approxUsdLabel?: string
  collateralSymbol: string
  borrowSymbol?: string
  onClick: () => void
  workspace?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      data-testid="action-context-selector-card"
    >
      <div
        className={cn(
          workspace
            ? "rounded-[20px] border border-border bg-background px-4 py-4 dark:bg-[hsl(220,7%,10%)]"
            : "rounded-radius-md border border-border bg-background",
        )}
      >
        <div className={workspace ? undefined : "px-4 pb-4 pt-4"}>
          <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
          <div className="mt-3 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
            <div className="min-w-0 flex-1 break-words text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground min-[361px]:truncate">
              {value}
            </div>
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-2 text-[14px] font-medium dark:bg-card max-[360px]:self-end">
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
          {approxUsdLabel ? (
            <div className="mt-2 text-[14px] text-foreground/60">
              <AnimatedTextValue text={approxUsdLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  )
}
