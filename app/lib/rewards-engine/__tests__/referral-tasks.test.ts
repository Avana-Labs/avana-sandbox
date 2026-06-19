import { describe, expect, it } from "vitest"
import {
  applyActivityEvent,
  evaluateTaskProgress,
  type RewardsEngineState,
} from "@/app/lib/rewards-engine"
import { buildProfileBootstrapEvents, buildSandboxCompletionEvents, listTasksByCategory } from "@/app/lib/rewards-engine/task-completion"

const DAY_MS = 24 * 60 * 60 * 1000

function applyEvents(state: RewardsEngineState, events: ReturnType<typeof buildSandboxCompletionEvents>) {
  return events.reduce((nextState, entry) => applyActivityEvent(nextState, entry), state)
}

describe("referral reward tasks", () => {
  const now = Date.UTC(2026, 5, 19)
  const wallet = "wallet-referral"

  it("defines a completion path for every referral task", () => {
    const tasks = listTasksByCategory("referral", now)
    expect(tasks).toHaveLength(8)

    for (const task of tasks) {
      const events = buildSandboxCompletionEvents(task.id, wallet, now)
      expect(events.length, `${task.id} should emit at least one completion event`).toBeGreaterThan(0)
    }
  })

  for (const task of listTasksByCategory("referral", Date.UTC(2026, 5, 19))) {
    it(`makes ${task.id} claimable through sandbox completion events`, () => {
      const bootstrap = buildProfileBootstrapEvents({ wallet, now })
      const completion = buildSandboxCompletionEvents(task.id, wallet, now)
      const state = applyEvents({ events: [], claims: [] }, [...bootstrap, ...completion])
      const evaluationNow = task.expiresAt ? task.expiresAt - DAY_MS : now + 30 * DAY_MS

      const progress = evaluateTaskProgress({
        task,
        wallet,
        events: state.events,
        claims: state.claims,
        now: evaluationNow,
      })

      expect(progress.status).toBe("claimable")
      expect(progress.claimableAmount).toBe(task.rewardAmount)
    })
  }
})
