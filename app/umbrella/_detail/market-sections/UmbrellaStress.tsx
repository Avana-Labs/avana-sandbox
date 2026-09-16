"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import { TokenIcon } from "@/app/components/token-icon"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { UmbrellaMarket, UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import { formatCompactUsd, formatPct, formatUsd } from "../format"
import type { ReactNode } from "react"

type MetricLabelProps = { label: string; tooltip: string; dense?: boolean }

function MetricLabel({ label, tooltip, dense = false }: MetricLabelProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-muted-foreground ${dense ? "text-[14px] leading-snug" : "text-[14px]"}`}
    >
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
  animateValue = false,
  dense = false,
}: {
  label: string
  value: ReactNode
  tooltip: string
  valueClassName?: string
  animateValue?: boolean
  dense?: boolean
}) {
  if (dense) {
    return (
      <article className="min-w-0">
        <MetricLabel label={label} tooltip={tooltip} dense />
        <span
          className={`mt-2 block font-data text-[22px] font-normal leading-none tracking-[-0.01em] tabular-nums ${valueClassName ?? "text-foreground"}`}
        >
          {animateValue && typeof value === "string" ? <AnimatedTextValue text={value} animateOnMount /> : value}
        </span>
      </article>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <MetricLabel label={label} tooltip={tooltip} />
      <span className={`text-[15px] font-semibold tabular-nums ${valueClassName ?? ""}`}>
        {animateValue && typeof value === "string" ? <AnimatedTextValue text={value} animateOnMount /> : value}
      </span>
    </div>
  )
}

function surfaceLabel(market: UmbrellaMarket) {
  return `${market.hubLabel} → ${market.symbol} Spoke → ${market.symbol} Reserve`
}

function surfaceDescription(market: UmbrellaMarket) {
  const hubName = market.hubLabel.replace(/\s+Hub$/, "")
  return `This covers deficits impacting ${hubName} LP Hub ${market.symbol} suppliers, including deficits originated by All Spokes borrowing the ${market.symbol} reserve.`
}

function explainSurface(t: (key: string) => string, market: UmbrellaMarket, text: string) {
  return t(text).replace("{surface}", surfaceLabel(market))
}

/** The compact first box used by Umbrella action pages. */
export function UmbrellaMarketRiskMetrics({ market }: { market: UmbrellaMarket }) {
  const { t } = useTranslation()
  const coverageRatioPct = market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0

  return (
    <div className="space-y-3">
      <SurfaceMetricRow
        label={t("Coverage")}
        value={formatCompactUsd(market.totalStakedUsd)}
        tooltip={t("Active Umbrella capital currently available to absorb eligible deficits for this asset.")}
        animateValue
      />
      <SurfaceMetricRow
        label={t("Target")}
        value={
          <span className="inline-flex items-center gap-1.5">
            <AnimatedTextValue text={formatCompactUsd(market.targetCoverageUsd)} animateOnMount />
            <span aria-hidden>·</span>
            <AnimatedTextValue text={`${formatPct(coverageRatioPct)}%`} animateOnMount />
          </span>
        }
        tooltip={t("Desired coverage amount for this asset, followed by the current active-capital coverage ratio.")}
      />
      <SurfaceMetricRow
        label={t("Deficit Offset")}
        value={formatCompactUsd(market.deficitOffsetUsd)}
        valueClassName="text-brand"
        tooltip={t(
          "Amount covered first before user-staked coverage is exposed. Stakers only take losses once realized deficits exceed this offset.",
        )}
        animateValue
      />
      <SurfaceMetricRow
        label={t("Active Deficit")}
        value={formatCompactUsd(market.currentDeficitUsd)}
        valueClassName="text-danger"
        tooltip={t(
          "Current realized shortfall in {symbol}. Staker exposure is the active deficit remaining after the deficit offset.",
        ).replace("{symbol}", market.symbol)}
        animateValue
      />
    </div>
  )
}

function UmbrellaApyBreakdownRows({
  market,
  estimatedAnnualRewardsUsd,
}: {
  market: UmbrellaMarket
  estimatedAnnualRewardsUsd?: number
}) {
  const { t } = useTranslation()
  const apyRows = [
    {
      label: t("Base"),
      value: market.baseApy,
      colorClassName: "bg-brand",
      tooltip: t("The core staking yield paid for providing protection capital to this surface."),
    },
    {
      label: t("Liquidation recapture"),
      value: market.liquidationRecaptureApy,
      colorClassName: "bg-brand/70",
      tooltip: t(
        "The portion of yield supported by liquidation-linked economics generated by this reserve-per-Spoke surface, such as liquidation fees or SVR.",
      ),
    },
    {
      label: t("Incentives"),
      value: market.incentiveApy,
      colorClassName: "bg-brand/45",
      tooltip: t(
        "Additional rewards used to attract coverage capital, especially during bootstrap periods or when coverage is below target.",
      ),
    },
  ]
  const contributionTotal = apyRows.reduce((sum, row) => sum + Math.max(row.value, 0), 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">{t("APY breakdown")}</h3>
            <ActionMetricHelp
              topic={t("APY breakdown")}
              text="The estimated annual yield for keeping Umbrella capital available as coverage for this market."
            />
          </div>
          <AnimatedTextValue
            text={`${formatPct(market.apy)}%`}
            animateOnMount
            className="mt-2 font-data text-[30px] font-medium leading-none tracking-[-0.04em] text-foreground"
          />
        </div>
      </div>

      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted/60" aria-label="APY contribution bar">
        {apyRows.map((row) => (
          <div
            key={row.label}
            className={`h-full ${row.colorClassName}`}
            style={{ width: `${contributionTotal > 0 ? (Math.max(row.value, 0) / contributionTotal) * 100 : 0}%` }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-3.5">
        {apyRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-full ${row.colorClassName}`} aria-hidden />
              <span className="truncate text-[14px] text-muted-foreground">{row.label}</span>
              <ActionMetricHelp text={row.tooltip} topic={row.label} />
            </div>
            <AnimatedTextValue
              text={`${formatPct(row.value)}%`}
              animateOnMount
              className="shrink-0 font-data text-[14px] font-medium tabular-nums text-foreground"
            />
          </div>
        ))}
      </div>

      {estimatedAnnualRewardsUsd !== undefined ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              Est. annual rewards
              <ActionMetricHelp
                text="A simulation of the rewards earned over one year at the current APY, based on the amount you entered."
                topic="Est. annual rewards"
              />
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Based on amount entered</p>
          </div>
          <AnimatedTextValue
            text={formatUsd(estimatedAnnualRewardsUsd)}
            animateOnMount
            className="shrink-0 font-data text-[16px] font-medium tabular-nums text-brand"
          />
        </div>
      ) : null}
    </div>
  )
}

/** Compact action-page details: primary metrics first, then optional expanded APY details. */
export function UmbrellaMarketRiskMetricsCard({
  market,
  showExpandedDetails = false,
  estimatedAnnualRewardsUsd,
}: {
  market: UmbrellaMarket
  showExpandedDetails?: boolean
  estimatedAnnualRewardsUsd?: number
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-radius-md bg-card px-4 py-4">
        <UmbrellaMarketRiskMetrics market={market} />
      </div>
      {showExpandedDetails ? (
        <div className="rounded-radius-md bg-card px-4 py-4">
          <UmbrellaApyBreakdownRows market={market} estimatedAnnualRewardsUsd={estimatedAnnualRewardsUsd} />
        </div>
      ) : null}
    </div>
  )
}

function UmbrellaSurfaceDetailsRows({ market }: { market: UmbrellaMarket }) {
  const { t } = useTranslation()
  const explain = (text: string) => explainSurface(t, market, text)
  const coverageRatioPct = market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4 lg:gap-x-8">
      <SurfaceMetricRow
        label={t("Local deductible")}
        value={formatCompactUsd(market.localDeductibleUsd)}
        dense
        tooltip={explain(
          "The amount of loss this Spoke is expected to absorb before DAO-level or Umbrella coverage is used for the {surface} surface. Why it matters: it keeps the first layer of risk local instead of immediately passing losses to the Hub or Umbrella stakers.",
        )}
      />
      <SurfaceMetricRow
        label={t("DAO first-loss offset")}
        value={formatCompactUsd(market.deficitOffsetUsd)}
        valueClassName="text-brand"
        dense
        tooltip={explain(
          "The amount the DAO is prepared to absorb after the local deductible is exhausted and before Umbrella stakers are slashed for the {surface} surface. Why it matters: it creates a visible protection layer ahead of stakers and aligns protocol economics with the risk being covered.",
        )}
      />
      <SurfaceMetricRow
        label={t("Hub tail target")}
        value={formatCompactUsd(market.hubTailTargetUsd)}
        dense
        tooltip={explain(
          "The maximum amount of catastrophic residual loss this Hub is designed to support for the {surface} surface after the local deductible and DAO first-loss layers are exhausted. Why it matters: it caps how much risk can flow back to the Hub and helps prevent one Spoke from consuming unlimited shared protection.",
        )}
      />
      <SurfaceMetricRow
        label={t("Active staker capital")}
        value={formatCompactUsd(market.totalStakedUsd)}
        dense
        tooltip={explain(
          "The amount of Umbrella capital currently staked and available to absorb eligible deficits for the {surface} surface. Why it matters: this is the actual slashable capital standing behind the surface after earlier protection layers are exhausted.",
        )}
      />
      <SurfaceMetricRow
        label={t("Target coverage")}
        value={formatCompactUsd(market.targetCoverageUsd)}
        dense
        tooltip={explain(
          "The target amount of active Umbrella capital for the {surface} surface. Why it matters: it provides the funding benchmark used to judge whether the surface is adequately protected.",
        )}
      />
      <SurfaceMetricRow
        label={t("Coverage ratio")}
        value={`${formatPct(coverageRatioPct)}%`}
        dense
        tooltip={explain(
          "The ratio between active Umbrella capital and the target coverage amount for the {surface} surface. Why it matters: above 100% means the surface is funded above target; below 100% means coverage is under target and may require higher incentives or tighter limits.",
        )}
      />
      <SurfaceMetricRow
        label={t("APY")}
        value={`${formatPct(market.apy)}%`}
        dense
        tooltip={explain(
          "The current estimated annual yield for staking into the {surface} surface. APY can vary by Hub, Spoke, reserve, coverage utilization, incentives, and risk. Why it matters: higher-risk or under-covered surfaces may need higher APY to attract enough protection capital.",
        )}
      />
      <SurfaceMetricRow
        label={t("Cooldown queue")}
        value={formatCompactUsd(market.amountInCooldownUsd)}
        valueClassName="text-warning"
        dense
        tooltip={explain(
          "The amount of staked capital that has entered cooldown and is preparing to exit the {surface} surface. Why it matters: a large cooldown queue can reduce future available protection, so coverage can weaken quickly during periods of stress.",
        )}
      />
    </div>
  )
}

export function UmbrellaSurfaceDetails({
  marketId,
  onMarketChange,
}: {
  marketId: UmbrellaMarketId
  onMarketChange: (marketId: UmbrellaMarketId) => void
}) {
  const { t } = useTranslation()
  const umbrella = useUmbrellaSessionContext()
  const market = umbrella.markets[marketId]

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Surface details")}
        </h2>
        <div className="flex shrink-0 items-center gap-2" role="tablist" aria-label={t("Umbrella surface details")}>
          {umbrella.marketOrder.map((id) => {
            const tabMarket = umbrella.markets[id]
            const active = id === marketId
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={t("View {symbol} surface details").replace("{symbol}", tabMarket.symbol)}
                title={tabMarket.symbol}
                onClick={() => onMarketChange(id)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-foreground/40 hover:bg-hover aria-selected:border-brand aria-selected:bg-brand/10 aria-selected:ring-2 aria-selected:ring-brand/20"
              >
                <TokenIcon symbol={tabMarket.symbol} size="sm" />
              </button>
            )
          })}
        </div>
      </div>
      <p className="-mt-2 mb-6 max-w-3xl text-[13px] leading-5 text-muted-foreground">{surfaceDescription(market)}</p>

      <UmbrellaSurfaceDetailsRows market={market} />
    </section>
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
