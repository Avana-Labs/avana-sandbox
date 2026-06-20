"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import type { PortfolioLendTabData, PortfolioMultiplyTabData, PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
import { DeleverageModal } from "@/app/multiply/components/deleverage-modal"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"
import { CreditLinesCard } from "@/app/portfolio/credit-lines-card"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"
import { buildMultiplyHeroData, buildMultiplySnapshotFromTabData } from "@/app/portfolio/multiply-hero-state"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import { PortfolioPositionsTabs } from "@/app/portfolio/portfolio-positions-tabs"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildLendSnapshotFromTabData } from "@/app/portfolio/lend-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { usePortfolioBorrowLive } from "@/app/portfolio/use-portfolio-borrow-live"
import { usePortfolioLendLive } from "@/app/portfolio/use-portfolio-lend-live"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"

function mergeLendTabData(
  staticData: PortfolioLendTabData,
  liveData: PortfolioLendTabData | null,
): PortfolioLendTabData {
  if (!liveData) return staticData

  return {
    investments: liveData.investments.length > 0 ? liveData.investments : staticData.investments,
    positions: liveData.positions.length > 0 ? liveData.positions : staticData.positions,
    strategyBuckets: staticData.strategyBuckets,
    history: liveData.history.length > 0 ? liveData.history : staticData.history,
    rewardsSummary: liveData.rewardsSummary ?? staticData.rewardsSummary,
  }
}

function mergeMultiplyTabData(
  staticData: PortfolioMultiplyTabData,
  liveData: PortfolioMultiplyTabData | null,
): PortfolioMultiplyTabData {
  if (!liveData) return staticData

  return {
    creditLines: liveData.creditLines,
    lpCollaterals: liveData.lpCollaterals.length > 0 ? liveData.lpCollaterals : staticData.lpCollaterals,
    positions: liveData.positions.length > 0 ? liveData.positions : staticData.positions,
    openOrders: staticData.openOrders,
    twapOrders: staticData.twapOrders,
    history: liveData.history.length > 0 ? liveData.history : staticData.history,
  }
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
  const [isClaimingLendRewards, setIsClaimingLendRewards] = useState(false)
  const [deleverageOpen, setDeleverageOpen] = useState(false)
  const [deleveragePositionId, setDeleveragePositionId] = useState<string | null>(null)
  const { walletId, borrow: borrowSession, multiply: multiplySession, lend: lendSession } = useAvanaSessions()
  const portfolioBorrow = usePortfolioBorrowLive(walletId, borrowSession)
  const portfolioMultiply = usePortfolioMultiplyLive(walletId, multiplySession)
  const portfolioLend = usePortfolioLendLive(walletId, lendSession)
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
        amountUsd: item.kind === "multiply" ? item.amountUsd : -item.amountUsd,
        primaryLabel: item.kind === "multiply" ? "Simulated multiply" : "Simulated deleverage",
        secondaryLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
        txHash: item.hash,
      })),
      ...buildLendActivityHistory(lendSession.walletId, lendSession.transactionHistory),
      ...(data?.activity.rows ?? initialData?.activity.rows ?? []),
    ],
    [borrowSession.transactionHistory, lendSession.transactionHistory, lendSession.walletId, multiplySession.transactionHistory, data?.activity.rows, initialData?.activity.rows],
  )

  const deleverageTarget = useMemo(() => {
    if (!deleveragePositionId) return null
    const position = multiplySession.state.positions[deleveragePositionId]
    if (!position) return null
    const market = multiplySession.state.markets[position.marketId]
    if (!market) return null
    return { position, market }
  }, [deleveragePositionId, multiplySession.state.markets, multiplySession.state.positions])

  const lendTabData = useMemo(() => {
    if (!data) return portfolioLend ?? initialData?.lend ?? { investments: [], positions: [], strategyBuckets: [], history: [] }
    return mergeLendTabData(data.lend, portfolioLend)
  }, [data, initialData, portfolioLend])

  const lendSnapshot = useMemo(() => buildLendSnapshotFromTabData(lendTabData), [lendTabData])

  const handleClaimLendRewards = async () => {
    if (isClaimingLendRewards) return
    setIsClaimingLendRewards(true)
    try {
      await lendSession.claimRewards()
    } finally {
      setIsClaimingLendRewards(false)
    }
  }

  const multiplyTabData = useMemo(() => {
    if (!data) {
      return portfolioMultiply ?? initialData?.multiply ?? {
        creditLines: {
          approvedUsd: 0,
          liquidationThresholdUsd: 0,
          averageHealthFactor: null,
          currentLtvPct: 0,
          totalBorrowedUsd: 0,
          totalCollateralUsd: 0,
        },
        lpCollaterals: [],
        positions: [],
        openOrders: [],
        twapOrders: [],
        history: [],
      }
    }
    return mergeMultiplyTabData(data.multiply, portfolioMultiply)
  }, [data, initialData, portfolioMultiply])

  const multiplyHero = useMemo(() => {
    const template = data?.heroByTab.looping ?? initialData?.heroByTab.looping ?? {}
    return buildMultiplyHeroData(template, buildMultiplySnapshotFromTabData(multiplyTabData))
  }, [data, initialData, multiplyTabData])

  if (!data || !resolvedWalletProfileId || !portfolioBorrow) return null

  return (
    <>
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pageData={data}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
        lendSnapshot={lendSnapshot}
        multiplyHero={multiplyHero}
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
              walletId={walletId}
              borrowSession={borrowSession}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "lending" ? (
        <PortfolioInvestments
          investments={lendTabData.investments}
          rewardsSummary={lendTabData.rewardsSummary}
          onClaimRewards={handleClaimLendRewards}
          isClaimingRewards={isClaimingLendRewards}
        />
      ) : null}
      {activeTab === "looping" ? (
        <div className="mt-12 space-y-5">
          <DashboardSectionTitle title="Credit Limits" />
          <CreditLinesCard creditLines={multiplySnapshot} />
          <DashboardSection className="space-y-8 pt-8">
            <PortfolioPositionsTabs data={multiplyTabData} initialTab="LP Collaterals" />
            <MultiplyCollateralTable
              rows={multiplyTabData.lpCollaterals}
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
