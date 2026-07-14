import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { RewardsPageClient } from "./rewards-page-client"
import { fetchRewardsPage } from "@/app/lib/data/providers/rewards"
import { resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
  path: "/rewards",
  keywords: ["Avana rewards", "quests", "points", "protocol metrics"],
})

export default async function RewardsPage() {
  if (resolveDataSourceMode() === "live") {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Rewards",
            description: "Track quest progress, points, and protocol metrics across Avana rewards.",
            url: "https://avana.cc/rewards",
          })}
        />
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
  const walletProfileId = resolvePortfolioWalletProfileId()
  const pageData = await fetchRewardsPage({ walletProfileId })

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Rewards",
          description: "Track quest progress, points, and protocol metrics across Avana rewards.",
          url: "https://avana.cc/rewards",
        })}
      />
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
