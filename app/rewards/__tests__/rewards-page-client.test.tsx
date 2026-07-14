import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { REWARDS_PROMO_TABS } from "@/app/lib/data/rewards/catalog"
import { buildDefaultRewardsCatalog, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import { RewardsPageClient } from "@/app/rewards/rewards-page-client"

const push = vi.fn()
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
const now = Date.UTC(2026, 5, 19)
const rewardsState = { events: [] as Array<Record<string, unknown>>, claims: [] as Array<Record<string, unknown>>, referralProfiles: {}, relationships: [], firstLoginAt: now, favoriteMarketIds: [] }
const tasks = buildDefaultRewardsCatalog(now)

function resetRewardsState(
  events: Array<Record<string, unknown>> = [],
  claims: Array<Record<string, unknown>> = [],
) {
  rewardsState.events = events
  rewardsState.claims = claims
  rewardsState.referralProfiles = {}
  rewardsState.relationships = []
  rewardsState.favoriteMarketIds = []
  rewardsState.firstLoginAt = now
}

function rewardEvent(
  id: string,
  type: string,
  product: string,
  extra: Record<string, unknown> = {},
) {
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
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useRewardsSessionContext: () => rewardsSessionContext,
  useAvanaSessions: () => ({
    walletId: "demo-wallet",
    lend: {
      createIntent: lendCreateIntent,
      previewTransaction: lendPreviewTransaction,
    },
    borrow: {
      collateralPools: [{ id: "uni-v3-bluechip-weth-usdc" }],
      getBorrowableAssetsForMarket: () => [{ id: "uni-v3-bluechip:usdc" }],
      createIntent: borrowCreateIntent,
      previewTransaction: borrowPreviewTransaction,
    },
    multiply: {
      createIntent: multiplyCreateIntent,
      previewTransaction: multiplyPreviewTransaction,
    },
  }),
}))

function renderRewardsPage() {
  render(
    <DisplayPreferencesProvider>
      <RewardsPageClient
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
  fireEvent.click(target)
}

async function openProductTab(label: string) {
  await waitFor(() => {
    expect(screen.getAllByRole("tab", { name: label }).some((tab) => tab.hasAttribute("data-state"))).toBe(true)
  })
  openPromoTab(label)
}

async function openReferralTab() {
  await openProductTab("Referrals")
}

describe("RewardsPageClient", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
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

    resetRewardsState([
      rewardEvent("borrow-first", "borrow_opened", "borrow", { amountUsd: 100, marketId: "pool-a" }),
    ])
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

    await openProductTab("Borrow")
    const questClaimButton = screen
      .getAllByRole("button", { name: "Claim 50 AVA" })
      .find((button) => button.getAttribute("data-testid") !== "action-footer-primary")
    expect(questClaimButton).toBeDefined()
    await userEvent.click(questClaimButton!)
    expect(claimReward).toHaveBeenCalledWith("first-borrow")
  }, 10_000)

  it("opens the education flow for primer quests", async () => {
    renderRewardsPage()

    await clickQuestAction("Read primer")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "I read it" }).length).toBeGreaterThan(0))
    await clickQuestAction("I read it")
    expect(completeEducation).toHaveBeenCalledTimes(1)
  })

  it("opens the favorite flow and records the selected market", async () => {
    renderRewardsPage()

    await clickQuestAction("Pick market")
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

    await openProductTab("Lend")
    await clickQuestAction("Go to Lend")
    expect(push).toHaveBeenCalledWith("/lend")
  })

  it("records daily check-ins from challenge tasks", async () => {
    renderRewardsPage()

    await openProductTab("Multiply")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Check in" }).length).toBeGreaterThan(0))
    await clickQuestAction("Check in")

    expect(recordDailyCheckin).toHaveBeenCalledTimes(1)
  })

  it("records sandbox tours and routes users to the tour surface", async () => {
    renderRewardsPage()

    await openProductTab("Borrow")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start tour" }).length).toBeGreaterThan(0))
    await clickQuestAction("Start tour")

    expect(recordSandboxTour).toHaveBeenCalledWith("use-curve-position")
    expect(push).toHaveBeenCalledWith("/borrow")
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
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Send sandbox invite" }).length).toBeGreaterThan(0))
    await clickQuestAction("Send sandbox invite")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("invite")
  })

  it("runs the referral activate action through its dialog flow", async () => {
    resetRewardsState([
      rewardEvent("ref-active-1", "referral_activated", "referral", { referredWallet: "friend-1" }),
    ])
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Activate")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Activate next friend" }).length).toBeGreaterThan(0))
    await clickQuestAction("Activate next friend")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("activate")
  })

  it("runs the referral fund action through its dialog flow", async () => {
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Mark funded")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Mark next friend funded" }).length).toBeGreaterThan(0))
    await clickQuestAction("Mark next friend funded")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("fund")
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
})
