"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { CreditLinesCard } from "@/app/portfolio/credit-lines-card"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })}`
}

function DashboardSection({
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

function DashboardSectionTitle({ title }: { title: string }) {
  return (
    <h2 className="mb-3 mt-1 text-[19px] font-medium tracking-[-0.03em] text-foreground no-underline md:text-[20px]">
      {title}
    </h2>
  )
}

export function DashboardClient({
  initialData,
  walletProfileId,
}: {
  initialData?: PortfolioPageData
  walletProfileId?: string
}) {
  const resolvedWalletProfileId = walletProfileId ?? initialData?.walletProfile.id
  const { data } = usePortfolioPage({ walletProfileId: resolvedWalletProfileId ?? "" }, initialData)
  const [activeTab, setActiveTab] = useState<DashboardTab>("lending")
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
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pageData={data}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={fetchedMultiplySnapshot}
      />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <DashboardSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={borrowSnapshot} />
          <DashboardSection className="pt-8">
            <DashboardBorrowTab
              section="all"
              collateralPositions={collateralPositions}
              debtPositions={data.borrow.debtPositions}
              onSnapshotChange={handleSnapshotChange}
              showSummary={false}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments investments={data.lend.investments} /> : null}
      {activeTab === "looping" ? (
        <div className="mt-12 space-y-5">
          <DashboardSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={fetchedMultiplySnapshot} />
          <DashboardSection className="pt-8">
            <MultiplyCollateralTable rows={data.multiply.lpCollaterals} />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={data.activity.rows} /> : null}
    </>
  )
}
