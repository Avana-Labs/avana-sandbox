import type { Metadata } from "next"
import { StakeBalanceHero } from "../stake/components/stake-balance-hero"
import { StakeWarningCard } from "../stake/components/stake-warning-card"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioStrategies } from "./portfolio-strategies"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Stake assets into Avana pools across pools, assets, amounts, and lock periods.",
}

export default function PortfolioPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <StakeBalanceHero />
          <StakeWarningCard />
          <PortfolioPositions />
          <PortfolioStrategies />
          <StakeWizard />
        </div>
      </main>
    </div>
  )
}
