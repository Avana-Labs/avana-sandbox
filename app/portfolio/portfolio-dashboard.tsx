"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { CreditLinesCard } from "./credit-lines-card"
import { StakeWizard } from "../stake/stake-wizard"
import { PortfolioInvestments } from "./portfolio-investments"
import { PortfolioPositions } from "./portfolio-positions"
import { RecentActivity } from "./recent-activity"
import { PortfolioTabs, type PortfolioTab } from "./portfolio-tabs"
import { MultiplyCollateralTable } from "./multiply-collateral-table"
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
  className,
  children,
}: {
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={["space-y-4", className].filter(Boolean).join(" ")}>
      {title ? (
        <h2 className="mb-3 mt-1 text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      ) : null}
      {children}
    </section>
  )
}

function PortfolioSectionTitle({ title }: { title: string }) {
  return (
    <h2 className="mb-3 mt-1 text-[19px] font-medium tracking-[-0.03em] text-foreground no-underline md:text-[20px]">
      {title}
    </h2>
  )
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
  const [borrowSnapshotOverride, setBorrowSnapshotOverride] = useState<BorrowSnapshot | null>(null)
  const fetchedMultiplySnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd: data?.multiply.creditLines.approvedUsd ?? initialData?.multiply.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd: data?.multiply.creditLines.liquidationThresholdUsd ?? initialData?.multiply.creditLines.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: data?.multiply.creditLines.totalBorrowedUsd ?? initialData?.multiply.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd: data?.multiply.creditLines.totalCollateralUsd ?? initialData?.multiply.creditLines.totalCollateralUsd ?? 0,
      averageHealthFactor: data?.multiply.creditLines.averageHealthFactor ?? initialData?.multiply.creditLines.averageHealthFactor ?? null,
      currentLtvPct: data?.multiply.creditLines.currentLtvPct ?? initialData?.multiply.creditLines.currentLtvPct ?? 0,
    }),
    [data, initialData],
  )
  const fetchedBorrowSnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd: data?.borrow.creditLines.approvedUsd ?? initialData?.borrow.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd: data?.borrow.creditLines.liquidationThresholdUsd ?? initialData?.borrow.creditLines.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: data?.borrow.creditLines.totalBorrowedUsd ?? initialData?.borrow.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd: data?.borrow.creditLines.totalCollateralUsd ?? initialData?.borrow.creditLines.totalCollateralUsd ?? 0,
      averageHealthFactor: data?.borrow.creditLines.averageHealthFactor ?? initialData?.borrow.creditLines.averageHealthFactor ?? null,
      currentLtvPct: data?.borrow.creditLines.currentLtvPct ?? initialData?.borrow.creditLines.currentLtvPct ?? 0,
    }),
    [data, initialData],
  )
  const borrowSnapshot = borrowSnapshotOverride ?? fetchedBorrowSnapshot

  useEffect(() => {
    setBorrowSnapshotOverride(null)
  }, [resolvedWalletProfileId])

  const handleSnapshotChange = useCallback((snapshot: BorrowSnapshot) => {
    setBorrowSnapshotOverride((previous) => {
      const baseline = previous ?? fetchedBorrowSnapshot
      if (
        baseline.approvedUsd === snapshot.approvedUsd &&
        baseline.liquidationThresholdUsd === snapshot.liquidationThresholdUsd &&
        baseline.totalBorrowedUsd === snapshot.totalBorrowedUsd &&
        baseline.totalCollateralUsd === snapshot.totalCollateralUsd &&
        baseline.averageHealthFactor === snapshot.averageHealthFactor &&
        baseline.currentLtvPct === snapshot.currentLtvPct
      ) {
        return previous
      }
      return snapshot
    })
  }, [fetchedBorrowSnapshot])

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
      <PortfolioTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pageData={data}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={fetchedMultiplySnapshot}
      />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <PortfolioSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={borrowSnapshot} />
          <PortfolioSection className="pt-8">
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
        <div className="mt-12 space-y-5">
          <PortfolioSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={fetchedMultiplySnapshot} />
          <PortfolioSection className="pt-8">
            <MultiplyCollateralTable rows={data.multiply.lpCollaterals} />
          </PortfolioSection>
        </div>
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={data.activity.rows} /> : null}
    </>
  )
}
