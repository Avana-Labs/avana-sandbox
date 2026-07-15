"use client"

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardHrefForTab, parseDashboardTab } from "@/app/lib/action-system/dashboard-routing"
import { focusDashboardProduct } from "@/app/dashboard/dashboard-product-focus"
import {
  useAvanaIdentity,
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { selectBorrowSnapshot } from "@/app/lib/borrow-system/dashboard-selectors"
import { buildPortfolioBorrowData, mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import type {
  PortfolioLendTabData,
  PortfolioMultiplyCollateral,
  PortfolioMultiplyTabData,
  PortfolioPageData,
} from "@/app/lib/data/providers/portfolio"
import { shouldUseOpenGateSession } from "@/app/lib/test-mode"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
import {
  buildBorrowDashboardMetrics,
  buildBorrowDashboardMetricsFromSnapshot,
  buildLendDashboardMetrics,
  buildMultiplyDashboardMetrics,
  type DashboardTabMetrics,
} from "@/app/portfolio/dashboard-tab-metrics"
import {
  DashboardCreditOverviewSection,
  DashboardLendPerformanceSection,
  DashboardOverviewSection,
} from "@/app/portfolio/dashboard-metric-section"
import { buildMultiplyHeroData, buildMultiplySnapshotFromTabData } from "@/app/portfolio/multiply-hero-state"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { buildLendSnapshotFromTabData } from "@/app/portfolio/lend-hero-state"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { useRefetchOnTransaction } from "@/app/dashboard/use-refetch-on-transaction"
import { usePortfolioBorrowLive } from "@/app/portfolio/use-portfolio-borrow-live"
import { usePortfolioLendLive } from "@/app/portfolio/use-portfolio-lend-live"
import { usePortfolioMultiplyLive } from "@/app/portfolio/use-portfolio-multiply-live"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"
import { SuppliesHealthFactorCard } from "@/app/dashboard/components/borrow-tab/supplies-table"
import { CurrentLtvCard } from "@/app/dashboard/components/borrow-tab/debts-table"
import { LendOpportunityCarousel } from "./components/lend-opportunity-carousel"
import { cn } from "@/lib/utils"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { RouteErrorFallback } from "@/app/components/route-error-fallback"

const CollateralPositionsPanel = lazy(
  async () => ({ default: (await import("@/app/dashboard/components/borrow-tab/collateral-positions-panel")).CollateralPositionsPanel }),
)
const DebtPositionsPanel = lazy(
  async () => ({ default: (await import("@/app/dashboard/components/borrow-tab/debt-positions-panel")).DebtPositionsPanel }),
)
const TradingFeesPanel = lazy(
  async () => ({ default: (await import("@/app/dashboard/components/borrow-tab/trading-fees-panel")).TradingFeesPanel }),
)
const MultiplyCollateralTable = lazy(
  async () => ({ default: (await import("@/app/portfolio/multiply-collateral-table")).MultiplyCollateralTable }),
)
const LendLearnSection = lazy(
  async () => ({ default: (await import("./components/lend-learn-section")).LendLearnSection }),
)
const RecentActivity = lazy(
  async () => ({ default: (await import("@/app/portfolio/recent-activity")).RecentActivity }),
)

function DashboardModulePlaceholder() {
  return <Skeleton className="h-64 w-full rounded-radius-md" />
}

function DashboardModuleBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<DashboardModulePlaceholder />}>{children}</Suspense>
}

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

type CreditSubTab = "overview" | "collateral" | "debt" | "fees"
const CREDIT_SUB_TABS: readonly { id: CreditSubTab; label: string }[] = [
  { id: "overview", label: "Borrow Overview" },
  { id: "collateral", label: "Collateral Positions" },
  { id: "debt", label: "Debt Positions" },
  { id: "fees", label: "Trading Fees" },
]

type LoopingSubTab = "overview" | "positions"
const LOOPING_SUB_TABS: readonly { id: LoopingSubTab; label: string }[] = [
  { id: "overview", label: "Multiply Overview" },
  { id: "positions", label: "Multiply Positions" },
]

/**
 * Underline tab strip for a main tab's sections. Same visual treatment as the primary
 * Lend/Borrow/Multiply tabs (active underline + bottom border) but kept at the
 * section-heading text size.
 */
function SectionTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={ariaLabel} className="flex w-max min-w-max gap-8">
        {items.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 pb-2 text-left text-[15px] font-normal tracking-[-0.03em] transition-colors md:text-[17px]",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>
    </div>
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

function DeferredDashboardContent({ children, eager = false }: { children: ReactNode; eager?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [shouldMount, setShouldMount] = useState(() => process.env.NODE_ENV === "test" || eager)

  useEffect(() => {
    if (eager) setShouldMount(true)
  }, [eager])

  useEffect(() => {
    if (shouldMount) return
    const container = containerRef.current
    if (!container || typeof IntersectionObserver === "undefined") {
      setShouldMount(true)
      return
    }

    const mount = () => setShouldMount(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        mount()
        observer.disconnect()
      },
      { rootMargin: "100px 0px", threshold: 0 },
    )
    observer.observe(container)
    document.addEventListener("keydown", mount, { once: true })

    return () => {
      observer.disconnect()
      document.removeEventListener("keydown", mount)
    }
  }, [shouldMount])

  return (
    <div ref={containerRef} className={shouldMount ? "space-y-12" : "min-h-[960px]"}>
      {shouldMount ? children : null}
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
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const hasMounted = useHasMounted()
  const { walletId } = useAvanaIdentity()
  const borrowSession = useBorrowSessionContext()
  const multiplySession = useMultiplySessionContext()
  const lendSession = useLendSessionContext()
  const resolvedWalletProfileId = walletProfileId ?? initialData?.walletProfile.id ?? walletId
  const {
    data,
    error: portfolioError,
    isLoading: portfolioLoading,
    retry: retryPortfolioPage,
  } = usePortfolioPage({ walletProfileId: resolvedWalletProfileId ?? "" }, initialData)
  const pageData = data ?? initialData
  const requestedTab = parseDashboardTab(searchParams.get("tab")) ?? "lending"
  // The Activity tab was merged into the Lend tab; treat any lingering ?tab=activity as Lend.
  const normalizedRequestedTab: DashboardTab = requestedTab === "activity" ? "lending" : requestedTab
  const [activeTab, setActiveTab] = useState<DashboardTab>(normalizedRequestedTab)
  const [creditSubTab, setCreditSubTab] = useState<CreditSubTab>("overview")
  const [loopingSubTab, setLoopingSubTab] = useState<LoopingSubTab>("overview")
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

  const collateralPositions = liveBorrowTab?.collateralPositions ?? pageData?.borrow.collateralPositions ?? []
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
      // Reward claims live on the rewards page (Reward Distribution History), not here.
      ...(pageData?.activity.rows ?? []),
    ],
    [
      borrowSession.transactionHistory,
      lendSession.state,
      lendSession.transactionHistory,
      lendSession.walletId,
      multiplySession.transactionHistory,
      pageData?.activity.rows,
    ],
  )

  const lendTabData = useMemo(() => {
    if (!pageData)
      return hasMounted
        ? (portfolioLend ?? {
            investments: [],
            positions: [],
            strategyBuckets: [],
            history: [],
          })
        : { investments: [], positions: [], strategyBuckets: [], history: [] }
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
    setActiveTab(normalizedRequestedTab)
  }, [normalizedRequestedTab])

  useEffect(() => {
    if (!pageData || activeTab === "activity") return
    if (focusDashboardProduct(activeTab)) return
    let attempts = 0
    const timer = setInterval(() => {
      attempts += 1
      if (focusDashboardProduct(activeTab) || attempts >= 100) clearInterval(timer)
    }, 100)
    return () => clearInterval(timer)
  }, [activeTab, pageData])

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
          message={t(
            "The live portfolio fetch kept failing. Try again to re-run the client fetch without leaving the dashboard.",
          )}
        />
      )
    }
    return <DashboardLoadingState />
  }

  return (
    <>
      <DashboardTabs
        activeTab={activeTab}
        pageData={pageData}
        borrowSnapshot={borrowSnapshot}
        multiplySnapshot={multiplySnapshot}
        lendSnapshot={lendSnapshot}
        multiplyHero={multiplyHero}
        multiplyPositionTarget={multiplyPositionTarget}
      />

      {activeTab !== "activity" ? (
        <div className="mt-12 space-y-12">
          {/* Lending Positions + Lend Opportunity sidebar (mirrors the hero grid) */}
          <section
            id="dashboard-lend-account"
            tabIndex={-1}
            className="scroll-mt-24 grid gap-6 outline-none lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-x-8"
          >
            <div className="min-w-0 space-y-5">
              <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
                {t("Lend Account")}
              </h2>
              <DashboardLendPerformanceSection
                title={t("Lending Performance")}
                metrics={lendDashboardMetrics}
                hideHeading
              />
              <PortfolioInvestments
                investments={lendTabData.investments}
                rewardsSummary={lendTabData.rewardsSummary}
                onClaimRewards={handleClaimLendRewards}
                isClaimingRewards={isClaimingLendRewards}
                showHeading={false}
                returnHref={dashboardReturnHref}
              />
            </div>
            <LendOpportunityCarousel />
          </section>

          <DeferredDashboardContent eager={activeTab === "overview" || activeTab === "looping"}>
            {/* Borrow sections (moved from the former Borrow tab) */}
            <div id="dashboard-borrow-account" tabIndex={-1} className="scroll-mt-24 outline-none">
              <div className="flex flex-col gap-3 border-b border-border/50 pb-px md:flex-row md:items-end md:justify-between md:border-b-0 md:pb-0">
                <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
                  {t("Borrow Account")}
                </h2>
                <SectionTabStrip
                  items={CREDIT_SUB_TABS}
                  value={creditSubTab}
                  onChange={setCreditSubTab}
                  ariaLabel={t("Credit sections")}
                />
              </div>
              <div className="mt-8">
                {creditSubTab === "overview" ? (
                  <div className="space-y-8">
                    <DashboardCreditOverviewSection
                      hideHeading
                      title={t("Borrow Overview")}
                      approvedCreditUsd={borrowSnapshot.approvedUsd}
                      totalBorrowedUsd={borrowDashboardMetrics.overview.totalBorrowedUsd}
                      netApyPct={borrowDashboardMetrics.performance.netApyPct}
                      totalCollateralUsd={borrowDashboardMetrics.performance.poolCollateralUsd}
                    />
                    <div className="grid gap-4 xl:grid-cols-2">
                      <SuppliesHealthFactorCard
                        averageHealthFactor={borrowSnapshot.averageHealthFactor}
                        showBalance={showDollarAmounts}
                      />
                      <CurrentLtvCard
                        borrowedUsd={borrowSnapshot.totalBorrowedUsd}
                        collateralUsd={borrowSnapshot.totalCollateralUsd}
                        showBalance={showDollarAmounts}
                      />
                    </div>
                  </div>
                ) : creditSubTab === "collateral" ? (
                  <DashboardModuleBoundary>
                    <CollateralPositionsPanel showBalance={showDollarAmounts} returnHref={dashboardReturnHref} />
                  </DashboardModuleBoundary>
                ) : creditSubTab === "debt" ? (
                  <DashboardModuleBoundary>
                    <DebtPositionsPanel showBalance={showDollarAmounts} returnHref={dashboardReturnHref} />
                  </DashboardModuleBoundary>
                ) : (
                  <DashboardModuleBoundary>
                    <TradingFeesPanel showBalance={showDollarAmounts} returnHref={dashboardReturnHref} />
                  </DashboardModuleBoundary>
                )}
              </div>
            </div>

            {/* Multiply sections (moved from the former Multiply tab) */}
            <div id="dashboard-multiply-account" tabIndex={-1} className="scroll-mt-24 outline-none">
            {multiplyTabData.lpCollaterals.length === 0 ? (
              // Real empty state — no fabricated health/risk metrics computed over $0.
              <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
                {t("No multiply positions yet. Open a loop to leverage your collateral.")}
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-3 border-b border-border/50 pb-px md:flex-row md:items-end md:justify-between md:border-b-0 md:pb-0">
                  <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
                    {t("Multiply Account")}
                  </h2>
                  <SectionTabStrip
                    items={LOOPING_SUB_TABS}
                    value={loopingSubTab}
                    onChange={setLoopingSubTab}
                    ariaLabel={t("Multiply sections")}
                  />
                </div>
                <div className="mt-8">
                  {loopingSubTab === "overview" ? (
                    <div className="space-y-8">
                      <DashboardOverviewSection
                        hideHeading
                        title={t("Multiply Overview")}
                        metrics={multiplyDashboardMetrics.overview}
                      />
                      <div className="grid gap-4 xl:grid-cols-2">
                        <SuppliesHealthFactorCard
                          averageHealthFactor={multiplySnapshot.averageHealthFactor}
                          showBalance={showDollarAmounts}
                        />
                        <CurrentLtvCard
                          borrowedUsd={multiplySnapshot.totalBorrowedUsd}
                          collateralUsd={multiplySnapshot.totalCollateralUsd}
                          showBalance={showDollarAmounts}
                        />
                      </div>
                    </div>
                  ) : (
                    <DashboardModuleBoundary>
                      <MultiplyCollateralTable rows={multiplyTabData.lpCollaterals} returnHref={dashboardReturnHref} />
                    </DashboardModuleBoundary>
                  )}
                </div>
              </div>
            )}
            </div>

          </DeferredDashboardContent>

          <DeferredDashboardContent>
            <DashboardModuleBoundary>
              <LendLearnSection />
            </DashboardModuleBoundary>
            <DashboardModuleBoundary>
              <RecentActivity rows={activityRows} />
            </DashboardModuleBoundary>
          </DeferredDashboardContent>
        </div>
      ) : null}
    </>
  )
}
