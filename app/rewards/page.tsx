import type { Metadata } from "next"
import { RewardsPageClient } from "./rewards-page-client"
import { fetchRewardsPage } from "@/app/lib/data/providers/rewards"
import { resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"

export const metadata: Metadata = {
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
}

export default async function RewardsPage() {
  if (resolveDataSourceMode() === "live") {
    return (
      <div className="bg-background">
        <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
          <div className="mx-auto max-w-[1152px]">
            <RewardsPageClient />
          </div>
        </main>
      </div>
    )
  }
  const walletProfileId = resolvePortfolioWalletProfileId()
  const pageData = await fetchRewardsPage({ walletProfileId })

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
        <div className="mx-auto max-w-[1152px]">
          <RewardsPageClient pageData={pageData} />
        </div>
      </main>
    </div>
  )
}
