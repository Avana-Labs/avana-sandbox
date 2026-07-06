"use client"

import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import type { HomeCollateralPool } from "@/app/lib/home-sim"
import { formatActionApproxUsd } from "@/app/lib/action-system/formatters"
import { ActionContextSelectorCard } from "@/app/components/action-page/action-context-selector-card"
import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function HomeActionContextBar({
  pool,
  onOpenPool,
  variant = "card",
  workspace = false,
  label = "Collateral",
  switchable = true,
}: {
  pool: HomeCollateralPool | null
  onOpenPool: () => void
  variant?: "card" | "inset"
  workspace?: boolean
  label?: string
  switchable?: boolean
}) {
  const { t } = useTranslation()
  // Render one card in every state so the collateral input looks identical whether
  // or not the wallet already holds collateral in the selected market. When no pool
  // is selected yet, show a clear placeholder + $0 instead of a different card.
  const [collateralSymbol, borrowSymbol] = pool ? pool.visuals.map((visual) => visual.symbol) : []
  const valueLabel = pool ? pool.name : "0"
  const approxUsdLabel = formatActionApproxUsd(pool?.collateralUsd ?? 0)

  if (variant === "inset") {
    return (
      <SwapStyleField label={t(label)} tone="raised">
        <button
          type="button"
          onClick={switchable ? onOpenPool : undefined}
          disabled={!switchable}
          className="mt-3 flex w-full items-center justify-between gap-3 text-left disabled:cursor-default max-[360px]:flex-col max-[360px]:items-start"
        >
          <div className="min-w-0 flex-1 break-words text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground min-[361px]:truncate">
            {valueLabel}
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-2 text-[14px] font-medium max-[360px]:self-end">
            {pool ? (
              <ActionTokenPairIcon collateralSymbol={collateralSymbol ?? "LP"} borrowSymbol={borrowSymbol ?? "LP"} size="md" />
            ) : (
              <ActionTokenIcon symbol="LP" />
            )}
            {switchable ? (
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            ) : null}
          </div>
        </button>
        <div className="mt-2 text-[14px] text-foreground/60">
          <AnimatedTextValue text={approxUsdLabel} />
        </div>
      </SwapStyleField>
    )
  }

  return (
    <div className={workspace ? undefined : "mb-3"}>
      <ActionContextSelectorCard
        label={t(label)}
        value={valueLabel}
        approxUsdLabel={approxUsdLabel}
        collateralSymbol={collateralSymbol ?? "LP"}
        borrowSymbol={borrowSymbol}
        onClick={onOpenPool}
        workspace={workspace}
      />
    </div>
  )
}
