"use client"

import { useEffect, useState } from "react"
import { ResponsiveUmbrellaAction } from "@/app/components/action-page/responsive-umbrella-action"
import { DetailActionTabs } from "@/app/components/detail-action-tabs"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"

const UMBRELLA_ACTION_TABS = [
  { id: "stake", label: "Stake" },
  { id: "claim", label: "Claim" },
  { id: "cooldown", label: "Cooldown" },
  { id: "unstake", label: "Unstake" },
] as const

export type UmbrellaActionTab = (typeof UMBRELLA_ACTION_TABS)[number]["id"]

export function UmbrellaSidebar({
  moduleId,
  onMarketChange,
  initialTab = "stake",
}: {
  moduleId: UmbrellaMarketId
  onMarketChange?: (marketId: UmbrellaMarketId) => void
  // Which tab to land on for this mount. The mobile sheet remounts the sidebar
  // on every open (via a changing `key`), so this initializer runs afresh each
  // time the sheet is opened — letting the "More" button jump straight to the
  // tab most useful for the position state (unstake / cooldown / claim).
  initialTab?: UmbrellaActionTab
}) {
  const [tab, setTab] = useState<UmbrellaActionTab>(initialTab)
  // Selected market is shared across tabs so switching Stake → Cooldown → Unstake
  // stays on the same asset. The picker inside each embedded action page reports
  // back so the parent can push it into the next tab's initialMarketId.
  const [localMarket, setLocalMarket] = useState<UmbrellaMarketId>(moduleId)
  // Keep in sync when the landing page's selection changes (e.g. user clicks a
  // Positions row) without wiping the picker if the sidebar drove the update.
  useEffect(() => {
    setLocalMarket(moduleId)
  }, [moduleId])
  const closeHref = "/umbrella"

  const handleMarketChange = (nextMarket: UmbrellaMarketId) => {
    setLocalMarket(nextMarket)
    onMarketChange?.(nextMarket)
  }

  return (
    <aside className="flex w-full flex-col" aria-label="Umbrella actions">
      <DetailActionTabs items={UMBRELLA_ACTION_TABS} value={tab} onChange={setTab} ariaLabel="Umbrella actions" />
      <div className="mt-2">
        <ResponsiveUmbrellaAction
          kind={tab}
          market={localMarket}
          closeHref={closeHref}
          sidebar
          onMarketChange={handleMarketChange}
        />
      </div>
    </aside>
  )
}
