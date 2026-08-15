"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { UmbrellaMarket, UmbrellaPosition } from "@/app/lib/umbrella-system/use-umbrella-session"
import { deriveUmbrellaPositionStatus, type UmbrellaPositionStatus } from "@/app/lib/umbrella-system/portfolio-mapper"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { formatUsd, formatPct } from "@/app/umbrella/_detail/format"
import { cn } from "@/lib/utils"

const MASK = "••••"
const RETURN_HREF = "/dashboard?tab=wallet"

const STATUS_LABEL: Record<UmbrellaPositionStatus, string> = {
  active: "Active",
  partiallyCooling: "Partially cooling",
  coolingDown: "Cooling down",
  readyToUnstake: "Ready to unstake",
  cooldownExpired: "Cooldown expired",
  slashed: "Slashed",
  closed: "Closed",
}

const STATUS_TONE: Record<UmbrellaPositionStatus, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-success",
  partiallyCooling: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  coolingDown: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  readyToUnstake: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  cooldownExpired: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  slashed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  closed: "border-border bg-muted text-muted-foreground",
}

type UmbrellaDashboardRow = {
  marketId: UmbrellaPosition["marketId"]
  market: UmbrellaMarket
  position: UmbrellaPosition
  status: UmbrellaPositionStatus
  activeUsd: number
  coolingUsd: number
}

function hasAnyEngagement(position: UmbrellaPosition) {
  return (
    position.amount > 0 ||
    position.cooldownAmount > 0 ||
    position.pendingRewardsUsd > 0 ||
    position.claimedRewardsUsd > 0
  )
}

function DashboardUmbrellaSkeleton() {
  return (
    <section className="min-w-0" aria-hidden>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24 rounded-xs" />
          <Skeleton className="h-4 w-40 rounded-xs" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-radius-md" />
        <Skeleton className="h-14 w-full rounded-radius-md" />
      </div>
    </section>
  )
}

function StatusBadge({ status, t }: { status: UmbrellaPositionStatus; t: (key: string) => string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
        STATUS_TONE[status],
      )}
    >
      {t(STATUS_LABEL[status])}
    </span>
  )
}

function ActionButtons({
  marketId,
  position,
  variant,
}: {
  marketId: UmbrellaPosition["marketId"]
  position: UmbrellaPosition
  variant: "table" | "mobile"
}) {
  const canClaim = position.pendingRewardsUsd > 0
  const canUnstake = position.cooldownStatus === "ready" && position.cooldownAmount > 0

  if (variant === "table") {
    return (
      <HoverActionGroup className="justify-end gap-2">
        {canClaim ? (
          <Button asChild size="table" variant="table-primary" className="w-auto">
            <Link href={actionPagePath("umbrella", "claim", { market: marketId, return: RETURN_HREF })}>
              <ActionIcon label="Claim" />
              Claim
            </Link>
          </Button>
        ) : null}
        {canUnstake ? (
          <Button asChild size="table" variant={canClaim ? "table-secondary" : "table-primary"} className="w-auto">
            <Link href={actionPagePath("umbrella", "unstake", { market: marketId, return: RETURN_HREF })}>
              <ActionIcon label="Unstake" />
              Unstake
            </Link>
          </Button>
        ) : null}
        <Button
          asChild
          size="table"
          variant={canClaim || canUnstake ? "table-secondary" : "table-primary"}
          className="w-auto"
        >
          <Link href={`/umbrella?market=${marketId}`}>
            <ActionIcon label="Manage" />
            Manage
          </Link>
        </Button>
      </HoverActionGroup>
    )
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {canClaim ? (
        <Button
          asChild
          variant="brand"
          className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]"
        >
          <Link href={actionPagePath("umbrella", "claim", { market: marketId, return: RETURN_HREF })}>
            <ActionIcon label="Claim" />
            Claim
          </Link>
        </Button>
      ) : null}
      {canUnstake ? (
        <Button
          asChild
          variant={canClaim ? "brand-secondary" : "brand"}
          className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]"
        >
          <Link href={actionPagePath("umbrella", "unstake", { market: marketId, return: RETURN_HREF })}>
            <ActionIcon label="Unstake" />
            Unstake
          </Link>
        </Button>
      ) : null}
      <Button
        asChild
        variant={canClaim || canUnstake ? "brand-secondary" : "brand"}
        className={cn(
          "h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]",
          !canClaim && !canUnstake ? "col-span-2" : undefined,
        )}
      >
        <Link href={`/umbrella?market=${marketId}`}>
          <ActionIcon label="Manage" />
          Manage
        </Link>
      </Button>
    </div>
  )
}

export function DashboardUmbrellaSection() {
  const umbrella = useUmbrellaSessionContext()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()

  if (!umbrella.isHydrated) return <DashboardUmbrellaSkeleton />

  const m = (value: string) => (showDollarAmounts ? value : MASK)

  const rows: UmbrellaDashboardRow[] = umbrella.marketOrder
    .map((marketId) => {
      const market = umbrella.markets[marketId]
      const position = umbrella.positions[marketId]
      if (!market || !position) return null
      if (!hasAnyEngagement(position)) return null
      const activeUsd = Math.max(0, position.valueUsd - position.cooldownValueUsd)
      return {
        marketId,
        market,
        position,
        status: deriveUmbrellaPositionStatus(position),
        activeUsd,
        coolingUsd: position.cooldownValueUsd,
      }
    })
    .filter((row): row is UmbrellaDashboardRow => Boolean(row))

  const totalStakedUsd = rows.reduce((sum, row) => sum + row.position.valueUsd, 0)
  const totalPendingUsd = rows.reduce((sum, row) => sum + row.position.pendingRewardsUsd, 0)

  return (
    <section id="dashboard-umbrella" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{t("Umbrella")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {rows.length > 0
              ? `${m(formatUsd(totalStakedUsd))} ${t("staked across coverage markets")}`
              : t("Stake to backstop Aave markets and earn rewards.")}
          </p>
        </div>
        {rows.length > 0 && totalPendingUsd > 0 ? (
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Pending rewards")}</div>
            <div className="font-data text-[15px] font-medium tabular-nums text-success">
              {m(formatUsd(totalPendingUsd))}
            </div>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-radius-md border border-dashed border-border bg-card px-5 py-6 text-[13.5px] text-muted-foreground">
          <span>{t("No Umbrella positions yet.")}</span>
          <Button asChild size="sm" variant="brand" className="h-9 gap-2 [&_svg]:size-4">
            <Link href="/umbrella">
              <ActionIcon label="Explore Umbrella" />
              {t("Explore Umbrella")}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <DesktopTableSurface className="!rounded-none">
              <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="text-left">
                    <th className={cn(TABLE_HEADER_CELL, "pl-5")}>{t("Asset")}</th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Staked")}</th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Active / Cooling")}</th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("APY")}</th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>{t("Rewards")}</th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-center")}>{t("Status")}</th>
                    <SilentActionHeader className="!rounded-none pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-white/6">
                  {rows.map((row) => (
                    <tr key={row.marketId} className="group transition-colors">
                      <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                        <div className="flex items-center gap-2.5">
                          <TokenIcon symbol={row.market.symbol} size="table" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                              {row.market.symbol}
                            </span>
                            <span className="mt-0.5 text-[13px] text-muted-foreground">{row.market.coverage}</span>
                          </div>
                        </div>
                      </td>
                      <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                          {m(formatUsd(row.position.valueUsd))}
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {row.position.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
                          {row.market.symbol}
                        </div>
                      </td>
                      <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                        <div className="text-[13.5px] text-foreground dark:text-white">
                          {t("Active")}
                          <span className="ml-1 font-data tabular-nums">{m(formatUsd(row.activeUsd))}</span>
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {t("Cooling")}
                          <span className="ml-1 font-data tabular-nums">{m(formatUsd(row.coolingUsd))}</span>
                        </div>
                      </td>
                      <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                          {formatPct(row.market.apy)}%
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {formatPct(row.market.baseApy)}% + {formatPct(row.market.rewardApy)}%
                        </div>
                      </td>
                      <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                        <div className="text-[15px] font-normal tracking-[-0.03em] text-success">
                          {m(formatUsd(row.position.pendingRewardsUsd))}
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {t("Claimed")} {m(formatUsd(row.position.claimedRewardsUsd))}
                        </div>
                      </td>
                      <td className={cn("py-3.5 px-4 text-center", TABLE_ROW_HOVER_BG)}>
                        <StatusBadge status={row.status} t={t} />
                      </td>
                      <td className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}>
                        <ActionButtons marketId={row.marketId} position={row.position} variant="table" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DesktopTableSurface>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <div key={row.marketId} className="rounded-radius-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={row.market.symbol} size="md" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{row.market.symbol}</div>
                      <div className="text-[13px] text-muted-foreground">{row.market.coverage}</div>
                    </div>
                  </div>
                  <StatusBadge status={row.status} t={t} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <div className="text-muted-foreground">{t("Staked")}</div>
                    <div className="mt-1 font-data tabular-nums text-foreground">
                      {m(formatUsd(row.position.valueUsd))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("APY")}</div>
                    <div className="mt-1 font-data tabular-nums text-foreground">{formatPct(row.market.apy)}%</div>
                    <div className="text-[12px] text-muted-foreground">
                      {formatPct(row.market.baseApy)}% + {formatPct(row.market.rewardApy)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("Active / Cooling")}</div>
                    <div className="mt-1 font-data tabular-nums text-foreground">{m(formatUsd(row.activeUsd))}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {t("Cooling")} {m(formatUsd(row.coolingUsd))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("Rewards")}</div>
                    <div className="mt-1 font-data tabular-nums text-success">
                      {m(formatUsd(row.position.pendingRewardsUsd))}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {t("Claimed")} {m(formatUsd(row.position.claimedRewardsUsd))}
                    </div>
                  </div>
                </div>
                <ActionButtons marketId={row.marketId} position={row.position} variant="mobile" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
