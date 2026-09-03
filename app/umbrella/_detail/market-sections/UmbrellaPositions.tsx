"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import {
  MarketMobileActionFooter,
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
  MarketMobileSupportingValue,
} from "@/app/components/market-card-primitives"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"
import { formatPct, formatUsd } from "../format"

type PositionRow = {
  id: UmbrellaMarketId
  asset: string
  symbol: string
  coverage: string
  activeStakeUsd: number
  coolingUsd: number
  activeStakeLabel: string
  coolingLabel: string
  apyTotal: string
  apyBase: string
  apyReward: string
  pendingRewards: number
  pendingRewardsLabel: string
  claimedRewardsUsd: number
  claimedRewardsLabel: string
  cooldownStatus: "idle" | "cooling" | "ready" | "expired"
  hasClaim: boolean
}

export function UmbrellaPositions({ onSelectMarket }: { onSelectMarket?: (marketId: UmbrellaMarketId) => void }) {
  const { t } = useTranslation()
  const umbrella = useUmbrellaSessionContext()
  const rows: PositionRow[] = umbrella.marketOrder.map((id) => {
    const market = umbrella.markets[id]
    const position = umbrella.positions[id]
    const activeStakeUsd = Math.max(position.valueUsd - position.cooldownValueUsd, 0)
    return {
      id,
      asset: market.asset,
      symbol: market.symbol,
      coverage: market.coverage,
      activeStakeUsd,
      coolingUsd: position.cooldownValueUsd,
      activeStakeLabel: formatUsd(activeStakeUsd),
      coolingLabel: formatUsd(position.cooldownValueUsd),
      apyTotal: `${formatPct(market.apy)}%`,
      apyBase: `${formatPct(market.baseApy)}%`,
      apyReward: `${formatPct(market.rewardApy)}%`,
      pendingRewards: position.pendingRewardsUsd,
      pendingRewardsLabel: formatUsd(position.pendingRewardsUsd),
      claimedRewardsUsd: position.claimedRewardsUsd,
      claimedRewardsLabel: formatUsd(position.claimedRewardsUsd),
      cooldownStatus: position.cooldownStatus,
      hasClaim: position.pendingRewardsUsd > 0,
    }
  })

  const idleRow = (row: PositionRow) => row.activeStakeUsd === 0 && row.coolingUsd === 0 && row.pendingRewards === 0
  const nonIdle = rows.filter((row) => !idleRow(row))
  const showEmptyState = nonIdle.length === 0
  const visible = showEmptyState ? [] : nonIdle

  const handleRowClick = (id: UmbrellaMarketId) => {
    onSelectMarket?.(id)
  }

  return (
    <section aria-label={t("Umbrella positions")}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Umbrella positions")}
        </h2>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>{t("Asset")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Active stake")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("APY")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Rewards")}</th>
                <SilentActionHeader className="!rounded-none pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {showEmptyState ? (
                <tr>
                  <td colSpan={5} className="py-8 pl-5 pr-5 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <span className="text-[14px] text-muted-foreground">
                        {t("You have no Umbrella positions yet.")}
                      </span>
                      <Button asChild size="table" variant="table-primary" className="w-auto">
                        <Link href={actionPagePath("umbrella", "stake", { return: "/umbrella" })}>
                          <ActionIcon label={t("Stake")} />
                          {t("Stake")}
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr
                    key={row.id}
                    className="group cursor-pointer transition-colors"
                    onClick={() => handleRowClick(row.id)}
                  >
                    <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={row.symbol} size="table" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                            {row.asset}
                          </span>
                          <span className="mt-0.5 truncate text-[13px] text-muted-foreground">{row.coverage}</span>
                        </div>
                      </div>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <div className="flex flex-col items-end">
                        <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                          {row.activeStakeLabel}
                        </span>
                        {row.coolingUsd > 0 ? (
                          <span className="mt-0.5 text-[12px] text-warning">
                            {t("{amount} cooling").replace("{amount}", row.coolingLabel)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <span
                        className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white"
                        title={t("base {base} + reward {reward}")
                          .replace("{base}", row.apyBase)
                          .replace("{reward}", row.apyReward)}
                      >
                        {row.apyTotal}
                      </span>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <span className="text-[15px] font-normal tracking-[-0.03em] text-success">
                        {row.pendingRewardsLabel}
                      </span>
                    </td>
                    <td
                      className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <HoverActionGroup className="justify-end">
                        {row.hasClaim ? (
                          <Button asChild size="table" variant="table-secondary" className="w-auto">
                            <Link
                              href={actionPagePath("umbrella", "claim", {
                                market: row.id,
                                return: "/umbrella",
                              })}
                            >
                              <ActionIcon label={t("Claim")} />
                              {t("Claim")}
                            </Link>
                          </Button>
                        ) : null}
                      </HoverActionGroup>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>

      <div className="space-y-2 md:hidden">
        {showEmptyState ? (
          <MarketMobileCard className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-[14px] text-muted-foreground">{t("You have no Umbrella positions yet.")}</span>
            <Button asChild size="sm" variant="brand" className="h-10 w-full gap-2">
              <Link href={actionPagePath("umbrella", "stake", { return: "/umbrella" })}>
                <ActionIcon label={t("Stake")} />
                {t("Stake")}
              </Link>
            </Button>
          </MarketMobileCard>
        ) : (
          visible.map((row) => (
            <MarketMobileCard key={row.id} clickable className="space-y-2" onClick={() => handleRowClick(row.id)}>
              <MarketMobileCardHeader
                identity={
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TokenIcon symbol={row.symbol} size="table" />
                    <MarketMobileIdentityText title={row.asset} subtitle={row.coverage} />
                  </div>
                }
                metric={<MarketMobileMetric value={row.apyTotal} label={t("APY")} />}
              />
              <MarketMobileStatList>
                <MarketMobileStatRow label={t("Active stake")} value={row.activeStakeLabel} />
                {row.coolingUsd > 0 ? (
                  <MarketMobileStatRow
                    label={t("Cooling")}
                    value={row.coolingLabel}
                    valueClassName="text-warning"
                  />
                ) : null}
                <MarketMobileStatRow
                  label={t("Rewards")}
                  value={
                    <span>
                      {row.pendingRewardsLabel}
                      {row.claimedRewardsUsd > 0 ? (
                        <MarketMobileSupportingValue>
                          {t("{amount} claimed").replace("{amount}", row.claimedRewardsLabel)}
                        </MarketMobileSupportingValue>
                      ) : null}
                    </span>
                  }
                  valueClassName="text-success"
                />
              </MarketMobileStatList>
              {row.hasClaim ? (
                <div onClick={(event) => event.stopPropagation()}>
                  <MarketMobileActionFooter columns={1}>
                    <Button
                      asChild
                      variant="brand"
                      className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-normal"
                    >
                      <Link
                        href={actionPagePath("umbrella", "claim", {
                          market: row.id,
                          return: "/umbrella",
                        })}
                      >
                        <ActionIcon label={t("Claim")} />
                        {t("Claim")}
                      </Link>
                    </Button>
                  </MarketMobileActionFooter>
                </div>
              ) : null}
            </MarketMobileCard>
          ))
        )}
      </div>
    </section>
  )
}
