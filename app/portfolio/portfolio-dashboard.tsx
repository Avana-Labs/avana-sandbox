"use client"

import { useState } from "react"
import { StakeWizard } from "../stake/stake-wizard"
import { RecentActivity } from "../lend/components/recent-activity"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { PortfolioStrategies } from "./portfolio-strategies"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"

export function PortfolioDashboard() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview")

  return (
    <>
      <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "lending" ? <PortfolioInvestments /> : null}
      {activeTab === "lending" ? <PortfolioStrategies /> : null}
      {activeTab === "collateral" ? <StakeWizard /> : null}
      {activeTab === "collateral" ? <PortfolioPositions section="supplies" /> : null}
      {activeTab === "borrowing" ? <PortfolioPositions section="debts" /> : null}
      {activeTab === "looping" ? (
        <PortfolioPositionsTabs allowedTabs={["Positions", "Open Orders", "TWAP", "History"]} initialTab="Positions" />
      ) : null}
      {activeTab === "activity" ? <RecentActivity /> : null}
    </>
  )
}
