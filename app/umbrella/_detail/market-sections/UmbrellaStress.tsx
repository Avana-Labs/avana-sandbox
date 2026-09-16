"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { UmbrellaMarket } from "@/app/lib/umbrella-system/use-umbrella-session"
import { formatCompactUsd, formatPct } from "../format"

type MetricLabelProps = { label: string; tooltip: string }

function MetricLabel({ label, tooltip }: MetricLabelProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground">
      {label}
      <ActionMetricHelp text={tooltip} topic={label} />
    </span>
  )
}

function SurfaceMetricRow({
  label,
  value,
  tooltip,
  valueClassName,
}: {
  label: string
  value: string
  tooltip: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <MetricLabel label={label} tooltip={tooltip} />
      <span className={`text-[15px] font-semibold tabular-nums ${valueClassName ?? ""}`}>{value}</span>
    </div>
  )
}

/**
 * Surface-level risk metrics as label→value rows. Shared by the full market-risk
 * card and the compact Umbrella action sidebar (via UmbrellaMarketRiskMetricsCard).
 */
export function UmbrellaMarketRiskMetrics({ market }: { market: UmbrellaMarket }) {
  const { t } = useTranslation()
  const surface = `${market.hubLabel} → ${market.symbol} Spoke → ${market.symbol} Reserve`
  const explain = (text: string) => t(text).replace("{surface}", surface)

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[16px] font-semibold tracking-[-0.03em] text-foreground">{t("Surface details")}</h3>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{surface}</p>
      </div>

      <div className="space-y-3">
        <SurfaceMetricRow
          label={t("Local deductible")}
          value={formatCompactUsd(market.localDeductibleUsd)}
          tooltip={explain(
            "The amount of loss this Spoke is expected to absorb before DAO-level or Umbrella coverage is used for the {surface} surface. Why it matters: it keeps the first layer of risk local instead of immediately passing losses to the Hub or Umbrella stakers.",
          )}
        />
        <SurfaceMetricRow
          label={t("DAO first-loss offset")}
          value={formatCompactUsd(market.deficitOffsetUsd)}
          valueClassName="text-brand"
          tooltip={explain(
            "The amount the DAO is prepared to absorb after the local deductible is exhausted and before Umbrella stakers are slashed for the {surface} surface. Why it matters: it creates a visible protection layer ahead of stakers and aligns protocol economics with the risk being covered.",
          )}
        />
        <SurfaceMetricRow
          label={t("Hub tail target")}
          value={formatCompactUsd(market.hubTailTargetUsd)}
          tooltip={explain(
            "The maximum amount of catastrophic residual loss this Hub is designed to support for the {surface} surface after the local deductible and DAO first-loss layers are exhausted. Why it matters: it caps how much risk can flow back to the Hub and helps prevent one Spoke from consuming unlimited shared protection.",
          )}
        />
        <SurfaceMetricRow
          label={t("Active staker capital")}
          value={formatCompactUsd(market.totalStakedUsd)}
          tooltip={explain(
            "The amount of Umbrella capital currently staked and available to absorb eligible deficits for the {surface} surface. Why it matters: this is the actual slashable capital standing behind the surface after earlier protection layers are exhausted.",
          )}
        />
        <SurfaceMetricRow
          label={t("Target coverage")}
          value={formatCompactUsd(market.targetCoverageUsd)}
          tooltip={explain(
            "The target amount of active Umbrella capital for the {surface} surface. Why it matters: it provides the funding benchmark used to judge whether the surface is adequately protected.",
          )}
        />
        <SurfaceMetricRow
          label={t("Coverage ratio")}
          value={`${formatPct(market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0)}%`}
          tooltip={explain(
            "The ratio between active Umbrella capital and the target coverage amount for the {surface} surface. Why it matters: above 100% means the surface is funded above target; below 100% means coverage is under target and may require higher incentives or tighter limits.",
          )}
        />
        <SurfaceMetricRow
          label={t("APY")}
          value={`${formatPct(market.apy)}%`}
          tooltip={explain(
            "The current estimated annual yield for staking into the {surface} surface. APY can vary by Hub, Spoke, reserve, coverage utilization, incentives, and risk. Why it matters: higher-risk or under-covered surfaces may need higher APY to attract enough protection capital.",
          )}
        />
        <SurfaceMetricRow
          label={t("Cooldown queue")}
          value={formatCompactUsd(market.amountInCooldownUsd)}
          valueClassName="text-warning"
          tooltip={explain(
            "The amount of staked capital that has entered cooldown and is preparing to exit the {surface} surface. Why it matters: a large cooldown queue can reduce future available protection, so coverage can weaken quickly during periods of stress.",
          )}
        />
        <SurfaceMetricRow
          label={t("Coverage mode")}
          value={market.coverageMode}
          valueClassName="rounded-full bg-brand/10 px-2 py-0.5 text-[12px] text-brand"
          tooltip={explain(
            "Shows how the {surface} surface is currently protected and whether Umbrella is fully live. Live Umbrella means full Umbrella coverage is active. Why it matters: the mode tells users which protection layer is expected to absorb losses first.",
          )}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-[14px] font-semibold text-foreground">{t("APY breakdown")}</h4>
          <span className="text-[12px] tabular-nums text-muted-foreground">{formatPct(market.apy)}%</span>
        </div>
        <div className="mt-3 space-y-3">
          <SurfaceMetricRow
            label={t("Base")}
            value={`${formatPct(market.baseApy)}%`}
            tooltip={t("The core staking yield paid for providing protection capital to this surface.")}
          />
          <SurfaceMetricRow
            label={t("Liquidation recapture")}
            value={`${formatPct(market.liquidationRecaptureApy)}%`}
            tooltip={t(
              "The portion of yield supported by liquidation-linked economics generated by this reserve-per-Spoke surface, such as liquidation fees or SVR.",
            )}
          />
          <SurfaceMetricRow
            label={t("Incentives")}
            value={`${formatPct(market.incentiveApy)}%`}
            tooltip={t(
              "Additional rewards used to attract coverage capital, especially during bootstrap periods or when coverage is below target.",
            )}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Card-wrapped surface details for the action sidebar. Once the user has entered
 * an amount, `expanded` reveals the loss waterfall / deficit-offset detail below.
 */
export function UmbrellaMarketRiskMetricsCard({
  market,
  expanded = false,
}: {
  market: UmbrellaMarket
  expanded?: boolean
}) {
  return (
    <div className="rounded-radius-md bg-card px-4 py-4">
      <UmbrellaMarketRiskMetrics market={market} />
      {expanded ? <UmbrellaMarketRiskWaterfall market={market} /> : null}
    </div>
  )
}

/**
 * Loss waterfall + deficit-offset / active-deficit detail. Split out so the action
 * sidebar can reveal it only after an amount is entered, while the full market-risk
 * card always shows it.
 */
export function UmbrellaMarketRiskWaterfall({ market }: { market: UmbrellaMarket }) {
  const { t } = useTranslation()
  const stakerExposure = Math.max(market.currentDeficitUsd - market.deficitOffsetUsd, 0)
  const coverageRatioPct = market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0

  return (
    <div className="mt-5 border-t border-border pt-4">
      {/* Loss waterfall: the full bar is Avana's offset capacity. Amber fill
          grows with the current active deficit; if the deficit spills past
          the offset a red segment extends past 100% to visualise Staker
          Exposure. */}
      {(() => {
        const offsetSpan = Math.max(market.deficitOffsetUsd, 1)
        const consumedShare = Math.min(1, market.currentDeficitUsd / offsetSpan) * 100
        const exposureShare = stakerExposure > 0 ? Math.min(60, (stakerExposure / offsetSpan) * 100) : 0
        const offsetTrackShare = 100 - Math.min(100, exposureShare)
        const consumedInsideTrack = (consumedShare / 100) * offsetTrackShare
        return (
          <div className="flex h-2.5 overflow-hidden rounded-full bg-brand/25">
            <div className="relative h-full" style={{ width: `${offsetTrackShare}%` }}>
              <div className="h-full bg-warning" style={{ width: `${consumedInsideTrack}%` }} />
            </div>
            {exposureShare > 0 ? <div className="h-full bg-danger" style={{ width: `${exposureShare}%` }} /> : null}
          </div>
        )
      })()}

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <MetricLabel
            label={t("Deficit Offset")}
            tooltip={t(
              "Amount Avana covers first before user-staked coverage is exposed. Stakers only take losses once realized deficits exceed this offset.",
            )}
          />
          <span className="text-[15px] font-semibold tabular-nums text-brand">
            {formatCompactUsd(market.deficitOffsetUsd)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MetricLabel
            label={t("Active Deficit")}
            tooltip={t(
              "Current realized shortfall in {symbol}. Staker Exposure = max(Active Deficit − Deficit Offset, 0). Current staker exposure: {exposure}.",
            )
              .replace("{symbol}", market.symbol)
              .replace("{exposure}", formatCompactUsd(stakerExposure))}
          />
          <span className="text-[15px] font-semibold tabular-nums text-danger">
            {formatCompactUsd(market.currentDeficitUsd)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MetricLabel label={t("Target")} tooltip={t("Desired amount of user-staked coverage for this asset.")} />
          <span className="text-[15px] font-semibold tabular-nums">{formatPct(coverageRatioPct)}%</span>
        </div>
      </div>
    </div>
  )
}

export function UmbrellaStress() {
  const { t } = useTranslation()
  const umbrella = useUmbrellaSessionContext()
  const umbrellaAssetSummaries = umbrella.marketOrder.map((id) => umbrella.markets[id])
  const totalStakedUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.totalStakedUsd, 0)
  const targetCoverageUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.targetCoverageUsd, 0)
  const activeDeficitsUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.currentDeficitUsd, 0)
  // Market-wide cooldown = sum of each market's cooling coverage. Not
  // dependent on the viewing wallet's own cooldown state.
  const cooldownUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.amountInCooldownUsd, 0)

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Market Level Risk")}
        </h2>
      </div>

      <div className="rounded-radius-md bg-card px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[13px] text-muted-foreground">{t("Total coverage")}</p>
          <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
            {formatCompactUsd(totalStakedUsd)}
          </p>
        </div>

        {/* Total coverage bar: split between active coverage (blue) and coverage
            currently in cooldown (amber). Widths reflect the real ratios. */}
        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full bg-brand"
            style={{
              width: `${totalStakedUsd > 0 ? ((totalStakedUsd - cooldownUsd) / totalStakedUsd) * 100 : 0}%`,
            }}
          />
          <div
            className="h-full bg-warning"
            style={{
              width: `${totalStakedUsd > 0 ? (cooldownUsd / totalStakedUsd) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.04em] text-brand">
              {t("{pct}% of target").replace(
                "{pct}",
                formatPct(targetCoverageUsd > 0 ? (totalStakedUsd / targetCoverageUsd) * 100 : 0),
              )}
            </div>
            <div className="mt-2 text-[14px] font-medium text-muted-foreground">
              {t("{staked} staked · {target} target")
                .replace("{staked}", formatCompactUsd(totalStakedUsd))
                .replace("{target}", formatCompactUsd(targetCoverageUsd))}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[18px] font-semibold tracking-[-0.04em] text-warning">
              {t("{amount} in cooldown").replace("{amount}", formatCompactUsd(cooldownUsd))}
            </div>
            <div className="mt-2 text-[14px] font-medium text-muted-foreground">
              {t("{pct}% of coverage cooling · {deficits} deficits absorbed")
                .replace("{pct}", formatPct(totalStakedUsd > 0 ? (cooldownUsd / totalStakedUsd) * 100 : 0))
                .replace("{deficits}", formatCompactUsd(activeDeficitsUsd))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
