"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { CreditLinesCard } from "./credit-lines-card"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { PortfolioPositionsTabs } from "./portfolio-positions-tabs"
import { RecentActivity } from "./recent-activity"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"
import type { BorrowSnapshot } from "./borrow-hero-state"
import { usePortfolioPage } from "./use-portfolio-page"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })}`
}

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
  walletProfileId,
}: {
  initialData?: PortfolioPageData
  walletProfileId?: string
}) {
  const resolvedWalletProfileId = walletProfileId ?? initialData?.walletProfile.id
  const { data } = usePortfolioPage({ walletProfileId: resolvedWalletProfileId ?? "" }, initialData)
  const [activeTab, setActiveTab] = useState<PortfolioTab>("lending")
  const [borrowSnapshot, setBorrowSnapshot] = useState<BorrowSnapshot>(() => ({
    approvedUsd: initialData?.borrow.creditLines.approvedUsd ?? data?.borrow.creditLines.approvedUsd ?? 0,
    totalBorrowedUsd: initialData?.borrow.creditLines.totalBorrowedUsd ?? data?.borrow.creditLines.totalBorrowedUsd ?? 0,
    totalCollateralUsd: initialData?.borrow.creditLines.totalCollateralUsd ?? data?.borrow.creditLines.totalCollateralUsd ?? 0,
    averageHealthFactor: initialData?.borrow.creditLines.averageHealthFactor ?? data?.borrow.creditLines.averageHealthFactor ?? null,
    currentLtvPct: initialData?.borrow.creditLines.currentLtvPct ?? data?.borrow.creditLines.currentLtvPct ?? 0,
  }))

  useEffect(() => {
    if (!data) return
    setBorrowSnapshot({
      approvedUsd: data.borrow.creditLines.approvedUsd,
      totalBorrowedUsd: data.borrow.creditLines.totalBorrowedUsd,
      totalCollateralUsd: data.borrow.creditLines.totalCollateralUsd,
      averageHealthFactor: data.borrow.creditLines.averageHealthFactor,
      currentLtvPct: data.borrow.creditLines.currentLtvPct,
    })
  }, [data])

  const handleSnapshotChange = useCallback((snapshot: BorrowSnapshot) => {
    setBorrowSnapshot((previous) => {
      if (
        previous.approvedUsd === snapshot.approvedUsd &&
        previous.totalBorrowedUsd === snapshot.totalBorrowedUsd &&
        previous.totalCollateralUsd === snapshot.totalCollateralUsd &&
        previous.averageHealthFactor === snapshot.averageHealthFactor &&
        previous.currentLtvPct === snapshot.currentLtvPct
      ) {
        return previous
      }
      return snapshot
    })
  }, [])

  const collateralPositions = useMemo(
    () =>
      data
        ? data.borrow.collateralPositions.map((position) => ({
            ...position,
            feesLabel: formatUsd(position.feesUsd),
          }))
        : [],
    [data],
  )

  if (!data || !resolvedWalletProfileId) return null

  return (
    <>
      <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} pageData={data} borrowSnapshot={borrowSnapshot} />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <PortfolioSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={borrowSnapshot} />
          <SectionDivider />
          <PortfolioSection>
            <PortfolioPositions
              section="all"
              collateralPositions={collateralPositions}
              debtPositions={data.borrow.debtPositions}
              onSnapshotChange={handleSnapshotChange}
              showSummary={false}
            />
          </PortfolioSection>
          <SectionDivider />
          <PortfolioSection title="Credit Analysis">
            <StakeWizard />
          </PortfolioSection>
        </div>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments investments={data.lend.investments} /> : null}
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
