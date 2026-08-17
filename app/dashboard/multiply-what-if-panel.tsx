"use client"

import { useMemo, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { formatHealthFactor } from "@/app/lib/data/borrow-domain"
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"
import { revalueMultiplyPosition } from "@/app/lib/multiply-engine"
import type { MultiplyPosition, MultiplySystemState } from "@/app/lib/multiply-engine"

const MASK = "••••"
const MIN_PRICE_MOVE = -50
const MAX_PRICE_MOVE = 50

type PositionOption = {
  positionId: string
  label: string
  marketId: string
  collateralSymbol: string
  currentPriceUsd: number
}

function summarizePositions(state: MultiplySystemState, walletId: string | null): PositionOption[] {
  if (!walletId) return []
  return Object.values(state.positions)
    .filter((position) => position.walletId === walletId && position.debtValueUsd > 0 && position.collateralAmount > 0)
    .map((position) => {
      const market = state.markets[position.marketId]
      if (!market) return null
      return {
        positionId: position.id,
        marketId: position.marketId,
        collateralSymbol: market.collateralAsset.symbol,
        currentPriceUsd: market.collateralAsset.priceUsd,
        label: `${market.collateralAsset.symbol} / ${market.borrowAsset.symbol}`,
      }
    })
    .filter((entry): entry is PositionOption => entry !== null)
}

function projectPosition(
  state: MultiplySystemState,
  positionId: string | null,
  pricePctMove: number,
): {
  before: MultiplyPosition | null
  after: MultiplyPosition | null
  scenarioPriceUsd: number
  currentPriceUsd: number
  collateralSymbol: string
} | null {
  if (!positionId) return null
  const position = state.positions[positionId]
  if (!position) return null
  const market = state.markets[position.marketId]
  if (!market) return null
  const before = revalueMultiplyPosition(position, market)
  const currentPriceUsd = market.collateralAsset.priceUsd
  const scenarioPriceUsd = Math.max(0, currentPriceUsd * (1 + pricePctMove / 100))
  const after = revalueMultiplyPosition(position, market, scenarioPriceUsd)
  return {
    before,
    after,
    scenarioPriceUsd,
    currentPriceUsd,
    collateralSymbol: market.collateralAsset.symbol,
  }
}

function formatSignedPct(value: number) {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function hfNumericOrNull(hf: MultiplyPosition["healthFactor"] | undefined): number | null {
  if (hf === undefined) return null
  if (hf === "infinity") return Number.POSITIVE_INFINITY
  return Number.isFinite(hf) ? hf : null
}

/**
 * "What-if" price panel for open multiply positions. The user picks a position,
 * drags the slider, and we re-run the engine's `revalueMultiplyPosition` at the
 * scenario price — the SAME derivation the live position uses, so the projected
 * health factor and liquidation price agree with the tables above. Read-only:
 * the panel simulates, it doesn't mutate any session state.
 */
export function MultiplyWhatIfPanel({ state, walletId }: { state: MultiplySystemState; walletId: string | null }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const options = useMemo(() => summarizePositions(state, walletId), [state, walletId])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pricePctMove, setPricePctMove] = useState<number>(0)

  const activeId =
    selectedId && options.some((opt) => opt.positionId === selectedId) ? selectedId : (options[0]?.positionId ?? null)
  const projection = useMemo(() => projectPosition(state, activeId, pricePctMove), [state, activeId, pricePctMove])

  if (options.length === 0) {
    return null
  }

  const m = (value: string) => (showDollarAmounts ? value : MASK)
  const afterHfNum = hfNumericOrNull(projection?.after?.healthFactor)
  const beforeHfNum = hfNumericOrNull(projection?.before?.healthFactor)
  const afterBand = healthFactorBand(afterHfNum)

  return (
    <section
      aria-labelledby="dashboard-multiply-what-if-heading"
      className="rounded-radius-md border border-border bg-background/40 p-4 md:p-5"
    >
      <div className="mb-3 flex flex-col gap-1">
        <h3
          id="dashboard-multiply-what-if-heading"
          className="text-[16px] font-medium tracking-tight text-foreground md:text-[17px]"
        >
          {t("What-if: price move")}
        </h3>
        <p className="text-[13px] text-muted-foreground">
          {t("Slide to preview how a collateral price move changes health factor and liquidation price.")}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground sm:flex-1">
          <span className="uppercase tracking-[0.08em]">{t("Position")}</span>
          <select
            value={activeId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
            className="h-9 rounded-radius-sm border border-border bg-background px-2 text-[13px] text-foreground"
          >
            {options.map((option) => (
              <option key={option.positionId} value={option.positionId}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground sm:flex-1">
          <span className="uppercase tracking-[0.08em]">
            {t("Price move")}: {formatSignedPct(pricePctMove)}
          </span>
          <input
            type="range"
            min={MIN_PRICE_MOVE}
            max={MAX_PRICE_MOVE}
            step={1}
            value={pricePctMove}
            onChange={(event) => setPricePctMove(Number(event.target.value))}
            aria-label={t("Collateral price move percentage")}
            className="w-full accent-primary"
          />
        </label>
      </div>

      {projection ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Scenario price")}</dt>
            <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">
              {m(formatUsdExact(projection.scenarioPriceUsd))}
            </dd>
            <dd className="text-[12px] text-muted-foreground">
              {t("now")} {m(formatUsdExact(projection.currentPriceUsd))}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Collateral value")}</dt>
            <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">
              {m(formatUsdExact(projection.after?.collateralValueUsd ?? 0))}
            </dd>
            <dd className="text-[12px] text-muted-foreground">
              {t("was")} {m(formatUsdExact(projection.before?.collateralValueUsd ?? 0))}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Health factor")}</dt>
            <dd className={`mt-1 font-data text-[15px] font-medium tabular-nums ${afterBand.textClass}`}>
              {formatHealthFactor(afterHfNum)}
            </dd>
            <dd className="text-[12px] text-muted-foreground">
              {t("was")} {formatHealthFactor(beforeHfNum)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Liq. price")}</dt>
            <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">
              {projection.after?.liquidationPrice != null ? m(formatUsdExact(projection.after.liquidationPrice)) : "—"}
            </dd>
            <dd className="text-[12px] text-muted-foreground">
              {beforeHfNum != null && projection.before?.liquidationPrice != null
                ? `${t("was")} ${m(formatUsdExact(projection.before.liquidationPrice))}`
                : ""}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("Select a position to preview.")}</p>
      )}
    </section>
  )
}
