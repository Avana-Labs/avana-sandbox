import type { Metadata } from "next"
import { RewardsTabs } from "./rewards-tabs"
import { getCachedHomeSnapshot } from "@/app/lib/home-data"
import { RewardsBalanceHero } from "./rewards-balance-hero"

export const metadata: Metadata = {
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
}

export default async function RewardsPage() {
  const { chains } = await getCachedHomeSnapshot()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <RewardsBalanceHero />

          <RewardsTabs chains={chains} />
        </div>
      </main>
    </div>
  )
}
