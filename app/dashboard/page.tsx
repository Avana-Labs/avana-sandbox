import type { Metadata } from "next"
import { Suspense } from "react"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { fetchPortfolioPage, resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { DashboardClient } from "./dashboard-client"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Dashboard",
  description: "Track portfolio balance, positions, strategies, and recent activity.",
  path: "/dashboard",
  keywords: ["Avana dashboard", "portfolio", "positions", "DeFi activity"],
})

export default async function DashboardPage() {
  if (resolveDataSourceMode() === "live") {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Dashboard",
            description: "Track portfolio balance, positions, strategies, and recent activity.",
            url: "https://avana.cc/dashboard",
          })}
        />
        <div className="bg-background">
          <main className="container mx-auto px-4 py-4 sm:py-8">
            <div className="mx-auto max-w-[1152px]">
              <Suspense fallback={null}>
                <DashboardClient />
              </Suspense>
            </div>
          </main>
        </div>
      </>
    )
  }
  const walletProfileId = resolvePortfolioWalletProfileId()
  const initialData = await fetchPortfolioPage({ walletProfileId })

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Dashboard",
          description: "Track portfolio balance, positions, strategies, and recent activity.",
          url: "https://avana.cc/dashboard",
        })}
      />
      <div className="bg-background">
        <main className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mx-auto max-w-[1152px]">
            <Suspense fallback={null}>
              <DashboardClient initialData={initialData} walletProfileId={walletProfileId} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  )
}
