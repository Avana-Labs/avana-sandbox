import { describe, expect, it } from "vitest"
import { buildDefaultRewardsCatalog, evaluateTaskProgress } from "@/app/lib/rewards-engine"
import { SandboxRewardsActionAdapter, buildDefaultRewardsSessionState } from "@/app/lib/rewards-system"

const DAY_MS = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 5, 19)
const wallet = "wallet-challenge"

describe("challenge reward tasks", () => {
  it("completes tour and check-in sandbox quests", async () => {
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
    await adapter.recordSandboxTour(wallet, "use-curve-position")
    await adapter.recordDailyCheckin(wallet)

    const progress = await adapter.refreshTaskProgress(wallet)
    expect(progress.find((item) => item.taskId === "use-curve-position")?.status).toBe("claimable")
    expect(progress.find((item) => item.taskId === "4-week-activity-streak")?.status).toBe("in_progress")
  })

  it("unlocks patience timers with honest wait requirements", () => {
    const task = buildDefaultRewardsCatalog(now).find((entry) => entry.id === "maintain-hf-above-2")
    if (!task) throw new Error("missing maintain-hf-above-2")

    const progress = evaluateTaskProgress({
      task,
      wallet,
      events: [],
      claims: [],
      now: now + 6 * 60_000,
      firstLoginAt: now,
    })

    expect(progress.status).toBe("claimable")
  })

  it("defines fifteen challenge quests", () => {
    expect(buildDefaultRewardsCatalog(now).filter((task) => task.category === "challenge")).toHaveLength(15)
  })
})
