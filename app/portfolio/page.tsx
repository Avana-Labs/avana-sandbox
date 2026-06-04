import type { Metadata } from "next"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioStrategies } from "./portfolio-strategies"
import { RecentActivity } from "../lend/components/recent-activity"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { PortfolioTabs } from "./portfolio-tabs"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track portfolio balance, positions, strategies, and recent activity.",
}

export default function PortfolioPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <PortfolioTabs />
          <PortfolioInvestments />
          <PortfolioPositionsTabs />
          <PortfolioPositions />
          <PortfolioStrategies />
          <RecentActivity />
          <StakeWizard />
        </div>
      </main>
    </div>
  )
}
