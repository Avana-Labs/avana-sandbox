"use client"

import { PortfolioHero } from "./hero/portfolio-hero"
import type { PortfolioPageData, PortfolioTabKey } from "@/app/lib/data/providers/portfolio"
import type { BorrowSnapshot } from "./borrow-hero-state"
import { cn } from "@/lib/utils"

export type PortfolioTab = PortfolioTabKey

type TabConfig = {
  value: PortfolioTab
  label: string
}

const PORTFOLIO_TABS: TabConfig[] = [
  { value: "lending", label: "Lend" },
  { value: "overview", label: "Borrow" },
  { value: "looping", label: "Multiply" },
  { value: "activity", label: "Activity" },
]

type PortfolioTabsProps = {
  activeTab: PortfolioTab
  onTabChange: (tab: PortfolioTab) => void
  pageData: PortfolioPageData
  borrowSnapshot: BorrowSnapshot
  multiplySnapshot: BorrowSnapshot
}

export function PortfolioTabs({ activeTab, onTabChange, pageData, borrowSnapshot, multiplySnapshot }: PortfolioTabsProps) {
  const activeHero = pageData.heroByTab[activeTab]

  const tabBar = (
    <div className="max-w-full overflow-x-auto overscroll-x-contain border-b border-border/90 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label="Portfolio views" className="flex h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9">
        {PORTFOLIO_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative h-auto flex-1 shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[16px] font-normal text-muted-foreground transition-colors after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-transparent sm:flex-none sm:pb-4 sm:text-[15px]",
              activeTab === tab.value
                ? "font-semibold text-foreground after:bg-foreground"
                : "hover:text-foreground",
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
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
      />
    </section>
  )
}
