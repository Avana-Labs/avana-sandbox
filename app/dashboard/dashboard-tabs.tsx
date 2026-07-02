"use client"

import type { PortfolioPageData, PortfolioTabKey } from "@/app/lib/data/providers/portfolio"
import { DashboardHero } from "./dashboard-hero"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildBorrowHeroData } from "@/app/portfolio/borrow-hero-state"
import { buildLendHeroData, type LendSnapshot } from "@/app/portfolio/lend-hero-state"
import { UnderlineTabStrip } from "@/app/components/tab-primitives"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  const { t } = useTranslation()
  const activeHero =
    activeTab === "overview"
      ? buildBorrowHeroData(pageData.heroByTab.overview, borrowSnapshot)
      : activeTab === "lending" && lendSnapshot
      ? buildLendHeroData(pageData.heroByTab.lending, lendSnapshot)
      : activeTab === "looping" && multiplyHero
        ? multiplyHero
      : pageData.heroByTab[activeTab]

  const tabBar = (
    <UnderlineTabStrip
      items={DASHBOARD_TABS.map((tab) => ({ id: tab.value, label: t(tab.label) }))}
      value={activeTab}
      onChange={onTabChange}
      ariaLabel={t("Portfolio views")}
      listClassName="sm:gap-9"
    />
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
