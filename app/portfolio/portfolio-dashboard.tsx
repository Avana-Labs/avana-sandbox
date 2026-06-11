"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { CreditLinesCard } from "./credit-lines-card"
import { StakeWizard } from "../stake/stake-wizard"
import { RecentActivity } from "../lend/components/recent-activity"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { PortfolioStrategies } from "./portfolio-strategies"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"

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

export function PortfolioDashboard() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview")

  return (
    <>
      <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <PortfolioSectionTitle title="Credit Limits" />
          <CreditLinesCard />
          <SectionDivider />
          <PortfolioSection title="Credit Markets">
            <PortfolioPositions section="all" />
          </PortfolioSection>
          <SectionDivider />
          <PortfolioSection title="Credit Analysis">
            <StakeWizard />
          </PortfolioSection>
        </div>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments /> : null}
      {activeTab === "lending" ? <PortfolioStrategies /> : null}
      {activeTab === "looping" ? (
        <PortfolioPositionsTabs allowedTabs={["Positions", "Open Orders", "TWAP", "History"]} initialTab="Positions" />
      ) : null}
      {activeTab === "activity" ? <RecentActivity /> : null}
    </>
  )
}
