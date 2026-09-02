// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"
import { ASK_AI_CONFIG } from "../app/lib/ask-ai/config"

const modules = import.meta.glob("./**/*.*s")

function askAITest() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  registerRateLimiter(t)
  return t
}

describe("Ask AI atomic cost gate", () => {
  test("rejected turn creates no prompt message or turn row", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:reject-persist" })
    const thread = await owner.mutation(api.askAI.create, {})
    await t.run(async (ctx) => {
      await ctx.db.insert("askAIUsage", {
        ownerSubject: "ask-guest:reject-persist",
        threadId: thread.threadId,
        messageId: "seed",
        model: "gpt-5.6-luna",
        provider: "openai",
        inputTokens: ASK_AI_CONFIG.limits.dailyTokenBudget,
        outputTokens: 0,
        totalTokens: ASK_AI_CONFIG.limits.dailyTokenBudget,
        createdAt: Date.now(),
      })
    })

    await expect(
      owner.mutation(api.askAI.enqueueTurn, {
        threadId: thread.threadId,
        prompt: "Should not persist",
        clientRequestId: "reject-persist",
      }),
    ).rejects.toMatchObject({ data: { code: "ASK_AI_RATE_LIMITED" } })

    const turns = await t.run(async (ctx) =>
      ctx.db
        .query("askAITurns")
        .withIndex("by_owner_request", (q) =>
          q.eq("ownerSubject", "ask-guest:reject-persist").eq("clientRequestId", "reject-persist"),
        )
        .collect(),
    )
    expect(turns).toHaveLength(0)
  })

  test("duplicate clientRequestId generates once", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:idempotent-gate" })
    const thread = await owner.mutation(api.askAI.create, {})
    const args = {
      threadId: thread.threadId,
      prompt: "Same question",
      clientRequestId: "idempotent-once",
    }
    const first = await owner.mutation(api.askAI.enqueueTurn, args)
    const second = await owner.mutation(api.askAI.enqueueTurn, args)
    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(second.turnId).toBe(first.turnId)

    const turns = await t.run(async (ctx) =>
      ctx.db
        .query("askAITurns")
        .withIndex("by_owner_request", (q) =>
          q.eq("ownerSubject", "ask-guest:idempotent-gate").eq("clientRequestId", "idempotent-once"),
        )
        .collect(),
    )
    expect(turns).toHaveLength(1)
  })

  test("cancelled queued turn cannot be claimed for generation", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:cancel-gate" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.enqueueTurn, {
      threadId: thread.threadId,
      prompt: "Cancel me",
      clientRequestId: "cancel-before-claim",
    })
    await owner.mutation(api.askAI.cancelQueuedTurn, { turnId: turn.turnId })
    const claimed = await t.mutation(internal.askAI.claimQueuedTurn, { turnId: turn.turnId })
    expect(claimed).toBeNull()
    const row = await t.run(async (ctx) => ctx.db.get(turn.turnId))
    expect(row?.status).toBe("cancelled")
  })

  test("enqueueTurn and beginTurn share daily subject + global caps", async () => {
    const t = askAITest()
    const owner = t.withIdentity({ subject: "ask-guest:shared-gate" })
    const thread = await owner.mutation(api.askAI.create, {})
    for (let index = 0; index < ASK_AI_CONFIG.limits.messagesPerDay; index += 1) {
      const turn = await owner.mutation(api.askAI.enqueueTurn, {
        threadId: thread.threadId,
        prompt: `Question ${index}`,
        clientRequestId: `shared-gate-${index}`,
      })
      // Drain queue capacity so daily quota can be exhausted without hitting the
      // per-thread queue depth of 10.
      await t.mutation(internal.askAI.claimQueuedTurn, { turnId: turn.turnId })
      await t.run(async (ctx) => {
        await ctx.db.patch(turn.turnId, { status: "complete", updatedAt: Date.now() })
      })
    }
    await expect(
      owner.mutation(api.askAI.beginTurn, {
        threadId: thread.threadId,
        prompt: "One more should fail",
      }),
    ).rejects.toMatchObject({ data: { code: "ASK_AI_RATE_LIMITED" } })
  })
})
