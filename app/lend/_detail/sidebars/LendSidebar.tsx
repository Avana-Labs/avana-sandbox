"use client"

import * as React from "react"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import { ResponsiveLendAction } from "@/app/components/action-page/responsive-lend-action"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { cn } from "@/lib/utils"

type Props = { detail: LendMarketDetail; className?: string }

type SidebarTab = "deposit" | "withdraw"

const LEND_TAB_ITEMS = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
] as const

export function LendSidebar({ detail, className }: Props) {
  return (
    <aside className={cn("flex w-full flex-col gap-12", className)} aria-label={`Lend ${detail.hero.name}`}>
      <LendActionRail detail={detail} className="mt-6" />
      <AboutNewsSection
        about={detail.about}
        aboutTitle={`About ${detail.hero.name}`}
        compactAboutTitle
        newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
        newsImageLabel={detail.hero.symbol}
        mediaVariant="icon"
      />
    </aside>
  )
}

export function LendMarketActions({ detail, className }: Props) {
  return <LendActionRail detail={detail} className={className} />
}

function LendActionRail({ detail, className }: Props) {
  const marketId = detail.row.marketId
  const closeHref = `/lend/markets/${marketId}`
  const [tab, setTab] = React.useState<SidebarTab>("deposit")

  React.useEffect(() => {
    setTab("deposit")
  }, [detail.id])

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <ActionWorkspaceTabs
        items={[...LEND_TAB_ITEMS]}
        value={tab}
        onChange={(value) => setTab(value as SidebarTab)}
        ariaLabel="Lend actions"
      />

      <div className="mt-3">
        {tab === "deposit" ? (
          <ResponsiveLendAction kind="deposit" market={marketId} closeHref={closeHref} sidebar />
        ) : (
          <ResponsiveLendAction kind="withdraw" market={marketId} closeHref={closeHref} sidebar />
        )}
      </div>
    </div>
  )
}
