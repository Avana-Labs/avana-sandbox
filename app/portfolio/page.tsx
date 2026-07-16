import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { RewardsPageClient } from "@/app/rewards/rewards-page-client"
import { fetchRewardsPage } from "@/app/lib/data/providers/rewards"
import { resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Portfolio",
  description: "Track your accounts, positions, quest progress, and activity across Avana.",
  path: "/portfolio",
  keywords: ["Avana portfolio", "positions", "quests", "activity", "rewards"],
})

const PORTFOLIO_SCHEMA = buildWebPageSchema({
  name: "Portfolio",
  description: "Track your accounts, positions, quest progress, and activity across Avana.",
  url: "https://avana.cc/portfolio",
})

export default async function PortfolioPage() {
  if (resolveDataSourceMode() === "live") {
    return (
      <>
        <SchemaMarkup data={PORTFOLIO_SCHEMA} />
        <div className="bg-background">
          <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
            <div className="mx-auto max-w-[1152px]">
              <RewardsPageClient />
            </div>
          </main>
        </div>
      </>
    )
  }
  const walletProfileId = await resolvePortfolioWalletProfileId()
  const pageData = await fetchRewardsPage({ walletProfileId })

  return (
    <>
      <SchemaMarkup data={PORTFOLIO_SCHEMA} />
      <div className="bg-background">
        <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
          <div className="mx-auto max-w-[1152px]">
            <RewardsPageClient pageData={pageData} />
          </div>
        </main>
      </div>
    </>
  )
}
