"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioHero } from "./portfolio-hero"

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
    rightRailButtons?: readonly [string, string, string, string]
    statOneLabel: string
    statOneValue: string
    statOneHelpText: string
    statTwoLabel: string
    statTwoValue: string
    statTwoHelpText: string
    rangeData: {
      "1D": number[]
      "1W": number[]
      "1M": number[]
      "3M": number[]
      "1Y": number[]
      ALL: number[]
    }
  }
> = {
  overview: {
    headlineValue: "$14,400.00",
    headlineDelta: "-$312.96 (-3.80%)",
    primaryActionLabel: "Deposit",
    secondaryActionLabel: "Withdraw",
    rightRailButtons: ["Borrow", "Repay", "Deposit", "Withdraw"],
    statOneLabel: "Average APY",
    statOneValue: "4.52%",
    statOneHelpText: "Weighted average APY across all your deposited assets.",
    statTwoLabel: "Interest earned",
    statTwoValue: "+$12.46",
    statTwoHelpText: "Total yield earned from all active positions over time.",
    rangeData: {
      "1D": [99, 97, 96, 94, 95, 93, 82, 79, 63, 61, 66, 83, 66, 88, 84, 90, 92, 91, 98, 84, 69, 78, 79, 85, 85, 90, 82, 80, 74, 72, 73, 64, 75, 75, 80, 80, 83, 76, 77, 76, 81, 78, 79, 77, 72, 81, 81, 81, 77, 82, 84, 86, 87, 82, 84, 79, 72, 67, 65, 52, 46, 49, 41],
      "1W": [103, 102, 100, 97, 98, 95, 88, 84, 73, 71, 76, 90, 76, 93, 90, 95, 97, 96, 101, 93, 79, 87, 88, 92, 93, 96, 91, 89, 84, 82, 83, 76, 86, 86, 90, 90, 93, 86, 87, 86, 91, 88, 89, 87, 83, 91, 91, 91, 87, 92, 95, 97, 98, 94, 96, 91, 85, 80, 78, 67, 61, 63, 57],
      "1M": [108, 106, 104, 102, 103, 101, 95, 91, 82, 79, 84, 98, 84, 99, 96, 101, 103, 102, 107, 96, 85, 92, 94, 98, 99, 102, 97, 96, 91, 89, 90, 84, 93, 93, 96, 97, 100, 93, 94, 93, 97, 95, 96, 94, 90, 97, 98, 98, 95, 99, 102, 104, 105, 101, 103, 98, 92, 88, 85, 75, 69, 71, 66],
      "3M": [116, 113, 111, 108, 109, 106, 100, 96, 86, 83, 88, 102, 89, 103, 100, 105, 107, 106, 110, 101, 91, 98, 99, 102, 104, 106, 101, 99, 94, 92, 93, 87, 96, 97, 100, 101, 104, 98, 99, 98, 102, 100, 101, 99, 95, 103, 103, 103, 100, 104, 107, 109, 110, 107, 108, 103, 97, 92, 90, 81, 75, 77, 71],
      "1Y": [132, 128, 125, 121, 122, 119, 114, 109, 98, 95, 101, 117, 103, 118, 115, 121, 123, 122, 127, 117, 105, 113, 114, 118, 119, 122, 117, 115, 110, 109, 110, 104, 113, 113, 116, 117, 120, 113, 114, 114, 118, 116, 116, 115, 110, 118, 118, 118, 114, 119, 122, 124, 125, 121, 123, 117, 111, 106, 103, 93, 86, 88, 82],
      ALL: [142, 139, 136, 132, 133, 130, 123, 118, 107, 103, 109, 126, 110, 127, 123, 129, 131, 130, 135, 124, 112, 120, 122, 126, 127, 130, 126, 123, 118, 116, 117, 110, 121, 121, 124, 124, 128, 121, 122, 121, 126, 123, 124, 122, 117, 126, 126, 126, 122, 127, 130, 132, 133, 129, 130, 125, 118, 113, 110, 100, 93, 95, 89],
    },
  },
  lending: {
    headlineValue: "$96,400.00",
    headlineDelta: "+$4,410.00 (+4.79%) Yield earned",
    primaryActionLabel: "Supply assets",
    secondaryActionLabel: "Withdraw yield",
    statOneLabel: "Average APY",
    statOneValue: "4.92%",
    statOneHelpText: "Weighted average APY across supplied assets in the lending book.",
    statTwoLabel: "Borrow capacity",
    statTwoValue: "$31.2K",
    statTwoHelpText: "Estimated available borrowing power from your supplied assets.",
    rangeData: buildRangeData([78, 80, 79, 83, 84, 86, 87]),
  },
  looping: {
    headlineValue: "$19,800.00",
    headlineDelta: "+$1,680.00 (+9.27%) Net carry",
    primaryActionLabel: "Increase loop",
    secondaryActionLabel: "Unwind loop",
    statOneLabel: "Utilization",
    statOneValue: "84%",
    statOneHelpText: "Share of available loop capacity currently in use.",
    statTwoLabel: "Net carry",
    statTwoValue: "+2.1%",
    statTwoHelpText: "Net yield after funding and borrowing costs across looped positions.",
    rangeData: buildRangeData([53, 56, 58, 60, 63, 65, 68]),
  },
  activity: {
    headlineValue: "42",
    headlineDelta: "12 settled, 4 pending today",
    primaryActionLabel: "View fills",
    secondaryActionLabel: "Export log",
    statOneLabel: "Orders",
    statOneValue: "21",
    statOneHelpText: "Total order events captured in the current activity window.",
    statTwoLabel: "Settled actions",
    statTwoValue: "12",
    statTwoHelpText: "Completed deposits, withdrawals, and fills in the selected period.",
    rangeData: buildRangeData([8, 12, 6, 11, 10, 14, 9]),
  },
}

function buildRangeData(week: number[]) {
  return {
    "1D": week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 3) - 1) * 1.2)).slice(0, 63),
    "1W": week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 4) - 1.5) * 1.6)).slice(0, 63),
    "1M": week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 5) - 2) * 1.8)).slice(0, 63),
    "3M": week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 4) - 1.5) * 2.2 + 4)).slice(0, 63),
    "1Y": week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 5) - 2) * 2.6 + 10)).slice(0, 63),
    ALL: week.flatMap((value, index) => Array.from({ length: 9 }, (_, sample) => value + (((index + sample) % 6) - 2.5) * 3 + 18)).slice(0, 63),
  }
}

type PortfolioTabsProps = {
  activeTab: PortfolioTab
  onTabChange: (tab: PortfolioTab) => void
}

export function PortfolioTabs({ activeTab, onTabChange }: PortfolioTabsProps) {
  const activeTabConfig = TAB_DETAILS[activeTab]

  const tabBar = (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsList className="inline-flex w-max min-w-max justify-start">
        {PORTFOLIO_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 text-[14px] font-normal">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )

  return (
    <section className="mb-8">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as PortfolioTab)}>
        <PortfolioHero
          tabs={tabBar}
          headlineValue={activeTabConfig.headlineValue}
          headlineDelta={activeTabConfig.headlineDelta}
          primaryActionLabel={activeTabConfig.primaryActionLabel}
          secondaryActionLabel={activeTabConfig.secondaryActionLabel}
          rightRailButtons={activeTabConfig.rightRailButtons}
          statOneLabel={activeTabConfig.statOneLabel}
          statOneValue={activeTabConfig.statOneValue}
          statOneHelpText={activeTabConfig.statOneHelpText}
          statTwoLabel={activeTabConfig.statTwoLabel}
          statTwoValue={activeTabConfig.statTwoValue}
          statTwoHelpText={activeTabConfig.statTwoHelpText}
          rangeData={activeTabConfig.rangeData}
        />
      </Tabs>
    </section>
  )
}
