"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildRangeData, type ChartPoint, type ChartRangeOption } from "@/app/components/charts"
import { PortfolioHero } from "./hero/portfolio-hero"

export type PortfolioTab = "overview" | "lending" | "looping" | "activity"

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

const TAB_DETAILS: Record<
  PortfolioTab,
  {
    headlineValue: string
    headlineDelta: string
    primaryActionLabel: string
    secondaryActionLabel: string
    actionIds?: readonly ["send", "receive", "buy", "more"]
    rangeData: Record<ChartRangeOption, ChartPoint[]>
  }
> = {
  overview: {
    headlineValue: "$883.74",
    headlineDelta: "$6.89 (0.78%) today",
    primaryActionLabel: "Deposit",
    secondaryActionLabel: "Withdraw",
    actionIds: ["send", "receive", "buy", "more"],
    rangeData: buildRangeData(880, 14),
  },
  lending: {
    headlineValue: "$96,400.00",
    headlineDelta: "$4,410.00 (4.79%) this month",
    primaryActionLabel: "Supply assets",
    secondaryActionLabel: "Withdraw yield",
    rangeData: buildRangeData(964, 42),
  },
  looping: {
    headlineValue: "$19,800.00",
    headlineDelta: "$1,680.00 (9.27%) net carry",
    primaryActionLabel: "Increase loop",
    secondaryActionLabel: "Unwind loop",
    rangeData: buildRangeData(198, 18),
  },
  activity: {
    headlineValue: "42",
    headlineDelta: "12 settled, 4 pending today",
    primaryActionLabel: "View fills",
    secondaryActionLabel: "Export log",
    rangeData: buildRangeData(42, 6),
  },
}

type PortfolioTabsProps = {
  activeTab: PortfolioTab
  onTabChange: (tab: PortfolioTab) => void
}

export function PortfolioTabs({ activeTab, onTabChange }: PortfolioTabsProps) {
  const activeTabConfig = TAB_DETAILS[activeTab]

  const tabBar = (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsList className="flex h-auto w-full justify-between gap-2 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9">
        {PORTFOLIO_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-auto flex-1 shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[16px] font-normal after:inset-x-0 data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none sm:flex-none sm:pb-4 sm:text-[15px]"
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
          tabs={tabBar}
          headlineValue={activeTabConfig.headlineValue}
          headlineDelta={activeTabConfig.headlineDelta}
          primaryActionLabel={activeTabConfig.primaryActionLabel}
          secondaryActionLabel={activeTabConfig.secondaryActionLabel}
          actionIds={activeTabConfig.actionIds}
          rangeData={activeTabConfig.rangeData}
        />
      </Tabs>
    </section>
  )
}
