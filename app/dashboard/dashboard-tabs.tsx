"use client"

import type { PortfolioPageData, PortfolioTabKey } from "@/app/lib/data/providers/portfolio"
import { DashboardHero } from "./dashboard-hero"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildBorrowHeroData } from "@/app/portfolio/borrow-hero-state"
import { buildLendHeroData, type LendSnapshot } from "@/app/portfolio/lend-hero-state"

export type DashboardTab = PortfolioTabKey

type DashboardTabsProps = {
  activeTab: DashboardTab
  pageData: PortfolioPageData
  borrowSnapshot: BorrowSnapshot
  multiplySnapshot: BorrowSnapshot
  lendSnapshot?: LendSnapshot | null
  multiplyHero?: PortfolioPageData["heroByTab"]["looping"] | null
  multiplyPositionTarget?: { marketId: string; multiplier: number } | null
}

export function DashboardTabs({
  activeTab,
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

  return (
    <section className="mb-6 sm:mb-8">
      <DashboardHero
        tab={activeTab}
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
