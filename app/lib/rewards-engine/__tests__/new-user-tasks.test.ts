import { describe, expect, it } from "vitest"
import {
  applyActivityEvent,
  buildDefaultRewardsCatalog,
  evaluateTaskProgress,
  type RewardsEngineState,
} from "@/app/lib/rewards-engine"
import { buildProfileBootstrapEvents, buildSandboxCompletionEvents, listTasksByCategory } from "@/app/lib/rewards-engine/task-completion"

function applyEvents(state: RewardsEngineState, events: ReturnType<typeof buildSandboxCompletionEvents>) {
  return events.reduce((nextState, entry) => applyActivityEvent(nextState, entry), state)
}

describe("new user reward tasks", () => {
  const now = Date.UTC(2026, 5, 19)
  const wallet = "wallet-new-user"
  const tasks = listTasksByCategory("new_user", now)

  it("defines a completion path for every new-user task", () => {
    expect(tasks).toHaveLength(12)
    for (const task of tasks) {
      const events = buildSandboxCompletionEvents(task.id, wallet, now)
      expect(events.length, `${task.id} should emit at least one completion event`).toBeGreaterThan(0)
    }
  })

  for (const task of listTasksByCategory("new_user", Date.UTC(2026, 5, 19))) {
    it(`makes ${task.id} claimable through sandbox completion events`, () => {
      const bootstrap = buildProfileBootstrapEvents({ wallet, now })
      const completion = buildSandboxCompletionEvents(task.id, wallet, now)
      const state = applyEvents({ events: [], claims: [] }, [...bootstrap, ...completion])

      const progress = evaluateTaskProgress({
        task,
        wallet,
        events: state.events,
        claims: state.claims,
        now: now + 30 * 24 * 60 * 60 * 1000,
      })

      expect(progress.status).toBe("claimable")
      expect(progress.claimableAmount).toBe(task.rewardAmount)
    })
  }

  it("keeps connect-wallet and create-profile claimable after wallet bootstrap", () => {
    const catalog = buildDefaultRewardsCatalog(now)
    const bootstrap = buildProfileBootstrapEvents({ wallet, now })
    const state = applyEvents({ events: [], claims: [] }, bootstrap)

    for (const taskId of ["connect-wallet", "create-profile"] as const) {
      const task = catalog.find((entry) => entry.id === taskId)
      if (!task) throw new Error(`missing ${taskId}`)

      const progress = evaluateTaskProgress({
        task,
        wallet,
        events: state.events,
        claims: state.claims,
        now,
      })

      expect(progress.status).toBe("claimable")
    }
  })
})
