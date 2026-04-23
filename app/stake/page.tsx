import type { Metadata } from "next"
import { StakeBalanceHero } from "./components/stake-balance-hero"
import { StakeWarningCard } from "./components/stake-warning-card"
import { StakeWizard } from "./stake-wizard"

export const metadata: Metadata = {
  title: "Stake",
  description: "Stake assets into Avana pools across pools, assets, amounts, and lock periods.",
}

export default function StakePage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <StakeBalanceHero />
          <StakeWarningCard />
          <StakeWizard />
        </div>
      </main>
    </div>
  )
}
