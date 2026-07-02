"use client"

import type { PortfolioPageData, PortfolioTabKey } from "@/app/lib/data/providers/portfolio"
import { DashboardHero } from "./dashboard-hero"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildBorrowHeroData } from "@/app/portfolio/borrow-hero-state"
import { buildLendHeroData, type LendSnapshot } from "@/app/portfolio/lend-hero-state"
import { cn } from "@/lib/utils"

export type DashboardTab = PortfolioTabKey

type TabConfig = {
  value: DashboardTab
  label: string
}

const DASHBOARD_TABS: TabConfig[] = [
  { value: "lending", label: "Lend" },
  { value: "overview", label: "Borrow" },
  { value: "looping", label: "Multiply" },
  { value: "activity", label: "Activity" },
]

type DashboardTabsProps = {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  pageData: PortfolioPageData
  borrowSnapshot: BorrowSnapshot
  multiplySnapshot: BorrowSnapshot
  lendSnapshot?: LendSnapshot | null
  multiplyHero?: PortfolioPageData["heroByTab"]["looping"] | null
  multiplyPositionTarget?: { marketId: string; multiplier: number } | null
}

export function DashboardTabs({
  activeTab,
  onTabChange,
  pageData,
  borrowSnapshot,
  multiplySnapshot,
  lendSnapshot,
  multiplyHero,
  multiplyPositionTarget,
}: DashboardTabsProps) {
  const activeHero =
    activeTab === "overview"
      ? buildBorrowHeroData(pageData.heroByTab.overview, borrowSnapshot)
      : activeTab === "lending" && lendSnapshot
      ? buildLendHeroData(pageData.heroByTab.lending, lendSnapshot)
      : activeTab === "looping" && multiplyHero
        ? multiplyHero
      : pageData.heroByTab[activeTab]

  const tabBar = (
    <div className="max-w-full overflow-x-auto overscroll-x-contain border-b border-border/90 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label="Portfolio views" className="flex h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative h-auto flex-1 shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[16px] font-normal text-muted-foreground transition-colors after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-transparent sm:flex-none sm:pb-4 sm:text-[15px]",
              activeTab === tab.value
                ? "text-[16px] text-foreground after:bg-foreground sm:text-[16px]"
                : "text-[15px] hover:text-foreground sm:text-[15px]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <section className="mb-6 sm:mb-8">
      <DashboardHero
        tab={activeTab}
        tabs={tabBar}
        headlineValue={activeHero.headlineValue}
        headlineDelta={activeHero.headlineDelta}
        statOneValue={activeHero.statOneValue}
        statTwoValue={activeHero.statTwoValue}
        rangeData={activeHero.rangeData}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
        multiplyPositionTarget={multiplyPositionTarget}
      />
    </section>
  )
}
