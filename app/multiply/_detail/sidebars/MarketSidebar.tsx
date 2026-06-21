"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { getMultiplyMarketById } from "@/app/lib/multiply-system/catalog"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { cn } from "@/lib/utils"

type Props = { detail: MultiplyMarketDetail; className?: string }

function normalizeMarketId(id: string) {
  return id.toLowerCase().replaceAll("_", "-")
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

export function MarketSidebar({ detail, className }: Props) {
  const router = useRouter()
  const session = useMultiplySessionContext()
  const marketId = normalizeMarketId(detail.id)
  const market = getMultiplyMarketById(marketId)

  const position = React.useMemo(() => {
    return Object.values(session.state.positions).find(
      (entry) => entry.walletId === session.walletId && entry.marketId === marketId,
    )
  }, [marketId, session.state.positions, session.walletId])

  const maxLeverage = detail.quickStats.find((stat) => stat.id === "maxLeverage")?.value ?? "—"
  const available = detail.quickStats.find((stat) => stat.id === "available")?.value ?? "—"

  return (
    <aside className={cn("flex w-full flex-col gap-4", className)} aria-label={`Multiply ${detail.hero.name}`}>
      {position && market ? (
        <Card className="relative overflow-hidden border-border bg-surface-raised shadow-elev-1">
          <CardContent className="relative z-10 space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Open position</div>
                <h3 className="mt-1 text-[18px] font-normal tracking-[-0.02em] text-foreground">
                  {market.collateralAsset.symbol} / {market.borrowAsset.symbol}
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {position.multiplier.toFixed(2)}x
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <dt className="text-muted-foreground">Exposure</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{formatUsd(position.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Debt</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{formatUsd(position.debtValueUsd)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">LTV</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{formatPct(position.ltv)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Health factor</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">
                  {position.healthFactor === "infinity" ? "∞" : position.healthFactor.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net APY</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{formatPct(position.netApy)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Liquidation price</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">
                  {position.liquidationPrice ? formatUsd(position.liquidationPrice) : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 flex-1 rounded-radius-sm"
                onClick={() => router.push(actionPagePath("multiply", "deleverage", { market: marketId, return: `/multiply/market/${marketId}` }))}
              >
                Deleverage
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {market ? (
        <ActionPageLaunchCta
          product="multiply"
          kind="multiply"
          market={marketId}
          returnTo={`/multiply/market/${marketId}`}
        />
      ) : (
        <Card className="relative overflow-hidden border-border bg-surface-raised shadow-elev-1">
          <CardContent className="relative z-10 space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Multiply</div>
                <h3 className="mt-1 text-[18px] font-normal tracking-[-0.02em] text-foreground">Open position</h3>
              </div>
              <span className="rounded-full bg-[hsl(var(--brand-soft))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--brand))]">
                {detail.hero.feeTier ?? "Leverage"}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <dt className="text-muted-foreground">Collateral</dt>
                <dd className="mt-0.5 font-medium text-foreground">{detail.row.protocol}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Borrowable</dt>
                <dd className="mt-0.5 font-medium text-foreground">{detail.row.asset}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Max leverage</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{maxLeverage}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Available</dt>
                <dd className="mt-0.5 font-data tabular-nums text-foreground">{available}</dd>
              </div>
            </dl>

            <Button disabled className="h-9 w-full rounded-radius-sm">
              Market unavailable in sandbox
            </Button>
          </CardContent>
        </Card>
      )}

      <AboutNewsSection
        about={detail.about}
        aboutTitle={`About ${detail.hero.name}`}
        compactAboutTitle
        newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
        newsImageLabel={detail.hero.name}
        mediaVariant="icon"
      />
    </aside>
  )
}
