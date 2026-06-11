"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { StakeWizard } from "../stake/stake-wizard"
import { RecentActivity } from "../lend/components/recent-activity"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { PortfolioStrategies } from "./portfolio-strategies"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"

function PortfolioSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-5">
      <h2 className="mb-5 mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">{title}</h2>
      {children}
    </section>
  )
}

function PortfolioSectionTitle({ title }: { title: string }) {
  return <h2 className="mb-5 mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">{title}</h2>
}

export function PortfolioDashboard() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview")
  const [marketsTab, setMarketsTab] = useState<"supplies" | "debts">("supplies")

  return (
    <>
      <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" ? <PortfolioSectionTitle title="Credit Lines" /> : null}
      {activeTab === "overview" ? (
        <PortfolioSection title="Credit Markets">
          <Tabs value={marketsTab} onValueChange={(value) => setMarketsTab(value as "supplies" | "debts")}>
            <TabsList className="inline-flex w-max min-w-max justify-start">
              <TabsTrigger value="supplies" className="shrink-0 text-[14px] font-normal">
                My LP Collaterals
              </TabsTrigger>
              <TabsTrigger value="debts" className="shrink-0 text-[14px] font-normal">
                My Borrows
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="pt-5">
            {marketsTab === "supplies" ? <PortfolioPositions section="supplies" /> : null}
            {marketsTab === "debts" ? <PortfolioPositions section="debts" /> : null}
          </div>
        </PortfolioSection>
      ) : null}
      {activeTab === "overview" ? (
        <PortfolioSection title="Credit Analysis">
          <StakeWizard />
        </PortfolioSection>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments /> : null}
      {activeTab === "lending" ? <PortfolioStrategies /> : null}
      {activeTab === "looping" ? (
        <PortfolioPositionsTabs allowedTabs={["Positions", "Open Orders", "TWAP", "History"]} initialTab="Positions" />
      ) : null}
      {activeTab === "activity" ? <RecentActivity /> : null}
    </>
  )
}
