"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { QuestsTab } from "./quests-tab"
import { PillTabButton } from "@/components/ui/pill-tab-button"
import { RewardsMarketsTabSkeleton, RewardsResourcesTabSkeleton } from "@/app/components/loading-states"
import type { HomeChain } from "@/app/lib/home-data"

const RewardsMarketsTab = dynamic(() => import("./markets-tab").then((mod) => mod.RewardsMarketsTab), {
  loading: () => <RewardsMarketsTabSkeleton />,
})

const RewardsResourcesTab = dynamic(() => import("./resources-tab").then((mod) => mod.RewardsResourcesTab), {
  loading: () => <RewardsResourcesTabSkeleton />,
})

const rewardsTabs = [
  { id: "quests", label: "Quests" },
  { id: "markets", label: "Markets" },
  { id: "resources", label: "Resources" },
] as const

type RewardsTabsProps = {
  chains: HomeChain[]
}

/** Interactive rewards page tabs kept as a focused client island so the route shell can stay on the server. */
export function RewardsTabs({ chains }: RewardsTabsProps) {
  const [activeTab, setActiveTab] = useState<(typeof rewardsTabs)[number]["id"]>("quests")

  return (
    <div className="space-y-6">
      <div
        className="no-scrollbar flex flex-wrap items-center justify-center gap-1"
        role="tablist"
        aria-label="Rewards sections"
      >
        {rewardsTabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <PillTabButton
              key={tab.id}
              role="tab"
              type="button"
              active={isActive}
              aria-selected={isActive}
              aria-controls={`rewards-tab-panel-${tab.id}`}
              id={`rewards-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </PillTabButton>
          )
        })}
      </div>

      {activeTab === "quests" ? (
        <div id="rewards-tab-panel-quests" role="tabpanel" aria-labelledby="rewards-tab-quests">
          <QuestsTab chains={chains} />
        </div>
      ) : null}

      {activeTab === "markets" ? (
        <div id="rewards-tab-panel-markets" role="tabpanel" aria-labelledby="rewards-tab-markets">
          <RewardsMarketsTab />
        </div>
      ) : null}

      {activeTab === "resources" ? (
        <div id="rewards-tab-panel-resources" role="tabpanel" aria-labelledby="rewards-tab-resources">
          <RewardsResourcesTab />
        </div>
      ) : null}
    </div>
  )
}
