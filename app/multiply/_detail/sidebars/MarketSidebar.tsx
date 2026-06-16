"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { cn } from "@/lib/utils"

type Props = { detail: MultiplyMarketDetail; className?: string }

export function MarketSidebar({ detail, className }: Props) {
  const maxLeverage = detail.quickStats.find((stat) => stat.id === "maxLeverage")?.value ?? "—"
  const available = detail.quickStats.find((stat) => stat.id === "available")?.value ?? "—"

  return (
    <aside className={cn("flex w-full flex-col gap-4", className)} aria-label={`Multiply ${detail.hero.name}`}>
      <Card className="relative overflow-hidden border-border bg-surface-raised shadow-elev-1">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand-soft))]/35 via-transparent to-transparent" />
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

          <div className="grid grid-cols-2 gap-2">
            <Button className="h-9 rounded-radius-sm bg-accent-primary text-[13px] font-medium text-accent-primary-foreground hover:bg-accent-primary-hover">
              Open position
            </Button>
            <Button variant="secondary" className="h-9 rounded-radius-sm border border-border bg-surface-raised text-[13px] font-medium text-foreground hover:bg-surface-inset">
              View markets
            </Button>
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            Multiply uses the collateral and borrow pair directly. The action box stays focused on leverage, availability, and the current APY ceiling.
          </p>
        </CardContent>
      </Card>

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
