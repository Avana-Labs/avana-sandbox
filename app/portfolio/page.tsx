import type { Metadata } from "next"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioStrategies } from "./portfolio-strategies"
import { RecentActivity } from "../lend/components/recent-activity"
import { PortfolioHero } from "./portfolio-hero"
import { PortfolioLPCollaterals } from "./portfolio-lp-collaterals"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track portfolio balance, positions, strategies, and recent activity.",
}

export default function PortfolioPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px]">
          <PortfolioHero />
          <PortfolioLPCollaterals />
          <PortfolioPositions />
          <PortfolioStrategies />
          <RecentActivity />
          <StakeWizard />
        </div>
      </main>
    </div>
  )
}
