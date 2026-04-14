"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { HomeBorrowTab } from "@/app/components/home-borrow-tab"
import { HomeMarketsTabSkeleton, HomeResourcesTabSkeleton } from "@/app/components/loading-states"
import type { HomeChain } from "@/app/lib/home-data"

const HomeMarketsTab = dynamic(() => import("./home-markets-tab").then((mod) => mod.HomeMarketsTab), {
  loading: () => <HomeMarketsTabSkeleton />,
})

const HomeResourcesTab = dynamic(() => import("./home-resources-tab").then((mod) => mod.HomeResourcesTab), {
  loading: () => <HomeResourcesTabSkeleton />,
})

const homeTabs = [
  { id: "borrow", label: "Borrow" },
  { id: "markets", label: "Markets" },
  { id: "resources", label: "Resources" },
] as const

type HomeTabsProps = {
  chains: HomeChain[]
}

/** Interactive homepage tabs kept as a focused client island so the route shell can stay on the server. */
export function HomeTabs({ chains }: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<(typeof homeTabs)[number]["id"]>("borrow")

  return (
    <div className="space-y-6">
      <div
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
        role="tablist"
        aria-label="Homepage sections"
      >
        {homeTabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`home-tab-panel-${tab.id}`}
              id={`home-tab-${tab.id}`}
              className={`inline-flex w-full items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 font-compact text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isActive ? "bg-background text-foreground shadow-sm" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "borrow" ? (
        <div id="home-tab-panel-borrow" role="tabpanel" aria-labelledby="home-tab-borrow">
          <HomeBorrowTab chains={chains} />
        </div>
      ) : null}

      {activeTab === "markets" ? (
        <div id="home-tab-panel-markets" role="tabpanel" aria-labelledby="home-tab-markets">
          <HomeMarketsTab />
        </div>
      ) : null}

      {activeTab === "resources" ? (
        <div id="home-tab-panel-resources" role="tabpanel" aria-labelledby="home-tab-resources">
          <HomeResourcesTab />
        </div>
      ) : null}
    </div>
  )
}
