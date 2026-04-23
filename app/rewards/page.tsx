import type { Metadata } from "next"
import { Progress } from "@/components/ui/progress"
import { RewardsTabs } from "./rewards-tabs"
import { getCachedHomeSnapshot } from "@/app/lib/home-data"
import { RewardsBalanceHero } from "./rewards-balance-hero"

export const metadata: Metadata = {
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
}

export default async function RewardsPage() {
  const { chains, totalPools, completedPools, progressPercentage } = await getCachedHomeSnapshot()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <RewardsBalanceHero />

          <div className="mb-8">
            <h2 className="sr-only">Quest progress overview</h2>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Your progress</span>
              <span className="text-[11.5px] font-data tabular-nums text-muted-foreground">
                {completedPools}/{totalPools} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" aria-label="Overall quest completion progress" />
          </div>

          <RewardsTabs chains={chains} />
        </div>
      </main>
    </div>
  )
}
