"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
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
import { formatCompactUsd, formatPct, formatUsd } from "../format"

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
  claimedRewardsLabel: string
  status: string
  cooldownStatus: "idle" | "cooling" | "ready" | "expired"
  hasClaim: boolean
  hasUnstake: boolean
  coverageRatioPct: number
  coverageRatioLabel: string
  targetLiquidityLabel: string
}

function statusLabelKey(status: PositionRow["cooldownStatus"]): string {
  switch (status) {
    case "ready":
      return "Withdrawal ready"
    case "cooling":
      return "In cooldown"
    case "expired":
      return "Cooldown expired"
    default:
      return "Earning"
  }
}

export function UmbrellaPositions({ onSelectMarket }: { onSelectMarket?: (marketId: UmbrellaMarketId) => void }) {
  const { t } = useTranslation()
  const umbrella = useUmbrellaSessionContext()
  const rows: PositionRow[] = umbrella.marketOrder.map((id) => {
    const market = umbrella.markets[id]
    const position = umbrella.positions[id]
    const activeStakeUsd = Math.max(position.valueUsd - position.cooldownValueUsd, 0)
    const coverageRatioPct = market.targetCoverageUsd > 0 ? (market.totalStakedUsd / market.targetCoverageUsd) * 100 : 0
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
      claimedRewardsLabel: formatUsd(position.claimedRewardsUsd),
      status: t(statusLabelKey(position.cooldownStatus)),
      cooldownStatus: position.cooldownStatus,
      hasClaim: position.pendingRewardsUsd > 0,
      hasUnstake: position.cooldownStatus === "ready",
      coverageRatioPct,
      coverageRatioLabel: t("{pct}% of target").replace("{pct}", formatPct(coverageRatioPct)),
      targetLiquidityLabel: t("{amount} target").replace("{amount}", formatCompactUsd(market.targetCoverageUsd)),
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
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Umbrella positions")}
        </h2>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>{t("Asset")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Active stake")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Cooling")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("APY")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Rewards")}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Status")}</th>
                <SilentActionHeader className="!rounded-none pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {showEmptyState ? (
                <tr>
                  <td colSpan={7} className="py-8 pl-5 pr-5 text-center">
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
                          <span className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {row.coverage} · {row.coverageRatioLabel}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                        {row.activeStakeLabel}
                      </span>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <span
                        className={cn(
                          "text-[15px] font-normal tracking-[-0.03em]",
                          row.coolingUsd > 0 ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {row.coolingLabel}
                      </span>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <div className="flex flex-col items-end">
                        <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                          {t("{value} total").replace("{value}", row.apyTotal)}
                        </span>
                        <span className="mt-0.5 text-[12px] text-muted-foreground" title={row.targetLiquidityLabel}>
                          {t("base {base} + reward {reward}")
                            .replace("{base}", row.apyBase)
                            .replace("{reward}", row.apyReward)}
                        </span>
                      </div>
                    </td>
                    <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                      <div className="flex flex-col items-end">
                        <span className="text-[15px] font-normal tracking-[-0.03em] text-success">
                          {row.pendingRewardsLabel}
                        </span>
                        <span className="mt-0.5 text-[12px] text-muted-foreground">
                          {t("{amount} claimed").replace("{amount}", row.claimedRewardsLabel)}
                        </span>
                      </div>
                    </td>
                    <td className={cn("py-3.5 px-4 text-center", TABLE_ROW_HOVER_BG)}>
                      <span
                        className={cn(
                          "inline-block max-w-full whitespace-normal text-[15px] font-normal leading-5 tracking-[-0.03em]",
                          row.cooldownStatus === "expired" ? "text-danger" : "text-foreground dark:text-white",
                        )}
                      >
                        {row.status}
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
                        {row.hasUnstake ? (
                          <Button asChild size="table" variant="table-primary" className="w-auto">
                            <Link
                              href={actionPagePath("umbrella", "unstake", {
                                market: row.id,
                                return: "/umbrella",
                              })}
                            >
                              <ActionIcon label={t("Unstake")} />
                              {t("Unstake")}
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
          <div className="flex flex-col items-center gap-3 rounded-radius-md bg-card px-3 py-6 text-center">
            <span className="text-[14px] text-muted-foreground">{t("You have no Umbrella positions yet.")}</span>
            <Button asChild size="sm" variant="brand" className="h-10 w-full gap-2">
              <Link href={actionPagePath("umbrella", "stake", { return: "/umbrella" })}>
                <ActionIcon label={t("Stake")} />
                {t("Stake")}
              </Link>
            </Button>
          </div>
        ) : (
          visible.map((row) => (
            <div key={row.id} className="rounded-radius-md bg-card px-3 py-3" onClick={() => handleRowClick(row.id)}>
              <div className="flex items-center gap-3">
                <TokenIcon symbol={row.symbol} size="table" />
                <div>
                  <div className="font-semibold text-foreground">{row.asset}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {row.coverage} · {row.coverageRatioLabel}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{row.targetLiquidityLabel}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[13px] text-muted-foreground">{t("Active stake")}</div>
                  <div className="font-medium">{row.activeStakeLabel}</div>
                </div>
                <div>
                  <div className="text-[13px] text-muted-foreground">{t("Cooling")}</div>
                  <div className={cn("font-medium", row.coolingUsd > 0 ? "text-warning" : "text-muted-foreground")}>
                    {row.coolingLabel}
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-muted-foreground">{t("APY")}</div>
                  <div className="font-medium">{row.apyTotal}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {t("base {base} + reward {reward}")
                      .replace("{base}", row.apyBase)
                      .replace("{reward}", row.apyReward)}
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-muted-foreground">{t("Status")}</div>
                  <div className={cn("font-medium", row.cooldownStatus === "expired" && "text-danger")}>
                    {row.status}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[13px] text-muted-foreground">{t("Rewards")}</div>
                  <div className="font-medium text-success">
                    {t("{amount} pending").replace("{amount}", row.pendingRewardsLabel)}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {t("{amount} claimed").replace("{amount}", row.claimedRewardsLabel)}
                  </div>
                </div>
              </div>

              {(row.hasClaim || row.hasUnstake) && (
                <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                  {row.hasClaim ? (
                    <Button asChild size="sm" variant="brand-secondary" className="h-9 flex-1 gap-2">
                      <Link
                        href={actionPagePath("umbrella", "claim", {
                          market: row.id,
                          return: "/umbrella",
                        })}
                      >
                        <ActionIcon label="Claim" />
                        Claim
                      </Link>
                    </Button>
                  ) : null}
                  {row.hasUnstake ? (
                    <Button asChild size="sm" variant="brand" className="h-9 flex-1 gap-2">
                      <Link
                        href={actionPagePath("umbrella", "unstake", {
                          market: row.id,
                          return: "/umbrella",
                        })}
                      >
                        <ActionIcon label="Unstake" />
                        Unstake
                      </Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
