import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { DashboardPageClient } from "@/app/dashboard/dashboard-page-client"
import { fetchRewardsPage } from "@/app/lib/data/providers/rewards"
import { resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Dashboard",
  description: "Track your accounts, positions, quest progress, and activity across Avana.",
  path: "/dashboard",
  keywords: ["Avana dashboard", "positions", "quests", "activity", "rewards"],
})

const DASHBOARD_SCHEMA = buildWebPageSchema({
  name: "Dashboard",
  description: "Track your accounts, positions, quest progress, and activity across Avana.",
  url: "https://avana.cc/dashboard",
})

export default async function DashboardPage() {
  if (resolveDataSourceMode() === "live") {
    return (
      <>
        <SchemaMarkup data={DASHBOARD_SCHEMA} />
        <div className="bg-background">
          <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
            <div className="mx-auto max-w-[1152px]">
              <DashboardPageClient />
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
      <SchemaMarkup data={DASHBOARD_SCHEMA} />
      <div className="bg-background">
        <main className="container mx-auto px-3 py-6 sm:px-4 md:py-10">
          <div className="mx-auto max-w-[1152px]">
            <DashboardPageClient pageData={pageData} />
          </div>
        </main>
      </div>
    </>
  )
}
