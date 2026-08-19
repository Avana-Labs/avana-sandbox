"use client"

/**
 * Multiply → "Leverage Outlook". Forward-looking companion for the Multiply tab:
 * an impact triad (leverage / net APY / liquidation price), a leverage slider with
 * a colored risk-zone track + max-safe marker and a before→after preview, a
 * scenario projection table (bear/base/bull), a price-sensitivity table, and the
 * spread guardrail that fires when leverage stops adding value.
 *
 * UI-only phase — fed by MOCK_MULTIPLY_OUTLOOK. All figures derive from the
 * position + the leverage slider via forecast-core, so the slider, tables, and
 * triad stay consistent. Later wiring swaps the mock for the multiply position +
 * multiplyMarkets params and reuses multiply-engine/formulas.ts.
 */

import { useMemo } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenIcon } from "@/app/components/token-icon"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { MOCK_MULTIPLY_OUTLOOK } from "./mock-data"
import { OutlookSection, OutlookCard } from "./outlook-shell"
import { leverageFromLtv, netLoopApy, liquidationPrice, dropBuffer } from "./forecast-core"

function pctText(fraction: number) {
  return `${(fraction * 100).toFixed(0)}%`
}

export function MultiplyOutlook() {
  const { t } = useTranslation()
  const p = MOCK_MULTIPLY_OUTLOOK.position

  const lev = Number(leverageFromLtv(p.currentLtv).toFixed(2))

  const derived = useMemo(() => {
    const ltv = lev > 0 ? (lev - 1) / lev : 0
    const netApy = netLoopApy(p.yieldApyPct, p.borrowAprPct, lev)
    const liqPrice = liquidationPrice(p.collateralPriceUsd, lev, p.liqThreshold)
    const buffer = dropBuffer(p.collateralPriceUsd, liqPrice)
    return { ltv, netApy, liqPrice, buffer }
  }, [lev, p])

  return (
    <OutlookSection
      title={t("Multiply Outlook")}
      info="How leverage changes your yield, your liquidation price, and how much room you have."
    >
      {/* Impact triad */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OutlookCard className="!p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <TokenIcon symbol={p.collateralSymbol} size="xs" />
            {t("Leverage")}
          </div>
          <div className="mt-1 font-data text-[22px] font-medium tabular-nums text-foreground">{lev.toFixed(2)}x</div>
          <div className="text-[12px] text-muted-foreground">
            {t("LTV")} {pctText(derived.ltv)}
          </div>
        </OutlookCard>
        <OutlookCard className="!p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Net APY")}</div>
          <div
            className={`mt-1 font-data text-[22px] font-medium tabular-nums ${derived.netApy >= 0 ? "text-success" : "text-danger"}`}
          >
            {derived.netApy >= 0 ? "+" : ""}
            {derived.netApy.toFixed(2)}%
          </div>
          <div className="text-[12px] text-muted-foreground">
            {p.yieldApyPct.toFixed(1)}% {t("yield")} − {p.borrowAprPct.toFixed(1)}% {t("cost")}
          </div>
        </OutlookCard>
        <OutlookCard className="!p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Liquidation price")}</div>
          <div className="mt-1 font-data text-[22px] font-medium tabular-nums text-foreground">
            {formatUsdExact(derived.liqPrice)}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {pctText(derived.buffer)} {t("below")} {formatUsdExact(p.collateralPriceUsd)}
          </div>
        </OutlookCard>
      </div>
    </OutlookSection>
  )
}
