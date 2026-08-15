"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { TokenIcon } from "@/app/components/token-icon"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
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

function AssetCard({ market }: { market: UmbrellaMarket }) {
  const stakerExposure = Math.max(market.currentDeficitUsd - market.deficitOffsetUsd, 0)
  const coverageRatioPct = market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0

  return (
    <div className="h-full rounded-radius-md bg-card px-4 py-4">
      <div className="flex items-center gap-3.5">
        <TokenIcon symbol={market.symbol} size="table" className="size-16" />
        <div>
          <div className="text-[18px] font-semibold tracking-[-0.04em]">{market.symbol}</div>
          <div className="mt-0.5 text-[14px] text-muted-foreground">{market.coverage}</div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <MetricLabel
            label="Coverage"
            tooltip="Total user-staked capital available to absorb losses for this asset."
          />
          <span className="text-[15px] font-semibold tabular-nums">{formatCompactUsd(market.totalStakedUsd)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MetricLabel label="Target" tooltip="Desired amount of user-staked coverage for this asset." />
          <span className="text-[15px] font-semibold tabular-nums">{formatCompactUsd(market.targetCoverageUsd)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MetricLabel label="APY" tooltip="Estimated annual staking yield paid to stakers of this asset." />
          <span className="text-[15px] font-semibold tabular-nums">{formatPct(market.apy)}%</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MetricLabel
            label="Cooldown"
            tooltip="Coverage currently in cooldown across all stakers of this asset. Cooldown positions still absorb losses until they finish the 20-day wait and are unstaked."
          />
          <span className="text-[15px] font-semibold tabular-nums">
            {formatCompactUsd(market.amountInCooldownUsd)}
          </span>
        </div>
      </div>

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
              {exposureShare > 0 ? (
                <div className="h-full bg-danger" style={{ width: `${exposureShare}%` }} />
              ) : null}
            </div>
          )
        })()}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.04em] text-brand">
              {formatCompactUsd(market.deficitOffsetUsd)} deficit offset
              <ActionMetricHelp
                text="Amount Avana covers first before user-staked coverage is exposed. Stakers only take losses once realized deficits exceed this offset."
                topic="Deficit Offset"
              />
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="inline-flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.04em] text-danger sm:flex-row-reverse">
              {formatCompactUsd(market.currentDeficitUsd)} active deficit
              <ActionMetricHelp
                text={`Current realized shortfall in ${market.symbol}. Staker Exposure = max(Active Deficit − Deficit Offset, 0). Current staker exposure: ${formatCompactUsd(stakerExposure)}.`}
                topic="Active Deficit"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 text-[12px] text-muted-foreground">
          {formatPct(coverageRatioPct)}% of target coverage.
        </div>
      </div>
    </div>
  )
}

export function UmbrellaStress() {
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()
  const umbrella = useUmbrellaSessionContext()
  const umbrellaAssetSummaries = umbrella.marketOrder.map((id) => umbrella.markets[id])
  const totalStakedUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.totalStakedUsd, 0)
  const targetCoverageUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.targetCoverageUsd, 0)
  const activeDeficitsUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.currentDeficitUsd, 0)
  const totalDeficitOffsetUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.deficitOffsetUsd, 0)
  const totalStakerExposureUsd = umbrellaAssetSummaries.reduce(
    (sum, market) => sum + Math.max(market.currentDeficitUsd - market.deficitOffsetUsd, 0),
    0,
  )
  // Market-wide cooldown = sum of each market's cooling coverage. Not
  // dependent on the viewing wallet's own cooldown state.
  const cooldownUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.amountInCooldownUsd, 0)

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Market Level Risk
        </h2>
        <CarouselArrowButtons
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => scrollByCard(-1)}
          onNext={() => scrollByCard(1)}
          prevLabel="Previous market risk"
          nextLabel="Next market risk"
        />
      </div>

      <div className="space-y-3">
        <div className="rounded-radius-md bg-card px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[13px] text-muted-foreground">Total coverage</p>
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
                {formatPct(targetCoverageUsd > 0 ? (totalStakedUsd / targetCoverageUsd) * 100 : 0)}% of target
              </div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                {formatCompactUsd(totalStakedUsd)} staked · {formatCompactUsd(targetCoverageUsd)} target · 4 assets
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-danger">
                {formatCompactUsd(cooldownUsd)} in cooldown
              </div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                {formatPct(totalStakedUsd > 0 ? (cooldownUsd / totalStakedUsd) * 100 : 0)}% cooling ·{" "}
                {formatCompactUsd(activeDeficitsUsd)} active deficits · {formatCompactUsd(totalStakerExposureUsd)}{" "}
                on stakers of {formatCompactUsd(totalDeficitOffsetUsd)} offset
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-full gap-3">
            {umbrellaAssetSummaries.map((asset) => (
              <li
                key={asset.id}
                data-carousel-card
                className="w-[min(320px,88%)] shrink-0 snap-start md:w-[360px]"
              >
                <AssetCard market={asset} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
