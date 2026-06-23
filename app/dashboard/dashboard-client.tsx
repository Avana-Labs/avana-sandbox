"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { parseDashboardTab } from "@/app/lib/action-system/dashboard-routing"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { selectBorrowSnapshot } from "@/app/lib/borrow-system/dashboard-selectors"
import { buildPortfolioBorrowData, mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import type { PortfolioLendTabData, PortfolioMultiplyTabData, PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
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

export function mergeLendTabData(
  staticData: PortfolioLendTabData,
  liveData: PortfolioLendTabData | null,
): PortfolioLendTabData {
  if (!liveData) return staticData

  return {
    investments: liveData.investments,
    positions: liveData.positions,
    strategyBuckets: staticData.strategyBuckets,
    history: liveData.history,
    rewardsSummary: liveData.rewardsSummary ?? staticData.rewardsSummary,
  }
}

export function mergeMultiplyTabData(
  staticData: PortfolioMultiplyTabData,
  liveData: PortfolioMultiplyTabData | null,
): PortfolioMultiplyTabData {
  if (!liveData) return staticData

  return {
    creditLines: liveData.creditLines,
    lpCollaterals: liveData.lpCollaterals,
    positions: liveData.positions,
    openOrders: staticData.openOrders,
    twapOrders: staticData.twapOrders,
    history: liveData.history,
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabFromUrl = parseDashboardTab(searchParams.get("tab"))
  const { data } = usePortfolioPage({ walletProfileId: resolvedWalletProfileId ?? "" }, initialData)
  const pageData = data ?? initialData
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => tabFromUrl ?? "overview")
  const [isClaimingLendRewards, setIsClaimingLendRewards] = useState(false)
  const { walletId, borrow: borrowSession, multiply: multiplySession, lend: lendSession } = useAvanaSessions()
  const portfolioBorrow = usePortfolioBorrowLive(walletId, borrowSession)
  const sessionBorrowTab = useMemo(() => {
    if (!walletId || !borrowSession.state.accounts[walletId]) return null
    return buildPortfolioBorrowData(borrowSession.state, walletId)
  }, [borrowSession.state, walletId])
  const liveBorrowTab = sessionBorrowTab ?? portfolioBorrow
  const portfolioMultiply = usePortfolioMultiplyLive(walletId, multiplySession)
  const portfolioLend = usePortfolioLendLive(walletId, lendSession)
  const multiplySnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd: portfolioMultiply?.creditLines.approvedUsd ?? pageData?.multiply.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd:
        portfolioMultiply?.creditLines.liquidationThresholdUsd ??
        pageData?.multiply.creditLines.liquidationThresholdUsd ??
        0,
      totalBorrowedUsd:
        portfolioMultiply?.creditLines.totalBorrowedUsd ?? pageData?.multiply.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd:
        portfolioMultiply?.creditLines.totalCollateralUsd ??
        pageData?.multiply.creditLines.totalCollateralUsd ??
        0,
      averageHealthFactor:
        portfolioMultiply?.creditLines.averageHealthFactor ??
        pageData?.multiply.creditLines.averageHealthFactor ??
        null,
      currentLtvPct:
        portfolioMultiply?.creditLines.currentLtvPct ?? pageData?.multiply.creditLines.currentLtvPct ?? 0,
    }),
    [pageData, portfolioMultiply],
  )
  const borrowSnapshot = useMemo<BorrowSnapshot>(() => {
    const sessionSnapshot =
      walletId && borrowSession.state.accounts[walletId]
        ? selectBorrowSnapshot(borrowSession.state, walletId)
        : null
    return {
      approvedUsd: sessionSnapshot?.approvedUsd ?? liveBorrowTab?.creditLines.approvedUsd ?? pageData?.borrow.creditLines.approvedUsd ?? 0,
      liquidationThresholdUsd:
        sessionSnapshot?.liquidationThresholdUsd ??
        liveBorrowTab?.creditLines.liquidationThresholdUsd ??
        pageData?.borrow.creditLines.liquidationThresholdUsd ??
        0,
      totalBorrowedUsd:
        sessionSnapshot?.totalBorrowedUsd ?? liveBorrowTab?.creditLines.totalBorrowedUsd ?? pageData?.borrow.creditLines.totalBorrowedUsd ?? 0,
      totalCollateralUsd:
        sessionSnapshot?.totalCollateralUsd ??
        liveBorrowTab?.creditLines.totalCollateralUsd ??
        pageData?.borrow.creditLines.totalCollateralUsd ??
        0,
      averageHealthFactor:
        sessionSnapshot?.averageHealthFactor ??
        liveBorrowTab?.creditLines.averageHealthFactor ??
        pageData?.borrow.creditLines.averageHealthFactor ??
        null,
      currentLtvPct:
        sessionSnapshot?.currentLtvPct ??
        liveBorrowTab?.creditLines.currentLtvPct ??
        pageData?.borrow.creditLines.currentLtvPct ??
        0,
      spokeBreakdown: sessionSnapshot?.spokeBreakdown,
    }
  }, [borrowSession.state, liveBorrowTab, pageData, walletId])

  const collateralPositions =
    liveBorrowTab?.collateralPositions ?? pageData?.borrow.collateralPositions ?? []
  const debtPositions = liveBorrowTab?.debtPositions ?? pageData?.borrow.debtPositions ?? []
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
      ...(pageData?.activity.rows ?? []),
    ],
    [borrowSession.transactionHistory, lendSession.transactionHistory, lendSession.walletId, multiplySession.transactionHistory, pageData?.activity.rows],
  )

  const lendTabData = useMemo(() => {
    if (!pageData) return portfolioLend ?? { investments: [], positions: [], strategyBuckets: [], history: [] }
    return mergeLendTabData(pageData.lend, portfolioLend)
  }, [pageData, portfolioLend])

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
    if (!pageData) {
      return portfolioMultiply ?? {
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
    return mergeMultiplyTabData(pageData.multiply, portfolioMultiply)
  }, [pageData, portfolioMultiply])

  const multiplyHero = useMemo(() => {
    const template = pageData?.heroByTab.looping ?? {}
    return buildMultiplyHeroData(template, buildMultiplySnapshotFromTabData(multiplyTabData))
  }, [pageData, multiplyTabData])

  useEffect(() => {
    const tab = parseDashboardTab(searchParams.get("tab"))
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab)
    router.replace(`/dashboard?tab=${tab}`, { scroll: false })
  }

  if (!pageData) return null

  return (
    <>
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pageData={pageData}
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
                const position = multiplySession.state.positions[positionId]
                if (!position) return
                router.push(actionPagePath("multiply", "deleverage", { market: position.marketId }))
              }}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={activityRows} /> : null}
    </>
  )
}
