"use client"

import * as React from "react"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { ResponsiveMultiplyAction } from "@/app/components/action-page/responsive-multiply-action"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { getMultiplyMarketById } from "@/app/lib/multiply-system/catalog"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { cn } from "@/lib/utils"

type Props = { detail: MultiplyMarketDetail; className?: string }

type SidebarTab = "multiply" | "deleverage"

const MULTIPLY_TAB_ITEMS = [
  { id: "multiply", label: "Multiply" },
  { id: "deleverage", label: "Deleverage" },
] as const

function normalizeMarketId(id: string) {
  return id.toLowerCase().replaceAll("_", "-")
}

export function MarketSidebar({ detail, className }: Props) {
  return (
    <aside className={cn("flex w-full flex-col gap-12", className)} aria-label={`Multiply ${detail.hero.name}`}>
      <MarketActionRail detail={detail} className="mt-6" embedActions />
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

export function MarketMultiplyActions({ detail, className }: Props) {
  return <MarketActionRail detail={detail} className={className} />
}

function MarketActionRail({
  detail,
  className,
  embedActions = false,
}: Props & { embedActions?: boolean }) {
  const marketId = normalizeMarketId(detail.id)
  const market = getMultiplyMarketById(marketId)
  const closeHref = `/multiply/markets/${marketId}`

  const [tab, setTab] = React.useState<SidebarTab>("multiply")

  React.useEffect(() => {
    setTab("multiply")
  }, [detail.id])

  // Every market is openable — if the catalog record can't be resolved inline, still
  // route the user into the full-screen multiply action (which resolves it itself)
  // rather than dead-ending on an "unavailable" message.
  if (!market) {
    return (
      <div className={cn("rounded-[20px] border border-border bg-background px-4 py-5", className)}>
        <p className="text-[15px] leading-6 text-muted-foreground">
          Open a looped position in {detail.hero.name}.
        </p>
        <ActionPageLaunchCta product="multiply" kind="multiply" market={marketId} className="mt-3 w-full" label="Multiply" />
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <ActionWorkspaceTabs
        items={[...MULTIPLY_TAB_ITEMS]}
        value={tab}
        onChange={(value) => setTab(value as SidebarTab)}
        ariaLabel="Multiply actions"
      />

      <div className="mt-3">
        {tab === "multiply" ? (
          embedActions ? (
            <ResponsiveMultiplyAction kind="multiply" market={marketId} closeHref={closeHref} sidebar />
          ) : (
            <ActionPageLaunchCta product="multiply" kind="multiply" market={marketId} returnTo={closeHref} />
          )
        ) : null}

        {tab === "deleverage" ? (
          embedActions ? (
            <ResponsiveMultiplyAction
              kind="deleverage"
              market={marketId}
              closeHref={closeHref}
              sidebar
            />
          ) : (
            <ActionPageLaunchCta product="multiply" kind="deleverage" market={marketId} returnTo={closeHref} />
          )
        ) : null}
      </div>
    </div>
  )
}
