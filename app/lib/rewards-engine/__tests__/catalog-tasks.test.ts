import { describe, expect, it } from "vitest"
import {
  applyActivityEvent,
  buildDefaultRewardsCatalog,
  evaluateTaskProgress,
  type RewardsEngineState,
} from "@/app/lib/rewards-engine"
import { buildProfileBootstrapEvents, buildSandboxCompletionEvents } from "@/app/lib/rewards-engine/task-completion"

const DAY_MS = 24 * 60 * 60 * 1000

function applyEvents(state: RewardsEngineState, events: ReturnType<typeof buildSandboxCompletionEvents>) {
  return events.reduce((nextState, entry) => applyActivityEvent(nextState, entry), state)
}

describe("full rewards catalog", () => {
  const now = Date.UTC(2026, 5, 19)
  const wallet = "wallet-catalog"
  const tasks = buildDefaultRewardsCatalog(now)

  it("covers every catalog task with a sandbox completion path", () => {
    expect(tasks).toHaveLength(35)

    for (const task of tasks) {
      const events = buildSandboxCompletionEvents(task.id, wallet, now)
      expect(events.length, `${task.id} is missing a completion path`).toBeGreaterThan(0)
    }
  })

  for (const task of buildDefaultRewardsCatalog(Date.UTC(2026, 5, 19))) {
    it(`makes ${task.id} claimable`, () => {
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
    })
  }
})
