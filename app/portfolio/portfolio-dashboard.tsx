"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import type { PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { CreditLinesCard } from "./credit-lines-card"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { RecentActivity } from "./recent-activity"
import { PortfolioStrategies } from "./portfolio-strategies"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"
import { usePortfolioPage } from "./use-portfolio-page"

function PortfolioSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      {title ? (
        <h2 className="mb-3 mt-1 text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      ) : null}
      {children}
    </section>
  )
}

function PortfolioSectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 mt-1 text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
}

function SectionDivider() {
  return (
    <div className="py-3 md:py-4" aria-hidden="true">
      <div className="h-px w-full bg-border/80 dark:bg-white/10" />
    </div>
  )
}

export function PortfolioDashboard({
  initialData,
  walletProfileId = "demo-wallet",
}: {
  initialData?: PortfolioPageData
  walletProfileId?: string
}) {
  const { data } = usePortfolioPage({ walletProfileId }, initialData)
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview")

  if (!data) return null

  return (
    <>
      <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} pageData={data} />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <PortfolioSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={data.borrow.creditLines} />
          <SectionDivider />
          <PortfolioSection title="Credit Markets">
            <PortfolioPositions
              section="all"
              collateralPositions={data.borrow.collateralPositions}
              debtPositions={data.borrow.debtPositions}
            />
          </PortfolioSection>
          <SectionDivider />
          <PortfolioSection title="Credit Analysis">
            <StakeWizard />
          </PortfolioSection>
        </div>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments investments={data.lend.investments} /> : null}
      {activeTab === "lending" ? <PortfolioStrategies buckets={data.lend.strategyBuckets} /> : null}
      {activeTab === "looping" ? (
        <PortfolioPositionsTabs
          allowedTabs={["LP Collaterals", "Positions", "Open Orders", "TWAP", "History"]}
          initialTab="Positions"
          data={data.multiply}
        />
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={data.activity.rows} /> : null}
    </>
  )
}
