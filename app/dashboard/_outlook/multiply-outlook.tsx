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

import { useMemo, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { formatHealthFactor } from "@/app/lib/data/borrow-domain"
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"
import { MOCK_MULTIPLY_OUTLOOK } from "./mock-data"
import { OutlookSection, OutlookCard } from "./outlook-shell"
import {
  leverageFromLtv,
  netLoopApy,
  loopSpread,
  liquidationPrice,
  dropBuffer,
  scenarioYield,
  scenarioCost,
  SCENARIO_ORDER,
  SCENARIOS,
} from "./forecast-core"

const MASK = "••••"
const PROJECTION_HORIZONS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 91 },
  { label: "1Y", days: 365 },
]
const SENSITIVITY_DROPS = [-0.05, -0.1, -0.2]

/** Leverage at which HF hits a target: k = hf / (hf − liqThreshold). */
function leverageAtHf(hf: number, liqThreshold: number) {
  if (hf <= liqThreshold) return Infinity
  return hf / (hf - liqThreshold)
}

function pctText(fraction: number) {
  return `${(fraction * 100).toFixed(0)}%`
}

export function MultiplyOutlook() {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const p = MOCK_MULTIPLY_OUTLOOK.position
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  const kMax = leverageFromLtv(p.maxLtv) // hard ceiling
  const kStart = leverageFromLtv(p.currentLtv)
  const [lev, setLev] = useState<number>(Number(kStart.toFixed(2)))

  const derived = useMemo(() => {
    const collateralUsd = p.equityUsd * lev
    const debtUsd = p.equityUsd * (lev - 1)
    const ltv = lev > 0 ? (lev - 1) / lev : 0
    const netApy = netLoopApy(p.yieldApyPct, p.borrowAprPct, lev)
    const spread = loopSpread(p.yieldApyPct, p.borrowAprPct)
    const liqPrice = liquidationPrice(p.collateralPriceUsd, lev, p.liqThreshold)
    const buffer = dropBuffer(p.collateralPriceUsd, liqPrice)
    const hf = (lev * p.liqThreshold) / Math.max(1e-9, lev - 1)
    return { collateralUsd, debtUsd, ltv, netApy, spread, liqPrice, buffer, hf }
  }, [lev, p])

  const hfBand = healthFactorBand(derived.hf)

  // Risk-zone track: green (HF>1.5) → amber (1.1–1.5) → red (<1.1).
  const zones = useMemo(() => {
    const pct = (k: number) => Math.min(1, Math.max(0, (k - 1) / (kMax - 1)))
    const greenEnd = pct(leverageAtHf(1.5, p.liqThreshold))
    const amberEnd = pct(leverageAtHf(1.1, p.liqThreshold))
    return { greenEnd, amberEnd, maxSafePct: amberEnd, currentPct: pct(lev) }
  }, [kMax, lev, p.liqThreshold])

  const projections = useMemo(
    () =>
      PROJECTION_HORIZONS.map((h) => {
        const cells = SCENARIO_ORDER.map((sid) => {
          const netApy = netLoopApy(scenarioYield(p.yieldApyPct, sid), scenarioCost(p.borrowAprPct, sid), lev)
          const value = p.equityUsd * Math.pow(1 + netApy / 100, h.days / 365)
          return { sid, value }
        })
        return { label: h.label, cells }
      }),
    [lev, p],
  )

  const spreadNegative = derived.spread <= 0

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

      {/* Leverage slider */}
      <OutlookCard
        title={t("Adjust leverage")}
        subtitle={`${p.collateralSymbol} / ${p.borrowSymbol} · ${t("max")} ${kMax.toFixed(1)}x`}
        right={
          <span className={`font-data text-[15px] font-medium tabular-nums ${hfBand.textClass}`}>
            {t("HF")} {formatHealthFactor(derived.hf)}
          </span>
        }
      >
        <input
          type="range"
          min={1}
          max={Number(kMax.toFixed(2))}
          step={0.05}
          value={lev}
          onChange={(e) => setLev(Number(e.target.value))}
          aria-label={t("Leverage multiplier")}
          className="w-full accent-primary"
        />
        {/* Risk-zone bar with max-safe + current markers */}
        <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, #16a34a 0%, #16a34a ${zones.greenEnd * 100}%, #f59e0b ${zones.greenEnd * 100}%, #f59e0b ${zones.amberEnd * 100}%, #F0444C ${zones.amberEnd * 100}%, #F0444C 100%)`,
            }}
          />
        </div>
        <div className="relative mt-1 h-4 w-full text-[10px] text-muted-foreground">
          <span className="absolute left-0">1.0x</span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap text-foreground/70"
            style={{ left: `${zones.maxSafePct * 100}%` }}
          >
            ▲ {t("max safe")}
          </span>
          <span className="absolute right-0">{kMax.toFixed(1)}x</span>
        </div>

        {spreadNegative ? (
          <div className="mt-3 rounded-radius-sm border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {t("Borrow cost exceeds yield — leverage is reducing your return, not increasing it.")}
          </div>
        ) : null}

        {/* Before → after */}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t("Collateral"), now: p.equityUsd, next: derived.collateralUsd },
            { label: t("Debt"), now: 0, next: derived.debtUsd },
            { label: t("Exposure"), now: p.equityUsd, next: derived.collateralUsd },
            { label: t("Net APY"), now: p.yieldApyPct, next: derived.netApy, pct: true },
          ].map((row) => (
            <div key={row.label} className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{row.label}</dt>
              <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-primary">
                {row.pct ? `${row.next.toFixed(2)}%` : m(formatUsdExact(row.next))}
              </dd>
              <dd className="text-[12px] text-muted-foreground">
                {t("from")} {row.pct ? `${row.now.toFixed(2)}%` : m(formatUsdExact(row.now))}
              </dd>
            </div>
          ))}
        </dl>
      </OutlookCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scenario projection table */}
        <OutlookCard title={t("Projected value")} subtitle={t("Equity value at this leverage, by scenario.")}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Horizon")}
                  </th>
                  {SCENARIO_ORDER.map((sid) => (
                    <th
                      key={sid}
                      className="pb-2 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {t(SCENARIOS[sid].label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {projections.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 font-medium text-foreground">{row.label}</td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.sid}
                        className={`py-2.5 text-right font-data tabular-nums ${cell.sid === "base" ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {m(formatUsdExact(cell.value))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground/80">
            {t("Estimate on {equity} equity. Assumes rates hold; leverage amplifies both gains and losses.").replace(
              "{equity}",
              m(formatUsdExact(p.equityUsd)),
            )}
          </p>
        </OutlookCard>

        {/* Price sensitivity */}
        <OutlookCard
          title={t("Price sensitivity")}
          subtitle={t("What a drop in collateral price does to your health factor.")}
        >
          <div className="space-y-2">
            {SENSITIVITY_DROPS.map((drop) => {
              const hf = derived.hf * (1 + drop)
              const band = healthFactorBand(hf)
              const liquidated = hf < 1
              return (
                <div
                  key={drop}
                  className="flex items-center justify-between rounded-radius-sm border border-border bg-background px-3 py-2.5"
                >
                  <span className="font-data text-[14px] tabular-nums text-foreground">
                    {pctText(drop)} {p.collateralSymbol}
                  </span>
                  <span className={`font-data text-[14px] font-medium tabular-nums ${band.textClass}`}>
                    {liquidated ? t("Liquidated") : `${t("HF")} ${formatHealthFactor(hf)}`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground/80">
            {t("At {lev}x, health factor moves ~1:1 with collateral price.").replace("{lev}", lev.toFixed(2))}
          </p>
        </OutlookCard>
      </div>
    </OutlookSection>
  )
}
