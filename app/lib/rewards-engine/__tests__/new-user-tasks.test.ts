import { describe, expect, it } from "vitest"
import { buildDefaultRewardsCatalog, evaluateTaskProgress } from "@/app/lib/rewards-engine"
import { SandboxRewardsActionAdapter, buildDefaultRewardsSessionState } from "@/app/lib/rewards-system"

const now = Date.UTC(2026, 5, 19)
const wallet = "wallet-new-user"

describe("new user reward tasks", () => {
  it("completes onboarding quests through real sandbox actions", async () => {
    let state = buildDefaultRewardsSessionState()
    state.firstLoginAt = now
    const adapter = new SandboxRewardsActionAdapter({
      readState: () => state,
      writeState: (next) => {
        state = typeof next === "function" ? next(state) : next
      },
      now: () => now,
    })

    await adapter.initializeRewardsForWallet(wallet)
    await adapter.completeEducation(wallet)
    await adapter.favoriteMarket(wallet, "gho")
    await adapter.recordSimulation(wallet, "lend")

    const progress = await adapter.refreshTaskProgress(wallet)
    expect(progress.find((item) => item.taskId === "connect-wallet")?.status).toBe("claimable")
    expect(progress.find((item) => item.taskId === "create-profile")?.status).toBe("claimable")
    expect(progress.find((item) => item.taskId === "review-risk-basics")?.status).toBe("claimable")
    expect(progress.find((item) => item.taskId === "favorite-market")?.status).toBe("claimable")
    expect(progress.find((item) => item.taskId === "run-first-simulation")?.status).toBe("claimable")
  })

  it("unlocks the sandbox cool-down timer", () => {
    const task = buildDefaultRewardsCatalog(now).find((entry) => entry.id === "maintain-safe-account")
    if (!task) throw new Error("missing maintain-safe-account")

    const progress = evaluateTaskProgress({
      task,
      wallet,
      events: [],
      claims: [],
      now: now + 3 * 60_000,
      firstLoginAt: now,
    })

    expect(progress.status).toBe("claimable")
  })
})
