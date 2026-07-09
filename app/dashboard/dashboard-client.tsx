"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardHrefForTab, parseDashboardTab } from "@/app/lib/action-system/dashboard-routing"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { selectBorrowSnapshot } from "@/app/lib/borrow-system/dashboard-selectors"
import { buildPortfolioBorrowData, mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import type { PortfolioLendTabData, PortfolioMultiplyCollateral, PortfolioMultiplyTabData, PortfolioPageData } from "@/app/lib/data/providers/portfolio"
import { shouldUseOpenGateSession } from "@/app/lib/test-mode"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
import { buildRewardsActivityHistory } from "@/app/lib/rewards-system"
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
import { RecentActivity } from "@/app/portfolio/recent-activity"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildLendSnapshotFromTabData } from "@/app/portfolio/lend-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { useRefetchOnTransaction } from "@/app/dashboard/use-refetch-on-transaction"
import { usePortfolioBorrowLive } from "@/app/portfolio/use-portfolio-borrow-live"
import { usePortfolioLendLive } from "@/app/portfolio/use-portfolio-lend-live"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"
import { LendLearnSection } from "./components/lend-learn-section"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { Eye, EyeOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { RouteErrorFallback } from "@/app/components/route-error-fallback"

export function mergeLendTabData(
  staticData: PortfolioLendTabData,
  liveData: PortfolioLendTabData | null,
): PortfolioLendTabData {
  if (!liveData) return staticData

  return {
    investments: liveData.investments,
    positions: liveData.positions,
    // Prefer opportunities derived from the live markets; fall back to the static
    // catalog only if the live read model surfaced none.
    strategyBuckets: liveData.strategyBuckets.length > 0 ? liveData.strategyBuckets : staticData.strategyBuckets,
    history: liveData.history,
    rewardsSummary: liveData.rewardsSummary ?? staticData.rewardsSummary,
  }
}

// DEV-ONLY scaffold: the live test wallet has no multiply loops, so the Looping
// tab renders an empty state and its table/flow can't be exercised. When the dev
// open gate is on (never in a production build — hard-guarded in test-mode.ts),
// seed one fake open loop so we can iterate on the table and action flow. Remove
// once a real multiply position exists on the test wallet.
const DEV_MULTIPLY_FIXTURE: PortfolioMultiplyCollateral = {
  id: "dev-fixture-wsteth-eth",
  marketId: "wstETH-ETH",
  label: "wstETH / ETH Loop",
  collateralToken: "wstETH",
  borrowableToken: "ETH",
  multiplier: 4.2,
  protocol: "Aave v4",
  healthFactor: 1.85,
  collateralUsd: 42_000,
  borrowPowerUsd: 31_500,
  debtUsd: 31_800,
  ltvPct: 75.7,
  liquidationPriceUsd: null,
  netApyPct: 6.42,
  status: "open",
}

function withDevMultiplyFixtures(data: PortfolioMultiplyTabData): PortfolioMultiplyTabData {
  if (!shouldUseOpenGateSession()) return data
  if (data.lpCollaterals.length > 0) return data
  return { ...data, lpCollaterals: [DEV_MULTIPLY_FIXTURE] }
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

/** Shown while the authenticated portfolio is loading from Convex (was a blank screen). */
function DashboardLoadingState() {
  const { t } = useTranslation()
  return (
    <div className="skeleton-enter space-y-8" aria-busy="true" aria-label={t("Loading your portfolio")}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-radius-sm" />
        <Skeleton className="h-10 w-72 rounded-radius-sm" />
      </div>
      <div className="flex gap-6">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton className="h-5 w-20 rounded-xs" key={k} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton className="h-28 rounded-radius-md" key={k} />
        ))}
      </div>
    </div>
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
  const { showDollarAmounts, setShowDollarAmounts } = useDisplayPreferences()
  const { t } = useTranslation()
  const hasMounted = useHasMounted()
  const { walletId, borrow: borrowSession, multiply: multiplySession, lend: lendSession, rewards: rewardsSession } = useAvanaSessions()
  const resolvedWalletProfileId = walletProfileId ?? initialData?.walletProfile.id ?? walletId
  const { data, error: portfolioError, isLoading: portfolioLoading, retry: retryPortfolioPage } = usePortfolioPage(
    { walletProfileId: resolvedWalletProfileId ?? "" },
    initialData,
  )
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
    // Single source of truth: when a live wallet session exists, the hero reads
    // ONLY the session snapshot — the same borrowSession.state that produces the
    // position rows below — so the aggregate hero numbers (Total Borrowed, health
    // factor, LTV) can never diverge from the listed positions. The one-shot
    // Convex snapshot (pageData) is used solely before a session exists (SSR /
    // pre-hydration / disconnected wallet), never blended in per-field.
    const sessionSnapshot =
      hasMounted && walletId && borrowSession.state.accounts[walletId]
        ? selectBorrowSnapshot(borrowSession.state, walletId)
        : null
    if (sessionSnapshot) {
      return sessionSnapshot
    }

    const fallback = (hasMounted ? liveBorrowTab?.creditLines : null) ?? pageData?.borrow.creditLines ?? null
    return {
      approvedUsd: fallback?.approvedUsd ?? 0,
      liquidationThresholdUsd: fallback?.liquidationThresholdUsd ?? 0,
      totalBorrowedUsd: fallback?.totalBorrowedUsd ?? 0,
      totalCollateralUsd: fallback?.totalCollateralUsd ?? 0,
      averageHealthFactor: fallback?.averageHealthFactor ?? null,
      currentLtvPct: fallback?.currentLtvPct ?? 0,
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
      ...buildLendActivityHistory(lendSession.walletId, lendSession.transactionHistory, lendSession.state),
      ...buildRewardsActivityHistory(rewardsSession.walletId, rewardsSession.state.claims, rewardsSession.tasks),
      ...(pageData?.activity.rows ?? []),
    ],
    [borrowSession.transactionHistory, lendSession.state, lendSession.transactionHistory, lendSession.walletId, multiplySession.transactionHistory, pageData?.activity.rows, rewardsSession.state.claims, rewardsSession.tasks, rewardsSession.walletId],
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

  const multiplyTabDataRaw = useMemo(() => {
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

  const multiplyTabData = useMemo(() => withDevMultiplyFixtures(multiplyTabDataRaw), [multiplyTabDataRaw])

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

  const multiplyHero = useMemo(() => {
    const template = pageData?.heroByTab.looping ?? {}
    return buildMultiplyHeroData(template, buildMultiplySnapshotFromTabData(multiplyTabData))
  }, [pageData, multiplyTabData])

  // The user's primary open multiply position, so "Increase loop" grows that
  // position (preselected market + current leverage) instead of a blank form.
  const multiplyPositionTarget = useMemo(() => {
    const primary =
      multiplyTabData.lpCollaterals.find((row) => row.status === "open") ?? multiplyTabData.lpCollaterals[0]
    return primary ? { marketId: primary.marketId, multiplier: primary.multiplier } : null
  }, [multiplyTabData])

  useEffect(() => {
    setActiveTab(readTabFromLocation())
    const onPopState = () => setActiveTab(readTabFromLocation())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [readTabFromLocation])

  // While the authenticated portfolio is still empty, retry transient client fetch
  // failures directly through the hook instead of refreshing the whole route.
  const portfolioRetriesRef = useRef(0)
  useEffect(() => {
    if (pageData) {
      portfolioRetriesRef.current = 0
      return
    }
    if (!portfolioError || portfolioLoading || portfolioRetriesRef.current >= 8) return
    const id = window.setTimeout(() => {
      portfolioRetriesRef.current += 1
      retryPortfolioPage()
    }, 1000)
    return () => window.clearTimeout(id)
  }, [pageData, portfolioError, portfolioLoading, retryPortfolioPage])

  // Refetch the one-shot portfolio snapshot after any on-chain/sandbox action so the
  // snapshot-backed surfaces (fallback rows, Lend/Multiply hero charts) never go stale.
  const totalTransactionCount =
    borrowSession.transactionHistory.length +
    lendSession.transactionHistory.length +
    multiplySession.transactionHistory.length
  useRefetchOnTransaction(totalTransactionCount, retryPortfolioPage)

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`)
    }
    router.replace(`/dashboard?tab=${tab}`, { scroll: false })
  }

  if (!pageData) {
    if (portfolioError && !portfolioLoading && portfolioRetriesRef.current >= 8) {
      return (
        <RouteErrorFallback
          error={new Error(portfolioError)}
          onRetry={() => {
            portfolioRetriesRef.current = 0
            retryPortfolioPage()
          }}
          title={t("We couldn't load your portfolio")}
          message={t("The live portfolio fetch kept failing. Try again to re-run the client fetch without leaving the dashboard.")}
        />
      )
    }
    return <DashboardLoadingState />
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <label className="inline-flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground">
          {showDollarAmounts ? <Eye className="size-4 text-brand-readable" /> : <EyeOff className="size-4 text-brand-readable" />}
          <span>{t("Dollar amounts")}</span>
          <Switch
            checked={showDollarAmounts}
            onCheckedChange={setShowDollarAmounts}
            aria-label={t("Dollar amounts")}
          />
        </label>
      </div>
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pageData={pageData}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
        lendSnapshot={lendSnapshot}
        multiplyHero={multiplyHero}
        multiplyPositionTarget={multiplyPositionTarget}
      />

      {activeTab === "overview" ? (
        <div className="mt-12 space-y-10">
          <DashboardOverviewSection title={t("Credit Overview")} metrics={borrowDashboardMetrics.overview} />
          <DashboardSection title={t("Credit Positions")}>
            <DashboardBorrowTab
              section="all"
              collateralPositions={collateralPositions}
              debtPositions={debtPositions}
              showSummary={false}
              returnHref={dashboardReturnHref}
            />
          </DashboardSection>
          <DashboardPerformanceSection title={t("Credit Performance")} metrics={borrowDashboardMetrics.performance} />
        </div>
      ) : null}
      {activeTab === "lending" ? (
        <div className="mt-12 space-y-10">
          <DashboardSection title={t("Lending Positions")}>
            <PortfolioInvestments
              investments={lendTabData.investments}
              rewardsSummary={lendTabData.rewardsSummary}
              onClaimRewards={handleClaimLendRewards}
              isClaimingRewards={isClaimingLendRewards}
              showHeading={false}
              returnHref={dashboardReturnHref}
            />
          </DashboardSection>
          <DashboardLendPerformanceSection title={t("Lending Performance")} metrics={lendDashboardMetrics} />
          <LendLearnSection />
        </div>
      ) : null}
      {activeTab === "looping" ? (
        multiplyTabData.lpCollaterals.length === 0 ? (
          // Real empty state — no fabricated health/risk metrics computed over $0.
          <div className="mt-12">
            <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
              {t("No multiply positions yet. Open a loop to leverage your collateral.")}
            </div>
          </div>
        ) : (
          <div className="mt-12 space-y-10">
            <DashboardOverviewSection title={t("Looping Overview")} metrics={multiplyDashboardMetrics.overview} />
            <DashboardSection title={t("Looping Positions")}>
              <MultiplyCollateralTable rows={multiplyTabData.lpCollaterals} returnHref={dashboardReturnHref} />
            </DashboardSection>
          </div>
        )
      ) : null}
      {activeTab === "activity" ? <RecentActivity rows={activityRows} /> : null}
    </>
  )
}
