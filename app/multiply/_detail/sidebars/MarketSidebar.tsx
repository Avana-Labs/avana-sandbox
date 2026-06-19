"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { getMultiplyMarketById } from "@/app/lib/multiply-system/catalog"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { MultiplyActionBox } from "@/app/multiply/components/multiply-action-box"
import { cn } from "@/lib/utils"

type Props = { detail: MultiplyMarketDetail; className?: string }

function normalizeMarketId(id: string) {
  return id.toLowerCase().replaceAll("_", "-")
}

export function MarketSidebar({ detail, className }: Props) {
  const market = getMultiplyMarketById(normalizeMarketId(detail.id))
  const maxLeverage = detail.quickStats.find((stat) => stat.id === "maxLeverage")?.value ?? "—"
  const available = detail.quickStats.find((stat) => stat.id === "available")?.value ?? "—"

  return (
    <aside className={cn("flex w-full flex-col gap-4", className)} aria-label={`Multiply ${detail.hero.name}`}>
      {market ? (
        <MultiplyActionBox market={market} />
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
