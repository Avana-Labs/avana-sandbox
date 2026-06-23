import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { REWARDS_PROMO_TABS } from "@/app/lib/data/mock/shared/rewards"
import { buildDefaultRewardsCatalog } from "@/app/lib/rewards-engine"
import { RewardsPageClient } from "@/app/rewards/rewards-page-client"

const push = vi.fn()
const claimReward = vi.fn()
const claimAllRewards = vi.fn()
const completeSandboxTask = vi.fn()
const completeEducation = vi.fn()
const favoriteMarket = vi.fn()
const recordSimulation = vi.fn()
const recordSandboxTour = vi.fn()
const recordDailyCheckin = vi.fn()
const runReferralSandboxStep = vi.fn()
const createReferralCode = vi.fn()
const recordReferralLinkCopied = vi.fn()
const readRewardSummary = vi.fn()
const readProgress = vi.fn()
const lendCreateIntent = vi.fn(() => ({ id: "lend-intent" }))
const lendPreviewTransaction = vi.fn(async () => ({ allowed: true }))
const borrowCreateIntent = vi.fn(() => ({ id: "borrow-intent" }))
const borrowPreviewTransaction = vi.fn(async () => ({ allowed: true }))
const multiplyCreateIntent = vi.fn(() => ({ id: "multiply-intent" }))
const multiplyPreviewTransaction = vi.fn(async () => ({ allowed: true }))
const rewardsState = { events: [], claims: [], referralProfiles: {}, relationships: [], firstLoginAt: Date.UTC(2026, 5, 19), favoriteMarketIds: [] }
const tasks = buildDefaultRewardsCatalog(Date.UTC(2026, 5, 19))

const rewardsSessionContext = {
  walletId: "demo-wallet",
  state: rewardsState,
  tasks,
  claimReward,
  claimAllRewards,
  completeSandboxTask,
  completeEducation,
  favoriteMarket,
  recordSimulation,
  recordSandboxTour,
  recordDailyCheckin,
  runReferralSandboxStep,
  createReferralCode,
  recordReferralLinkCopied,
  readAdapter: {
    readRewardSummary,
    readProgress,
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

function buildProgress(
  overrides: Partial<Record<string, { status: "available" | "in_progress" | "claimable" | "claimed"; progress: number; target: number }>> = {},
) {
  return tasks.map((task) => {
    const override = overrides[task.id]
    const status = override?.status ?? (task.id === "first-borrow" ? "claimable" : task.id === "connect-wallet" ? "claimed" : "available")
    const target =
      override?.target ??
      (task.requirement.type === "aggregate_volume"
        ? task.requirement.targetUsd
        : task.requirement.type === "wait_since_login"
          ? 1
          : task.requirement.targetCount)
    const progress = override?.progress ?? (status === "claimable" || status === "claimed" ? target : 0)

    return {
      wallet: "demo-wallet",
      taskId: task.id,
      status,
      progress,
      target,
      claimableAmount: status === "claimable" ? task.rewardAmount : 0,
      claimedAmount: status === "claimed" ? task.rewardAmount : 0,
    }
  })
}

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
            "new-users": [],
            "challenge-tasks": [],
            "refer-a-friend": [],
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

async function openReferralTab() {
  await waitFor(() => {
    expect(screen.getAllByRole("tab", { name: "Refer a friend" }).some((tab) => tab.hasAttribute("data-state"))).toBe(true)
  })
  openPromoTab("Refer a friend")
}

describe("RewardsPageClient", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    push.mockReset()
    claimReward.mockReset()
    claimAllRewards.mockReset()
    completeSandboxTask.mockReset()
    completeEducation.mockReset()
    favoriteMarket.mockReset()
    recordSimulation.mockReset()
    recordSandboxTour.mockReset()
    recordDailyCheckin.mockReset()
    runReferralSandboxStep.mockReset()
    createReferralCode.mockReset()
    recordReferralLinkCopied.mockReset()
    readRewardSummary.mockReset()
    readProgress.mockReset()
    lendCreateIntent.mockClear()
    lendPreviewTransaction.mockClear()
    borrowCreateIntent.mockClear()
    borrowPreviewTransaction.mockClear()
    multiplyCreateIntent.mockClear()
    multiplyPreviewTransaction.mockClear()

    readRewardSummary.mockResolvedValue({
      wallet: "demo-wallet",
      completedTaskCount: 2,
      claimableTaskCount: 1,
      totalTaskCount: tasks.length,
      totalEarnedAmount: 95,
      totalClaimableAmount: 50,
      totalClaimedAmount: 45,
    })
    readProgress.mockResolvedValue(buildProgress())
    createReferralCode.mockResolvedValue({
      wallet: "demo-wallet",
      referralCode: "AVA-DEMO",
      referralLink: "https://avana.cc/rewards?ref=AVA-DEMO",
      activeReferralCount: 0,
      fundedReferralCount: 0,
      referralVolumeUsd: 0,
      createdAt: Date.UTC(2026, 5, 19),
    })
  })

  it("renders live rewards summary and claims session-backed tasks", async () => {
    renderRewardsPage()

    await waitFor(() => {
      screen.getByRole("button", { name: "Claim 50 AVA" })
    })

    await userEvent.click(screen.getByTestId("rewards-claim-all"))
    expect(claimAllRewards).toHaveBeenCalledTimes(1)
    expect(readRewardSummary.mock.calls.length).toBeGreaterThan(1)

    await userEvent.click(screen.getAllByRole("button", { name: "Claim 50 AVA" })[0]!)
    expect(claimReward).toHaveBeenCalledWith("first-borrow")
    expect(readProgress.mock.calls.length).toBeGreaterThan(1)
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
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Preview lend" }).length).toBeGreaterThan(0))
    await clickQuestAction("Preview lend")

    expect(lendCreateIntent).toHaveBeenCalledTimes(1)
    expect(lendPreviewTransaction).toHaveBeenCalledTimes(1)
    expect(recordSimulation).toHaveBeenCalledWith("lend")
  })

  it("routes deep-link tasks into the correct product surfaces", async () => {
    renderRewardsPage()

    await clickQuestAction("Go to Lend")
    expect(push).toHaveBeenCalledWith("/lend")
  })

  it("records daily check-ins from challenge tasks", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "4-week-activity-streak": { status: "available", progress: 0, target: 3 },
      }),
    )
    renderRewardsPage()

    openPromoTab("Challenge tasks")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Check in" }).length).toBeGreaterThan(0))
    await clickQuestAction("Check in")

    expect(recordDailyCheckin).toHaveBeenCalledTimes(1)
  })

  it("records sandbox tours and routes users to the tour surface", async () => {
    renderRewardsPage()

    openPromoTab("Challenge tasks")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start tour" }).length).toBeGreaterThan(0))
    await clickQuestAction("Start tour")

    expect(recordSandboxTour).toHaveBeenCalledWith("use-curve-position")
    expect(push).toHaveBeenCalledWith("/borrow")
  })

  it("runs the referral copy-link flow through the dialog and tracked action", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "share-referral-link": { status: "available", progress: 0, target: 1 },
      }),
    )
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Copy link")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Copy invite link" }).length).toBeGreaterThan(0))
    await clickQuestAction("Copy invite link")
    expect(createReferralCode).toHaveBeenCalled()
    expect(recordReferralLinkCopied).toHaveBeenCalledTimes(1)
  })

  it("runs the referral invite action through its dialog flow", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "invite-first-wallet": { status: "available", progress: 0, target: 1 },
      }),
    )
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Send invite")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Send sandbox invite" }).length).toBeGreaterThan(0))
    await clickQuestAction("Send sandbox invite")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("invite")
  })

  it("runs the referral activate action through its dialog flow", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "bring-3-active-users": { status: "in_progress", progress: 1, target: 3 },
      }),
    )
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Activate")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Activate next friend" }).length).toBeGreaterThan(0))
    await clickQuestAction("Activate next friend")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("activate")
  })

  it("runs the referral fund action through its dialog flow", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "first-funded-referral": { status: "available", progress: 0, target: 1 },
      }),
    )
    renderRewardsPage()

    await openReferralTab()
    await clickQuestAction("Mark funded")
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Mark next friend funded" }).length).toBeGreaterThan(0))
    await clickQuestAction("Mark next friend funded")

    expect(runReferralSandboxStep).toHaveBeenCalledWith("fund")
  })

  it("opens claimable referral quests in the dialog and claims from there", async () => {
    readProgress.mockResolvedValue(
      buildProgress({
        "bring-3-active-users": { status: "claimable", progress: 3, target: 3 },
      }),
    )
    renderRewardsPage()

    await openReferralTab()
    await waitFor(() => {
      screen.getByRole("button", { name: "View crew & claim" })
    })
    await clickQuestAction("View crew & claim")
    await waitFor(() => {
      screen.getByRole("button", { name: "Claim 140 AVA" })
    })
    await clickQuestAction("Claim 140 AVA")

    expect(claimReward).toHaveBeenCalledWith("bring-3-active-users")
  })
})
