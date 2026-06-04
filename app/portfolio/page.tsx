import type { Metadata } from "next"
import { PortfolioDashboard } from "./portfolio-dashboard"

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track portfolio balance, positions, strategies, and recent activity.",
}

export default function PortfolioPage() {
  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <PortfolioDashboard />
        </div>
      </main>
    </div>
  )
}
