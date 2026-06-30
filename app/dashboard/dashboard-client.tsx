"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { dashboardHrefForTab, parseDashboardTab } from "@/app/lib/action-system/dashboard-routing"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { selectBorrowSnapshot } from "@/app/lib/borrow-system/dashboard-selectors"
import { buildPortfolioBorrowData, mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import type { PortfolioLendTabData, PortfolioMultiplyTabData, PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"
import {
  buildBorrowDashboardMetrics,
  buildBorrowDashboardMetricsFromSnapshot,
  buildLendDashboardMetrics,
  buildMultiplyDashboardMetrics,
  type DashboardTabMetrics,
} from "@/app/portfolio/dashboard-tab-metrics"
import {
  DashboardLendPerformanceSection,
  DashboardOverviewSection,
  DashboardPerformanceSection,
} from "@/app/portfolio/dashboard-metric-section"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"
import { buildMultiplyHeroData, buildMultiplySnapshotFromTabData } from "@/app/portfolio/multiply-hero-state"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import { PortfolioLendingOpportunities } from "@/app/portfolio/portfolio-lending-opportunities"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildLendSnapshotFromTabData } from "@/app/portfolio/lend-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { usePortfolioBorrowLive } from "@/app/portfolio/use-portfolio-borrow-live"
import { usePortfolioLendLive } from "@/app/portfolio/use-portfolio-lend-live"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"

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

export function DashboardClient({
  initialData,
  walletProfileId,
}: {
  initialData?: PortfolioPageData
  walletProfileId?: string
}) {
  const router = useRouter()
  const hasMounted = useHasMounted()
  const { walletId, borrow: borrowSession, multiply: multiplySession, lend: lendSession } = useAvanaSessions()
  const resolvedWalletProfileId = walletProfileId ?? initialData?.walletProfile.id ?? walletId
  const { data } = usePortfolioPage({ walletProfileId: resolvedWalletProfileId ?? "" }, initialData)
  const pageData = data ?? initialData
  const readTabFromLocation = useCallback((): DashboardTab => {
    if (typeof window === "undefined") return "lending"
    return parseDashboardTab(new URLSearchParams(window.location.search).get("tab")) ?? "lending"
  }, [])
  const [activeTab, setActiveTab] = useState<DashboardTab>("lending")
  const dashboardReturnHref = dashboardHrefForTab(activeTab)
  const [isClaimingLendRewards, setIsClaimingLendRewards] = useState(false)
  const portfolioBorrow = usePortfolioBorrowLive(walletId, borrowSession)
  const sessionBorrowTab = useMemo(() => {
    if (!hasMounted || !walletId || !borrowSession.state.accounts[walletId]) return null
    return buildPortfolioBorrowData(borrowSession.state, walletId)
  }, [borrowSession.state, hasMounted, walletId])
  const liveBorrowTab = hasMounted ? (sessionBorrowTab ?? portfolioBorrow) : null
  const portfolioMultiply = usePortfolioMultiplyLive(walletId, multiplySession)
  const portfolioLend = usePortfolioLendLive(walletId, lendSession)
  const multiplySnapshot = useMemo<BorrowSnapshot>(
    () => ({
      approvedUsd:
        (hasMounted ? portfolioMultiply?.creditLines.approvedUsd : null) ??
        pageData?.multiply.creditLines.approvedUsd ??
        0,
      liquidationThresholdUsd:
        (hasMounted ? portfolioMultiply?.creditLines.liquidationThresholdUsd : null) ??
        pageData?.multiply.creditLines.liquidationThresholdUsd ??
        0,
      totalBorrowedUsd:
        (hasMounted ? portfolioMultiply?.creditLines.totalBorrowedUsd : null) ??
        pageData?.multiply.creditLines.totalBorrowedUsd ??
        0,
      totalCollateralUsd:
        (hasMounted ? portfolioMultiply?.creditLines.totalCollateralUsd : null) ??
        pageData?.multiply.creditLines.totalCollateralUsd ??
        0,
      averageHealthFactor:
        (hasMounted ? portfolioMultiply?.creditLines.averageHealthFactor : null) ??
        pageData?.multiply.creditLines.averageHealthFactor ??
        null,
      currentLtvPct:
        (hasMounted ? portfolioMultiply?.creditLines.currentLtvPct : null) ??
        pageData?.multiply.creditLines.currentLtvPct ??
        0,
    }),
    [hasMounted, pageData, portfolioMultiply],
  )
  const borrowSnapshot = useMemo<BorrowSnapshot>(() => {
    if (!hasMounted) {
      return {
        approvedUsd: pageData?.borrow.creditLines.approvedUsd ?? 0,
        liquidationThresholdUsd: pageData?.borrow.creditLines.liquidationThresholdUsd ?? 0,
        totalBorrowedUsd: pageData?.borrow.creditLines.totalBorrowedUsd ?? 0,
        totalCollateralUsd: pageData?.borrow.creditLines.totalCollateralUsd ?? 0,
        averageHealthFactor: pageData?.borrow.creditLines.averageHealthFactor ?? null,
        currentLtvPct: pageData?.borrow.creditLines.currentLtvPct ?? 0,
      }
    }

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
  }, [borrowSession.state, hasMounted, liveBorrowTab, pageData, walletId])

  const collateralPositions =
    liveBorrowTab?.collateralPositions ?? pageData?.borrow.collateralPositions ?? []
  const debtPositions = liveBorrowTab?.debtPositions ?? pageData?.borrow.debtPositions ?? []
  const activityRows = useMemo(
    () => [
      ...mapTransactionHistoryToActivityRows(borrowSession.transactionHistory, borrowSession.state.markets),
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
    if (!pageData) return hasMounted ? (portfolioLend ?? { investments: [], positions: [], strategyBuckets: [], history: [] }) : { investments: [], positions: [], strategyBuckets: [], history: [] }
    return mergeLendTabData(pageData.lend, hasMounted ? portfolioLend : null)
  }, [hasMounted, pageData, portfolioLend])

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
      return hasMounted
        ? (portfolioMultiply ?? {
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
          })
        : {
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
    return mergeMultiplyTabData(pageData.multiply, hasMounted ? portfolioMultiply : null)
  }, [hasMounted, pageData, portfolioMultiply])

  const borrowDashboardMetrics = useMemo<DashboardTabMetrics>(() => {
    if (hasMounted && walletId && borrowSession.state.accounts[walletId]) {
      return buildBorrowDashboardMetrics(borrowSession.state, walletId)
    }
    return buildBorrowDashboardMetricsFromSnapshot(borrowSnapshot, collateralPositions, debtPositions)
  }, [borrowSession.state, borrowSnapshot, collateralPositions, debtPositions, hasMounted, walletId])

  const multiplyDashboardMetrics = useMemo<DashboardTabMetrics>(() => {
    if (!hasMounted) {
      return buildMultiplyDashboardMetrics(multiplySession.state, walletId ?? "", pageData?.multiply ?? multiplyTabData)
    }
    return buildMultiplyDashboardMetrics(multiplySession.state, walletId ?? "", multiplyTabData)
  }, [hasMounted, multiplySession.state, multiplyTabData, pageData?.multiply, walletId])

  const lendDashboardMetrics = useMemo(() => buildLendDashboardMetrics(lendTabData), [lendTabData])

  const lendWalletBalancesBySymbol = useMemo(() => {
    const balances: Record<string, number> = {}
    const sessionBalances = walletId ? lendSession.state.walletBalances?.[walletId] : undefined

    if (sessionBalances) {
      for (const [marketId, amount] of Object.entries(sessionBalances)) {
        const market = lendSession.state.markets[marketId]
        if (market) balances[market.asset.symbol.toUpperCase()] = amount
      }
    }

    return balances
  }, [lendSession.state, walletId])

  const multiplyHero = useMemo(() => {
    const template = pageData?.heroByTab.looping ?? {}
    return buildMultiplyHeroData(template, buildMultiplySnapshotFromTabData(multiplyTabData))
  }, [pageData, multiplyTabData])

  useEffect(() => {
    setActiveTab(readTabFromLocation())
    const onPopState = () => setActiveTab(readTabFromLocation())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [readTabFromLocation])

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`)
    }
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
        <div className="mt-12 space-y-10">
          <DashboardOverviewSection title="Credit Overview" metrics={borrowDashboardMetrics.overview} />
          <DashboardSection title="Credit Positions">
            <DashboardBorrowTab
              section="all"
              collateralPositions={collateralPositions}
              debtPositions={debtPositions}
              showSummary={false}
              returnHref={dashboardReturnHref}
            />
          </DashboardSection>
          <DashboardPerformanceSection title="Credit Performance" metrics={borrowDashboardMetrics.performance} />
        </div>
      ) : null}
      {activeTab === "lending" ? (
        <div className="mt-12 space-y-10">
          <DashboardSection title="Lending Positions">
            <PortfolioInvestments
              investments={lendTabData.investments}
              rewardsSummary={lendTabData.rewardsSummary}
              walletBalancesBySymbol={lendWalletBalancesBySymbol}
              onClaimRewards={handleClaimLendRewards}
              isClaimingRewards={isClaimingLendRewards}
              showHeading={false}
            />
          </DashboardSection>
          <DashboardLendPerformanceSection title="Lending Performance" metrics={lendDashboardMetrics} />
          <PortfolioLendingOpportunities buckets={lendTabData.strategyBuckets} returnHref={dashboardReturnHref} />
        </div>
      ) : null}
      {activeTab === "looping" ? (
        <div className="mt-12 space-y-10">
          <DashboardOverviewSection title="Looping Overview" metrics={multiplyDashboardMetrics.overview} />
          <DashboardSection title="Looping Positions">
            <MultiplyCollateralTable
              rows={multiplyTabData.lpCollaterals}
              onDeleverage={(positionId) => {
                const position = multiplySession.state.positions[positionId]
                if (!position) return
                router.push(actionPagePath("multiply", "deleverage", { market: position.marketId, return: dashboardReturnHref }))
              }}
            />
          </DashboardSection>
        </div>
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={activityRows} /> : null}
    </>
  )
}
