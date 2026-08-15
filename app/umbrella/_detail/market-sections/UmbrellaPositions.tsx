"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"
import { formatPct, formatUnits, formatUsd } from "../format"

export function UmbrellaPositions() {
  const umbrella = useUmbrellaSessionContext()
  const umbrellaPositions = umbrella.marketOrder.map((id) => {
    const market = umbrella.markets[id]
    const position = umbrella.positions[id]
    return {
      id,
      asset: market.asset,
      symbol: market.symbol,
      staked: formatUsd(position.valueUsd),
      apy: `${formatPct(market.apy)}%`,
      coverage: market.coverage,
      pendingRewards: formatUsd(position.pendingRewardsUsd),
      cooldown: formatUnits(position.cooldownAmount),
      status:
        position.cooldownStatus === "ready"
          ? "Withdrawal ready"
          : position.cooldownStatus === "cooling"
            ? "In cooldown"
            : "Earning",
    }
  })

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Umbrella positions
        </h2>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>Asset</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Your stake</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>APY</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Rewards</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Status</th>
                <SilentActionHeader className="!rounded-none pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {umbrellaPositions.map((position) => (
                <tr key={position.id} className="group transition-colors">
                  <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={position.symbol} size="table" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                          {position.asset}
                        </span>
                        <span className="mt-0.5 text-[13px] text-muted-foreground">{position.coverage}</span>
                      </div>
                    </div>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                      {position.staked}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                      {position.apy}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-success">
                      {position.pendingRewards}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-center", TABLE_ROW_HOVER_BG)}>
                    <span className="inline-block max-w-full whitespace-normal text-[15px] font-normal leading-5 tracking-[-0.03em] text-foreground dark:text-white">
                      {position.status}
                    </span>
                  </td>
                  <td className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}>
                    <HoverActionGroup className="justify-end">
                      <Button asChild size="table" variant="table-primary" className="w-auto">
                        <Link
                          href={actionPagePath("umbrella", "unstake", { market: position.id, return: "/umbrella" })}
                        >
                          <ActionIcon label="Unstake" />
                          Unstake
                        </Link>
                      </Button>
                    </HoverActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>

      <div className="space-y-2 md:hidden">
        {umbrellaPositions.map((position) => (
          <div key={position.id} className="rounded-radius-md bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <TokenIcon symbol={position.symbol} size="table" />
              <div>
                <div className="font-semibold text-foreground">{position.asset}</div>
                <div className="text-[13px] text-muted-foreground">{position.coverage}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[13px] text-muted-foreground">Staked</div>
                <div className="font-medium">{position.staked}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">APY</div>
                <div className="font-medium">{position.apy}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Status</div>
                <div className="font-medium">{position.status}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Rewards</div>
                <div className="font-medium text-success">{position.pendingRewards}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
