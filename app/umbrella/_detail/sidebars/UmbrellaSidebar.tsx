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
}: {
  moduleId: UmbrellaMarketId
  onMarketChange?: (marketId: UmbrellaMarketId) => void
}) {
  const [tab, setTab] = useState<UmbrellaActionTab>("stake")
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
        {/* key={tab} forces the embedded action page to remount when the tab
            changes; without it React reuses the previous instance's state and
            (a) the picker shows the wrong ticker, (b) the amount field keeps
            the previous tab's value. TODO: once the action page resets its
            amount internally on `kind` change we can drop the remount and
            share input state across tabs. */}
        <ResponsiveUmbrellaAction
          key={tab}
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
