import type { Metadata } from "next"
import { fetchPortfolioPage, resolvePortfolioWalletProfileId } from "@/app/lib/data/providers/portfolio"
import { PortfolioDashboard } from "./portfolio-dashboard"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track portfolio balance, positions, strategies, and recent activity.",
}

export default async function PortfolioPage() {
  const walletProfileId = resolvePortfolioWalletProfileId()
  const initialData = await fetchPortfolioPage({ walletProfileId })

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <PortfolioDashboard initialData={initialData} walletProfileId={walletProfileId} />
        </div>
      </main>
    </div>
  )
}
