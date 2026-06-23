import type { Metadata } from "next"
import { RewardsPageClient } from "./rewards-page-client"
import { fetchRewardsPage } from "@/app/lib/data/providers/rewards"
import { resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"

export const metadata: Metadata = {
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
}

export default async function RewardsPage() {
  const walletProfileId = resolvePortfolioWalletProfileId()
  const pageData = await fetchRewardsPage({ walletProfileId })

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <RewardsPageClient pageData={pageData} />
        </div>
      </main>
    </div>
  )
}
