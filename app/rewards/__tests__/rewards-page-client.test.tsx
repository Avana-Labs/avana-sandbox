import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { REWARDS_PROMO_TABS } from "@/app/lib/data/mock/shared/rewards"
import { buildDefaultRewardsCatalog } from "@/app/lib/rewards-engine"
import { RewardsPageClient } from "@/app/rewards/rewards-page-client"

const claimReward = vi.fn()
const claimAllRewards = vi.fn()
const completeSandboxTask = vi.fn()
const readRewardSummary = vi.fn()
const readProgress = vi.fn()
const rewardsState = { events: [], claims: [], referralProfiles: {}, relationships: [] }

const rewardsSessionContext = {
  walletId: "demo-wallet",
  state: rewardsState,
  tasks: buildDefaultRewardsCatalog(Date.UTC(2026, 5, 19)),
  claimReward,
  claimAllRewards,
  completeSandboxTask,
  readAdapter: {
    readRewardSummary,
    readProgress,
  },
}

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useRewardsSessionContext: () => rewardsSessionContext,
}))

describe("RewardsPageClient", () => {
  beforeEach(() => {
    claimReward.mockReset()
    claimAllRewards.mockReset()
    completeSandboxTask.mockReset()
    readRewardSummary.mockReset()
    readProgress.mockReset()

    const tasks = buildDefaultRewardsCatalog(Date.UTC(2026, 5, 19))
    readRewardSummary.mockResolvedValue({
      wallet: "demo-wallet",
      completedTaskCount: 2,
      claimableTaskCount: 1,
      totalTaskCount: tasks.length,
      totalEarnedAmount: 95,
      totalClaimableAmount: 50,
      totalClaimedAmount: 45,
    })
    readProgress.mockResolvedValue(
      tasks.map((task) => ({
        wallet: "demo-wallet",
        taskId: task.id,
        status: task.id === "first-borrow" ? "claimable" : task.id === "connect-wallet" ? "claimed" : "available",
        progress: task.id === "first-borrow" || task.id === "connect-wallet" ? 1 : 0,
        target: 1,
        claimableAmount: task.id === "first-borrow" ? task.rewardAmount : 0,
        claimedAmount: task.id === "connect-wallet" ? task.rewardAmount : 0,
      })),
    )
  })

  it("renders live rewards summary and claims session-backed tasks", async () => {
    render(
      <DisplayPreferencesProvider>
        <RewardsPageClient
          pageData={{
            walletProfileId: "demo-wallet",
            totalPools: 0,
            completedPools: 0,
            progressPercentage: 0,
            balanceTotal: 0,
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Claim 1 rewards" })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole("button", { name: "Claim 1 rewards" }))
    expect(claimAllRewards).toHaveBeenCalledTimes(1)
    expect(readRewardSummary.mock.calls.length).toBeGreaterThan(1)

    await userEvent.click(screen.getAllByRole("button", { name: "Claim" })[0]!)
    expect(claimReward).toHaveBeenCalledWith("first-borrow")
    expect(readProgress.mock.calls.length).toBeGreaterThan(1)
  })

  it("completes available tasks through sandbox actions and refreshes progress", async () => {
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

    await waitFor(() => expect(screen.getByRole("button", { name: "Read" })).toBeInTheDocument())

    await userEvent.click(screen.getByRole("button", { name: "Read" }))
    expect(completeSandboxTask).toHaveBeenCalledWith("review-risk-basics")
    expect(readProgress.mock.calls.length).toBeGreaterThan(1)
  })
})
