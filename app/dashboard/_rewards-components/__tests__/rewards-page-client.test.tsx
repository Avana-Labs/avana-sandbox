import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { REWARDS_PROMO_TABS } from "@/app/lib/data/rewards/catalog"
import { buildDefaultRewardsCatalog, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import { DashboardPageClient } from "@/app/dashboard/dashboard-page-client"
import { parseFixed } from "@/app/lib/credit-engine"

const push = vi.fn()
let searchTab: string | null = "lend"
const claimReward = vi.fn()
const claimAllRewards = vi.fn()
const completeEducation = vi.fn()
const favoriteMarket = vi.fn()
const recordSimulation = vi.fn()
const recordSandboxTour = vi.fn()
const recordDailyCheckin = vi.fn()
const runReferralSandboxStep = vi.fn()
const createReferralCode = vi.fn()
const recordReferralLinkCopied = vi.fn()
const lendCreateIntent = vi.fn(() => ({ id: "lend-intent" }))
const lendPreviewTransaction = vi.fn(async () => ({ allowed: true }))
const borrowCreateIntent = vi.fn(() => ({ id: "borrow-intent" }))
const borrowPreviewTransaction = vi.fn(async () => ({ allowed: true }))
const multiplyCreateIntent = vi.fn(() => ({ id: "multiply-intent" }))
const multiplyPreviewTransaction = vi.fn(async () => ({ allowed: true }))
// Injectable product transaction history for the combined activity table.
let borrowTxHistory: Array<Record<string, unknown>> = []
let multiplyTxHistory: Array<Record<string, unknown>> = []
const umbrellaTxHistory: Array<Record<string, unknown>> = []
let dateNowSpy: ReturnType<typeof vi.spyOn> | null = null
const now = Date.UTC(2026, 5, 19)
const rewardsState = {
  events: [] as Array<Record<string, unknown>>,
  claims: [] as Array<Record<string, unknown>>,
  referralProfiles: {},
  relationships: [],
  firstLoginAt: now,
  favoriteMarketIds: [],
}
const tasks = buildDefaultRewardsCatalog(now)

function resetRewardsState(events: Array<Record<string, unknown>> = [], claims: Array<Record<string, unknown>> = []) {
  rewardsState.events = events
  rewardsState.claims = claims
  rewardsState.referralProfiles = {}
  rewardsState.relationships = []
  rewardsState.favoriteMarketIds = []
  rewardsState.firstLoginAt = now
}

function rewardEvent(id: string, type: string, product: string, extra: Record<string, unknown> = {}) {
  return { id, wallet: "demo-wallet", product, type, timestamp: now, ...extra }
}

const rewardsSessionContext = {
  walletId: "demo-wallet",
  state: rewardsState,
  hasHydratedStorage: true,
  tasks,
  claimReward,
  claimAllRewards,
  completeEducation,
  favoriteMarket,
  recordSimulation,
  recordSandboxTour,
  recordDailyCheckin,
  runReferralSandboxStep,
  createReferralCode,
  recordReferralLinkCopied,
  // The sidebar embeds the claim action, which reads a live summary on mount.
  readAdapter: {
    mode: "sandbox" as const,
    readRewardSummary: vi.fn(async () => ({ totalClaimableAmount: 50, claimableTaskCount: 1 })),
  },
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? searchTab : null),
  }),
}))

const lendSessionContext = {
  walletId: "demo-wallet",
  state: { markets: {} },
  transactionHistory: [],
  claimRewards: vi.fn(async () => {}),
  readAdapter: {
    readPortfolioLend: vi.fn(async () => ({ investments: [], positions: [], strategyBuckets: [], history: [] })),
  },
}

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useRewardsSessionContext: () => rewardsSessionContext,
  useAvanaIdentity: () => ({ walletId: "demo-wallet" }),
  useLendSessionContext: () => lendSessionContext,
  useBorrowSessionContext: () => borrowSessionContext,
  useMultiplySessionContext: () => multiplySessionContext,
  useUmbrellaSessionContext: () => umbrellaSessionContext,
  useAvanaSessions: () => ({
    walletId: "demo-wallet",
    lend: {
      walletId: "demo-wallet",
      transactionHistory: [],
      state: { markets: {} },
      createIntent: lendCreateIntent,
      previewTransaction: lendPreviewTransaction,
    },
    borrow: {
      collateralPools: [{ id: "uni-v3-bluechip-weth-usdc" }],
      getBorrowableAssetsForMarket: () => [{ id: "uni-v3-bluechip:usdc" }],
      get transactionHistory() {
        return borrowTxHistory
      },
      state: { markets: {} },
      createIntent: borrowCreateIntent,
      previewTransaction: borrowPreviewTransaction,
    },
    multiply: {
      get transactionHistory() {
        return multiplyTxHistory
      },
      createIntent: multiplyCreateIntent,
      previewTransaction: multiplyPreviewTransaction,
    },
    swap: {
      state: { balances: [] },
      transactionHistory: [],
    },
  }),
}))

const EMPTY_CREDIT_LINES = {
  approvedUsd: 0,
  liquidationThresholdUsd: 0,
  averageHealthFactor: null,
  currentLtvPct: 0,
  totalBorrowedUsd: 0,
  totalCollateralUsd: 0,
}
const borrowSessionContext = {
  state: { accounts: {}, markets: {} },
  transactionHistory: [],
  readAdapter: {
    readPortfolioBorrow: vi.fn(async () => ({
      creditLines: EMPTY_CREDIT_LINES,
      collateralPositions: [],
      debtPositions: [],
    })),
  },
}
const multiplySessionContext = {
  state: { accounts: {}, markets: {}, positions: {} },
  transactionHistory: [],
  readAdapter: {
    readPortfolioMultiply: vi.fn(async () => ({
      creditLines: EMPTY_CREDIT_LINES,
      lpCollaterals: [],
      positions: [],
      openOrders: [],
      twapOrders: [],
      history: [],
    })),
  },
}

// The dashboard page reads Umbrella session state to render its section + weave
// staking activity into the combined recent-activity feed. Empty is fine for
// this suite; per-test tweaks assign `umbrellaTxHistory` before rendering.
const umbrellaSessionContext = {
  walletId: "demo-wallet",
  isHydrated: true,
  markets: {},
  marketOrder: [],
  walletBalances: {},
  positions: {},
  get transactionHistory() {
    return umbrellaTxHistory
  },
}

vi.mock("@/app/dashboard/use-dashboard-page", () => ({
  useDashboardPage: () => ({ data: null, error: null, isLoading: false, retry: () => {} }),
}))

// The wallet tab now consults Convex for balances when no explicit prop is passed.
// This isolated test render doesn't mount a ConvexProvider, so stub the hook to
// return undefined — the tab falls through to the DEMO_SWAP_BALANCES default.
vi.mock("@/app/lib/swap-system/use-convex-wallet-balances", () => ({
  useConvexWalletBalances: () => undefined,
  useConvexProductWalletBalances: () => undefined,
}))

vi.mock("@/app/dashboard/use-dashboard-portfolio-feed", () => ({
  useDashboardPortfolioFeed: () => ({
    headlineValue: "$0",
    headlineDelta: "$0 (0.00%)",
    deltaTone: "positive",
    rangeData: {
      "1D": [{ time: 0, value: 0, label: "Now" }],
      "1W": [{ time: 0, value: 0, label: "Now" }],
      "1M": [{ time: 0, value: 0, label: "Now" }],
      "3M": [{ time: 0, value: 0, label: "Now" }],
      "1Y": [{ time: 0, value: 0, label: "Now" }],
      All: [{ time: 0, value: 0, label: "Now" }],
    },
    valueFormat: "usdCompact",
  }),
}))

// The hero's metric toggle reads getPortfolio via Convex. This bare-render test
// doesn't wrap a ConvexProvider, so stub the hook with static per-metric feeds.
vi.mock("@/app/dashboard/use-dashboard-history-feeds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/dashboard/use-dashboard-history-feeds")>()
  const flat = {
    headlineValue: "$0",
    headlineDelta: "$0 (0.00%)",
    deltaTone: "positive" as const,
    rangeData: {
      "1D": [{ time: 0, value: 0, label: "Now" }],
      "1W": [{ time: 0, value: 0, label: "Now" }],
      "1M": [{ time: 0, value: 0, label: "Now" }],
      "3M": [{ time: 0, value: 0, label: "Now" }],
      "1Y": [{ time: 0, value: 0, label: "Now" }],
      All: [{ time: 0, value: 0, label: "Now" }],
    },
    valueFormat: "usdCompact" as const,
  }
  return {
    ...actual,
    useDashboardMetricFeeds: () => ({
      netValue: flat,
      supplied: flat,
      borrowed: flat,
      earned: flat,
      multiplyExposure: flat,
    }),
  }
})

// Inspect the raw rows fed into the combined activity table.
vi.mock("@/app/dashboard/recent-activity", () => ({
  RecentActivity: ({
    rows,
  }: {
    rows: Array<{ id: string; txHash?: string; secondaryLabel?: string; amountUsd?: number }>
  }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>
          <span>{row.txHash}</span>
          <span>{row.secondaryLabel}</span>
          <span>{row.amountUsd}</span>
        </div>
      ))}
    </div>
  ),
}))

function renderRewardsPage() {
  render(
    <DisplayPreferencesProvider>
      <DashboardPageClient
        pageData={{
          walletProfileId: "demo-wallet",
          totalPools: 35,
          completedPools: 2,
          progressPercentage: 6,
          balanceTotal: 95,
          rewardPools: [],
          promoTabs: REWARDS_PROMO_TABS,
          questsByTab: {
            "getting-started": [],
            lend: [],
            borrow: [],
            multiply: [],
            referrals: [],
          },
        }}
      />
    </DisplayPreferencesProvider>,
  )
}

function openPromoTab(label: string) {
  const tab = screen.getAllByRole("tab", { name: label }).find((button) => button.hasAttribute("data-state"))
  if (!tab) {
    throw new Error(`Promo tab not found: ${label}`)
  }
  fireEvent.click(tab)
}

async function clickQuestAction(name: string | RegExp) {
  await waitFor(() => {
    expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0)
  })
  const buttons = screen.getAllByRole("button", { name })
  const target = buttons.find((button) => !(button as HTMLButtonElement).disabled) ?? buttons[buttons.length - 1]!
  expect(target).not.toBeDisabled()
  fireEvent.click(target)
}

async function openProductTab(label: string) {
  await waitFor(() => {
    expect(screen.getAllByRole("tab", { name: label }).some((tab) => tab.hasAttribute("data-state"))).toBe(true)
  })
  openPromoTab(label)
}

async function openReferralTab() {
  await openProductTab("Rewards")
}

describe("DashboardPageClient", () => {
  afterEach(() => {
    cleanup()
    dateNowSpy?.mockRestore()
    dateNowSpy = null
  })

  beforeEach(() => {
    searchTab = "rewards"
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    push.mockReset()
    claimReward.mockReset()
    claimAllRewards.mockReset()
    completeEducation.mockReset()
    favoriteMarket.mockReset()
    recordSimulation.mockReset()
    recordSandboxTour.mockReset()
    recordDailyCheckin.mockReset()
    runReferralSandboxStep.mockReset()
    createReferralCode.mockReset()
    recordReferralLinkCopied.mockReset()
    lendCreateIntent.mockClear()
    lendPreviewTransaction.mockClear()
    borrowCreateIntent.mockClear()
    borrowPreviewTransaction.mockClear()
    multiplyCreateIntent.mockClear()
    multiplyPreviewTransaction.mockClear()
    borrowTxHistory = []
    multiplyTxHistory = []

    resetRewardsState([rewardEvent("borrow-first", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a" })])
    createReferralCode.mockResolvedValue({
      wallet: "demo-wallet",
      referralCode: "AVA-DEMO",
      referralLink: "https://avana.cc/rewards?ref=AVA-DEMO",
      activeReferralCount: 0,
      fundedReferralCount: 0,
      referralVolumeUsd: 0,
      createdAt: now,
    })
  })

  it("renders live rewards summary and claims session-backed tasks", async () => {
    renderRewardsPage()

    // Mobile keeps a single claim entry point into the full flow.
    const mobileClaim = screen.getByRole("link", { name: "Claim rewards" })
    expect(mobileClaim).toHaveAttribute("href", "/actions/rewards/claim")
    expect(claimAllRewards).not.toHaveBeenCalled()

    await openProductTab("Rewards")
    const questClaimButton = screen
      .getAllByRole("button", { name: "Claim 50 AVA" })
      .find((button) => button.getAttribute("data-testid") !== "action-footer-primary")
    expect(questClaimButton).toBeDefined()
    await userEvent.click(questClaimButton!)
    expect(claimReward).toHaveBeenCalledWith("first-borrow")
  }, 20_000)

  it("renders wallet inside the same dashboard tab strip", async () => {
    searchTab = "wallet"
    renderRewardsPage()

    expect(screen.getByRole("tab", { name: "Wallet" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Lend" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Borrow" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Multiply" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Rewards" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "All Transactions" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Rewards" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Your Dashboard" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Wallet Balance" })).toBeInTheDocument()
  })

  it("opens the education flow for primer quests", async () => {
    renderRewardsPage()

    await clickQuestAction("Read primer")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "I read it" }).length).toBeGreaterThan(0))
    await clickQuestAction("I read it")
    expect(completeEducation).toHaveBeenCalledTimes(1)
  })

  it("opens the favorite flow and records the selected market", async () => {
    renderRewardsPage()

    await clickQuestAction("Pin market")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "GHO Lend market" }).length).toBeGreaterThan(0))
    await clickQuestAction("GHO Lend market")

    expect(favoriteMarket).toHaveBeenCalledWith("gho")
  })

  it("opens the simulate flow and records a lend preview", async () => {
    renderRewardsPage()

    await clickQuestAction("Preview")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Preview Lend" }).length).toBeGreaterThan(0))
    await clickQuestAction("Preview Lend")

    expect(lendCreateIntent).toHaveBeenCalledTimes(1)
    expect(lendPreviewTransaction).toHaveBeenCalledTimes(1)
    expect(recordSimulation).toHaveBeenCalledWith("lend")
  })

  it("routes deep-link tasks into the correct product surfaces", async () => {
    renderRewardsPage()

    await openProductTab("Rewards")
    // "Repay on Borrow" is the first-repay deep-link quest (available in the seeded
    // state, which only records a borrow-open) and routes to /borrow.
    await clickQuestAction("Repay on Borrow")
    await waitFor(() => expect(push).toHaveBeenCalledWith("/borrow"))
  })

  it("records sandbox tours and routes users to the tour surface", async () => {
    renderRewardsPage()

    await openProductTab("Rewards")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start tour" }).length).toBeGreaterThan(0))
    await clickQuestAction("Start tour")

    await waitFor(() => expect(recordSandboxTour).toHaveBeenCalledWith("use-curve-position"))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/borrow"))
  })

  it("runs the referral copy-link flow through the dialog and tracked action", async () => {
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Copy link")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Copy invite link" }).length).toBeGreaterThan(0))
    await clickQuestAction("Copy invite link")
    expect(createReferralCode).toHaveBeenCalled()
    expect(recordReferralLinkCopied).toHaveBeenCalledTimes(1)
  })

  it("runs the referral invite action through its dialog flow", async () => {
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Send invite")
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Send sandbox invite" }).length).toBeGreaterThan(0),
    )
    await clickQuestAction("Send sandbox invite")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("invite")
  })

  it("runs the referral activate action through its dialog flow", async () => {
    resetRewardsState([rewardEvent("ref-active-1", "referral_activated", "referral", { referredWallet: "friend-1" })])
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Activate")
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Activate next friend" }).length).toBeGreaterThan(0),
    )
    await clickQuestAction("Activate next friend")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("activate")
  })

  it("opens claimable referral quests in the dialog and claims from there", async () => {
    resetRewardsState([
      rewardEvent("ref-active-1", "referral_activated", "referral", { referredWallet: "friend-1" }),
      rewardEvent("ref-active-2", "referral_activated", "referral", { referredWallet: "friend-2", timestamp: now + 1 }),
      rewardEvent("ref-active-3", "referral_activated", "referral", { referredWallet: "friend-3", timestamp: now + 2 }),
    ])
    const progress = evaluateAllTasksForUser({
      tasks,
      wallet: "demo-wallet",
      events: rewardsState.events as never[],
      claims: [],
      now,
      firstLoginAt: now,
    })
    expect(progress.find((entry) => entry.taskId === "bring-3-active-users")?.status).toBe("claimable")
    renderRewardsPage()

    await openReferralTab()
    await waitFor(() => {
      expect(screen.getByText("Activate 3 sandbox friends")).toBeInTheDocument()
    })
    await clickQuestAction("View crew & claim")
    await waitFor(() => {
      screen.getByRole("button", { name: "Claim 140 AVA" })
    })
    await clickQuestAction("Claim 140 AVA")

    expect(claimReward).toHaveBeenCalledWith("bring-3-active-users")
  })

  it("feeds product transactions into the combined activity table", async () => {
    searchTab = "transactions"
    borrowTxHistory = [
      {
        id: "history-1",
        intentId: "intent-1",
        walletId: "demo-wallet",
        marketId: "uni-v3-bluechip-weth-usdc",
        assetId: "uni-v3-bluechip:usdc",
        kind: "borrow",
        status: "success",
        requestedAmountUsd6: parseFixed("250", 6),
        executedAmountUsd6: parseFixed("250", 6),
        simulated: true,
        timestamp: now,
        hash: "sim_abc123",
      },
    ]
    multiplyTxHistory = [
      {
        id: "multiply-1",
        intentId: "intent-multiply-1",
        walletId: "demo-wallet",
        marketId: "eth-usdc",
        kind: "multiply",
        status: "success",
        amountUsd: 1250,
        multiplierBefore: 1,
        multiplierAfter: 2.5,
        simulated: true,
        timestamp: now,
        hash: "0xmultiply",
      },
    ]

    renderRewardsPage()

    // Combined activity lives on the All Transactions tab (borrow + multiply + lend + reward-claim).
    await waitFor(() => expect(screen.getByText("sim_abc123")).toBeInTheDocument())
    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
    expect(screen.getByText("0xmultiply")).toBeInTheDocument()
    expect(screen.getByText("1250")).toBeInTheDocument()
  })
})
