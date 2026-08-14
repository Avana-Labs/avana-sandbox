"use client"

import { useState } from "react"
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

export function UmbrellaSidebar({ moduleId }: { moduleId: UmbrellaMarketId }) {
  const [tab, setTab] = useState<UmbrellaActionTab>("stake")
  const closeHref = "/umbrella"

  return (
    <aside className="flex w-full flex-col" aria-label="Umbrella actions">
      <DetailActionTabs items={UMBRELLA_ACTION_TABS} value={tab} onChange={setTab} ariaLabel="Umbrella actions" />
      <div className="mt-2">
        <ResponsiveUmbrellaAction kind={tab} market={moduleId} closeHref={closeHref} sidebar />
      </div>
    </aside>
  )
}
