"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioHero } from "./hero/portfolio-hero"
import type { PortfolioPageData, PortfolioTabKey } from "@/app/lib/data/providers/portfolio"
import { buildBorrowHeroData, type BorrowSnapshot } from "./borrow-hero-state"

export type PortfolioTab = PortfolioTabKey

type TabConfig = {
  value: PortfolioTab
  label: string
}

const PORTFOLIO_TABS: TabConfig[] = [
  { value: "overview", label: "Borrow" },
  { value: "lending", label: "Lend" },
  { value: "looping", label: "Multiply" },
  { value: "activity", label: "Activity" },
]

type PortfolioTabsProps = {
  activeTab: PortfolioTab
  onTabChange: (tab: PortfolioTab) => void
  pageData: PortfolioPageData
  borrowSnapshot: BorrowSnapshot
}

export function PortfolioTabs({ activeTab, onTabChange, pageData, borrowSnapshot }: PortfolioTabsProps) {
  const activeHero = activeTab === "overview" ? buildBorrowHeroData(pageData.heroByTab.overview, borrowSnapshot) : pageData.heroByTab[activeTab]

  const tabBar = (
    <div className="max-w-full overflow-x-auto overscroll-x-contain border-b border-border/90 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsList className="flex h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9">
        {PORTFOLIO_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-auto flex-1 shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[16px] font-normal after:inset-x-0 after:h-[3px] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none sm:flex-none sm:pb-4 sm:text-[15px]"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )

  return (
    <section className="mb-6 sm:mb-8">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as PortfolioTab)}>
      <PortfolioHero
          tab={activeTab}
          tabs={tabBar}
          initialNetwork={pageData.walletProfile.selectedNetwork}
          headlineValue={activeHero.headlineValue}
          headlineDelta={activeHero.headlineDelta}
          statOneValue={activeHero.statOneValue}
          statTwoValue={activeHero.statTwoValue}
          rangeData={activeHero.rangeData}
          walletName={pageData.walletProfile.displayName}
        />
      </Tabs>
    </section>
  )
}
