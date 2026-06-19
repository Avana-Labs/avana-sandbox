"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useAvanaSession } from "@/app/lib/avana-session"
import { mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import type { PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { DeleverageModal } from "@/app/multiply/components/deleverage-modal"
import { CreditLinesCard } from "@/app/portfolio/credit-lines-card"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { usePortfolioBorrowLive } from "@/app/portfolio/use-portfolio-borrow-live"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"

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
  const [deleverageOpen, setDeleverageOpen] = useState(false)
  const [deleveragePositionId, setDeleveragePositionId] = useState<string | null>(null)
  const avanaSession = useAvanaSession(resolvedWalletProfileId ?? "demo-wallet")
  const borrowSession = useBorrowSession({
    walletId: avanaSession.walletId,
    sessionSeed: avanaSession.borrowSessionSeed,
  })
  const multiplySession = useMultiplySession({
    walletId: avanaSession.walletId,
    sessionSeed: avanaSession.multiplySessionSeed,
  })
  const portfolioBorrow = usePortfolioBorrowLive(avanaSession.walletId, borrowSession)
  const portfolioMultiply = usePortfolioMultiplyLive(avanaSession.walletId, multiplySession)
  const multiplySnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd: portfolioMultiply?.creditLines.approvedUsd ?? data?.multiply.creditLines.approvedUsd ?? initialData?.multiply.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd:
        portfolioMultiply?.creditLines.liquidationThresholdUsd ??
        data?.multiply.creditLines.liquidationThresholdUsd ??
        initialData?.multiply.creditLines.liquidationThresholdUsd ??
        0,
      totalBorrowedUsd:
        portfolioMultiply?.creditLines.totalBorrowedUsd ?? data?.multiply.creditLines.totalBorrowedUsd ?? initialData?.multiply.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd:
        portfolioMultiply?.creditLines.totalCollateralUsd ??
        data?.multiply.creditLines.totalCollateralUsd ??
        initialData?.multiply.creditLines.totalCollateralUsd ??
        0,
      averageHealthFactor:
        portfolioMultiply?.creditLines.averageHealthFactor ??
        data?.multiply.creditLines.averageHealthFactor ??
        initialData?.multiply.creditLines.averageHealthFactor ??
        null,
      currentLtvPct:
        portfolioMultiply?.creditLines.currentLtvPct ?? data?.multiply.creditLines.currentLtvPct ?? initialData?.multiply.creditLines.currentLtvPct ?? 0,
    }),
    [data, initialData, portfolioMultiply],
  )
  const borrowSnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd: portfolioBorrow?.creditLines.approvedUsd ?? data?.borrow.creditLines.approvedUsd ?? initialData?.borrow.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd:
        portfolioBorrow?.creditLines.liquidationThresholdUsd ??
        data?.borrow.creditLines.liquidationThresholdUsd ??
        initialData?.borrow.creditLines.liquidationThresholdUsd ??
        0,
      totalBorrowedUsd:
        portfolioBorrow?.creditLines.totalBorrowedUsd ?? data?.borrow.creditLines.totalBorrowedUsd ?? initialData?.borrow.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd:
        portfolioBorrow?.creditLines.totalCollateralUsd ??
        data?.borrow.creditLines.totalCollateralUsd ??
        initialData?.borrow.creditLines.totalCollateralUsd ??
        0,
      averageHealthFactor:
        portfolioBorrow?.creditLines.averageHealthFactor ??
        data?.borrow.creditLines.averageHealthFactor ??
        initialData?.borrow.creditLines.averageHealthFactor ??
        null,
      currentLtvPct:
        portfolioBorrow?.creditLines.currentLtvPct ?? data?.borrow.creditLines.currentLtvPct ?? initialData?.borrow.creditLines.currentLtvPct ?? 0,
    }),
    [data, initialData, portfolioBorrow],
  )

  const collateralPositions = portfolioBorrow?.collateralPositions ?? data?.borrow.collateralPositions ?? initialData?.borrow.collateralPositions ?? []
  const debtPositions = portfolioBorrow?.debtPositions ?? data?.borrow.debtPositions ?? initialData?.borrow.debtPositions ?? []
  const activityRows = useMemo(
    () => [
      ...mapTransactionHistoryToActivityRows(borrowSession.transactionHistory),
      ...multiplySession.transactionHistory.map((item) => ({
        id: item.id,
        at: new Date(item.timestamp).toISOString(),
        product: "multiply" as const,
        kind: item.kind === "multiply" ? ("open" as const) : ("reduce" as const),
        status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
        amountUsd: 0,
        primaryLabel: item.kind === "multiply" ? "Simulated multiply" : "Simulated deleverage",
        secondaryLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
        txHash: item.hash,
      })),
      ...(data?.activity.rows ?? initialData?.activity.rows ?? []),
    ],
    [borrowSession.transactionHistory, multiplySession.transactionHistory, data?.activity.rows, initialData?.activity.rows],
  )

  const deleverageTarget = useMemo(() => {
    if (!deleveragePositionId) return null
    const position = multiplySession.state.positions[deleveragePositionId]
    if (!position) return null
    const market = multiplySession.state.markets[position.marketId]
    if (!market) return null
    return { position, market }
  }, [deleveragePositionId, multiplySession.state.markets, multiplySession.state.positions])

  if (!data || !resolvedWalletProfileId || !portfolioBorrow) return null

  return (
    <>
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pageData={data}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
      />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-5">
          <DashboardSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={borrowSnapshot} />
          <DashboardSection className="pt-8">
            <DashboardBorrowTab
              section="all"
              collateralPositions={collateralPositions}
              debtPositions={debtPositions}
              showSummary={false}
              walletId={avanaSession.walletId}
              borrowSession={borrowSession}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "lending" ? <PortfolioInvestments investments={data.lend.investments} /> : null}
      {activeTab === "looping" ? (
        <div className="mt-12 space-y-5">
          <DashboardSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={multiplySnapshot} />
          <DashboardSection className="pt-8">
            <MultiplyCollateralTable
              rows={portfolioMultiply?.lpCollaterals ?? data.multiply.lpCollaterals}
              onDeleverage={(positionId) => {
                setDeleveragePositionId(positionId)
                setDeleverageOpen(true)
              }}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={activityRows} /> : null}

      {deleverageTarget ? (
        <DeleverageModal
          open={deleverageOpen}
          onOpenChange={(open) => {
            setDeleverageOpen(open)
            if (!open) setDeleveragePositionId(null)
          }}
          market={deleverageTarget.market}
          position={deleverageTarget.position}
          session={multiplySession}
        />
      ) : null}
    </>
  )
}
