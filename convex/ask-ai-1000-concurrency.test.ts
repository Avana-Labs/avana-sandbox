// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const describeConcurrency = process.env.RUN_ASK_AI_1000_CONCURRENCY === "1" ? describe : describe.skip

describeConcurrency("Ask AI 1,000-user concurrency", () => {
  test("claims one independent turn per user without a global execution lock", async () => {
    const t = convexTest(schema, modules)
    registerAgent(t)
    registerRateLimiter(t)
    const now = Date.now()
    const turnIds = await t.run(async (ctx) => {
      const ids: Id<"askAITurns">[] = []
      for (let index = 0; index < 1_000; index += 1) {
        const threadId = `thread:load:${index}`
        const ownerSubject = `ask-guest:load:${index}`
        await ctx.db.insert("askAIThreads", {
          threadId,
          ownerSubject,
          title: "Load test",
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        ids.push(
          await ctx.db.insert("askAITurns", {
            threadId,
            ownerSubject,
            clientRequestId: `load:${index}`,
            promptMessageId: `message:load:${index}`,
            prompt: "What is Bitcoin's price?",
            status: "queued",
            createdAt: now,
            updatedAt: now,
          }),
        )
      }
      return ids
    })

    const startedAt = performance.now()
    const claims = await Promise.all(turnIds.map((turnId) => t.mutation(internal.askAI.claimQueuedTurn, { turnId })))
    const durationMs = performance.now() - startedAt
    expect(claims.filter(Boolean)).toHaveLength(1_000)

    const duplicateClaims = await Promise.all(
      turnIds.map((turnId) => t.mutation(internal.askAI.claimQueuedTurn, { turnId })),
    )
    expect(duplicateClaims.every((claim) => claim === null)).toBe(true)
    expect(durationMs).toBeLessThan(30_000)
  }, 60_000)
})
